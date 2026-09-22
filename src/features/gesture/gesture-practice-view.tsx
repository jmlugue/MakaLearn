"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Category as MediaPipeCategory, DrawingUtils, HandLandmarker } from "@mediapipe/tasks-vision";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  Focus,
  Hand,
  ListChecks,
  MousePointerClick,
  PlayCircle,
  RotateCw,
  RotateCcw,
  ScanLine,
  SkipForward,
  Smile,
  Sparkles,
  Square,
  ThumbsUp,
  Trophy,
  TriangleAlert,
  UserRound,
  Volume2,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldHint, Label, Select } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { GuideBanner } from "@/features/guide/guide-banner";
import { GuideTip } from "@/features/guide/guide-tip";
import { useStudentMode } from "@/features/student-mode/student-mode-context";
import { fetchMakaLearnData } from "@/lib/supabase/app-data";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/dialog";
import { createGestureDrawingUtils, loadGestureHandTracker } from "@/utils/gesture-hand-tracker";
import {
  buildGestureFeedbackRequest,
  createTemplateGestureFeedback,
  type GestureFeedbackIssueCategory,
  type GestureFeedbackResponse,
  type GestureFeedbackTrackingState
} from "@/utils/gesture-feedback";
import {
  completeGestureCapture,
  createGestureCaptureState,
  getGestureCandidateCheckStep,
  observeGestureCandidate,
  shouldUseReservedGesture,
  takeRecentGestureWindow,
  type GestureCaptureState
} from "@/utils/gesture-capture-state";
import {
  getExpectedGestureHandCount,
  type DemoGesturePrediction,
  type HandLandmarkPoint
} from "@/utils/gesture-prediction";
import {
  copyHands,
  getHandPoseDistance,
  PREDICTED_POSE_REARM_DISTANCE,
  STABLE_POSE_MOVEMENT_TOLERANCE
} from "@/utils/gesture-stability";
import {
  applyBasicGesturePredictionGuards,
  applyEatToiletFingerSafety,
  applyGestureCandidateGuards,
  type CapturedGestureFrame
} from "@/utils/gesture-shape-safety";
import {
  appendLiveGestureFrame,
  MIN_LIVE_GESTURE_FRAMES,
  predictMakaLearnGesture,
  resetLiveGestureBuffer,
  type GestureModelStatus
} from "@/utils/gesture-model";
import {
  isThumbsUpPose,
  labelsMatch,
  shuffleGuidedGestures,
  summarizeGuidedResults,
  type GesturePracticeMode,
  type GuidedAttempt,
  type GuidedGestureResult,
  type GuidedSessionPhase
} from "@/utils/guided-gesture-session";
import type { Category, LearningItem } from "@/types";

type TrackingState = "idle" | "hands-visible" | "no-hands" | "too-many-hands" | "multiple-people";
type HandConnection = { start: number; end: number };
type GestureCaptureSnapshot = {
  frames: Float32Array[];
  handFrames: CapturedGestureFrame[];
  prediction: DemoGesturePrediction;
};
type PendingGestureCompletion = {
  trigger: "stable-pose" | "hands-removed";
  frames: Float32Array[];
  handFrames: CapturedGestureFrame[];
  heldHands: HandLandmarkPoint[][] | null;
};

const NO_HANDS_AUTO_PREDICT_DELAY_MS = 1000;
const STABLE_POSE_AUTO_PREDICT_DELAY_MS = 2000;
const MIN_CONFIDENT_PREDICTION_PERCENT = 70;
const READY_GESTURE_HOLD_MS = 600;
const GUIDED_SUCCESS_DELAY_MS = 2200;

const fixedGestureLabels = new Set([
  "I want to go to toilet",
  "I want to eat food",
  "I want to drink",
  "Help",
  "Yes",
  "No",
  "Sit down"
]);

const trackingMeta: Record<
  TrackingState,
  { label: string; detail: string; handCount: number; peopleCount: number; tone: "ready" | "warning" | "idle" }
> = {
  idle: {
    label: "Camera idle",
    detail: "Start the camera to begin the presentation hand detector.",
    handCount: 0,
    peopleCount: 0,
    tone: "idle"
  },
  "hands-visible": {
    label: "Hands ready",
    detail: "Perform the gesture, then hold it still for 2 seconds to predict.",
    handCount: 1,
    peopleCount: 1,
    tone: "ready"
  },
  "no-hands": {
    label: "No hand detected",
    detail: "Ask the learner to raise their hands inside the camera frame.",
    handCount: 0,
    peopleCount: 1,
    tone: "warning"
  },
  "too-many-hands": {
    label: "Too many hands",
    detail: "The live model reads a maximum of two hands at a time.",
    handCount: 2,
    peopleCount: 1,
    tone: "warning"
  },
  "multiple-people": {
    label: "Multiple people visible",
    detail: "Validation allows one person in frame at a time.",
    handCount: 2,
    peopleCount: 2,
    tone: "warning"
  }
};

export function GesturePracticeView() {
  const { notify } = useToast();
  const { isStudentMode } = useStudentMode();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const handConnectionsRef = useRef<HandConnection[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastHandCountRef = useRef(-1);
  const predictionCandidateRef = useRef<{ label: string | null; frames: number }>({ label: null, frames: 0 });
  const currentPredictionLabelRef = useRef<string | null>(null);
  const liveGestureFramesRef = useRef<Float32Array[]>([]);
  const liveGestureHandFramesRef = useRef<CapturedGestureFrame[]>([]);
  const captureStateRef = useRef<GestureCaptureState<GestureCaptureSnapshot>>(
    createGestureCaptureState()
  );
  const candidateCheckPendingRef = useRef(false);
  const candidateCheckGenerationRef = useRef(0);
  const lastCandidateCheckFrameCountRef = useRef(0);
  const pendingGestureCompletionRef = useRef<PendingGestureCompletion | null>(null);
  const consecutiveGestureLockRef = useRef(false);
  const pendingModelPredictionRef = useRef(false);
  const gestureCaptureActiveRef = useRef(false);
  const lastHandsSeenAtRef = useRef(0);
  const stablePoseStartedAtRef = useRef(0);
  const stablePoseAnchorRef = useRef<HandLandmarkPoint[][] | null>(null);
  const predictedPoseAnchorRef = useRef<HandLandmarkPoint[][] | null>(null);
  const waitingForPoseChangeRef = useRef(false);
  const stableStatusStepRef = useRef(-1);
  const modelFailureNotifiedRef = useRef(false);
  const feedbackRequestIdRef = useRef(0);
  const lastAutoAudioKeyRef = useRef<string | null>(null);
  const noHandsFrameCountRef = useRef(0);
  const showHandLandmarksRef = useRef(true);
  const practiceModeRef = useRef<GesturePracticeMode>("free");
  const guidedPhaseRef = useRef<GuidedSessionPhase>("ready");
  const guidedQueueRef = useRef<LearningItem[]>([]);
  const guidedIndexRef = useRef(0);
  const guidedResultsRef = useRef<GuidedGestureResult[]>([]);
  const readyGestureStartedAtRef = useRef(0);
  const guidedTimeoutsRef = useRef<number[]>([]);
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [detectedHandCount, setDetectedHandCount] = useState(0);
  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [modelStatus, setModelStatus] = useState<GestureModelStatus>("idle");
  const [prediction, setPrediction] = useState<DemoGesturePrediction | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [correctiveFeedback, setCorrectiveFeedback] = useState<GestureFeedbackResponse | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [selectedGestureId, setSelectedGestureId] = useState("");
  const [referenceFlipped, setReferenceFlipped] = useState(false);
  const [carouselDirection, setCarouselDirection] = useState(1);
  const [cameraFocusMode, setCameraFocusMode] = useState(false);
  const [showHandLandmarks, setShowHandLandmarks] = useState(true);
  const [practiceMode, setPracticeMode] = useState<GesturePracticeMode>("free");
  const [guidedPhase, setGuidedPhase] = useState<GuidedSessionPhase>("ready");
  const [guidedQueue, setGuidedQueue] = useState<LearningItem[]>([]);
  const [guidedIndex, setGuidedIndex] = useState(0);
  const [guidedResults, setGuidedResults] = useState<GuidedGestureResult[]>([]);
  const [countdownValue, setCountdownValue] = useState(3);
  const [guidedFeedbackTitle, setGuidedFeedbackTitle] = useState("");
  const [guidedFeedbackDetail, setGuidedFeedbackDetail] = useState("");
  const [endSessionDialogOpen, setEndSessionDialogOpen] = useState(false);
  const selectedGesture = learningItems.find((item) => item.id === selectedGestureId) ?? learningItems[0];
  const selectedGestureIndex = Math.max(
    0,
    learningItems.findIndex((item) => item.id === selectedGesture?.id)
  );
  const selectedCategory = categories.find((category) => category.id === selectedGesture?.categoryId);
  const detectedGesture = prediction
    ? learningItems.find((item) => item.label === prediction.label)
    : undefined;
  const referenceInstruction = getGesturePerformanceInstruction(selectedGesture);
  const meta = trackingMeta[trackingState];
  const hasValidHands = trackingState === "hands-visible";
  const recognizedGesture = Boolean(prediction);
  const guidedTarget = guidedQueue[guidedIndex];
  const guidedSummary = summarizeGuidedResults(guidedResults);
  const guidedFeedbackCorrect = Boolean(
    guidedPhase === "feedback" && prediction && guidedTarget && labelsMatch(prediction.label, guidedTarget.label)
  );

  useEffect(() => {
    showHandLandmarksRef.current = showHandLandmarks;
  }, [showHandLandmarks]);

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active) return;
        const gestureItems = ensureFixedGestureItems(data.learningItems);
        setLearningItems(gestureItems);
        setCategories(data.categories);
      } catch (error) {
        notify({
          title: "Gesture data unavailable",
          description: "Supabase gesture references could not be loaded.",
          tone: "error"
        });
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      guidedTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      guidedTimeoutsRef.current = [];
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [notify]);

  useEffect(() => {
    if (!learningItems.length) return;
    setSelectedGestureId((current) =>
      learningItems.some((item) => item.id === current) ? current : learningItems[0].id
    );
  }, [learningItems]);

  useEffect(() => {
    if (!prediction) return;
    if (practiceMode === "guided" && (!guidedTarget || !labelsMatch(prediction.label, guidedTarget.label))) return;
    const audioKey = detectedGesture?.id ?? prediction.label;
    if (lastAutoAudioKeyRef.current === audioKey) return;
    lastAutoAudioKeyRef.current = audioKey;

    if (detectedGesture?.audioUrl) {
      playAudioSource(detectedGesture.audioUrl, detectedGesture.label, () => {
        notify({
          title: "Audio unavailable",
          description: "Use the reference panel audio control or check the uploaded audio file."
        });
      });
      return;
    }

    speakAudioCuePlaceholder(prediction.label, () => {
      notify({
        title: "Audio unavailable",
        description: "Use the reference panel audio control or check the uploaded audio file."
      });
    });
  }, [detectedGesture?.audioUrl, detectedGesture?.id, detectedGesture?.label, guidedTarget, notify, practiceMode, prediction]);

  function setGuidedPhaseValue(phase: GuidedSessionPhase) {
    guidedPhaseRef.current = phase;
    setGuidedPhase(phase);
  }

  function clearGuidedTimeouts() {
    guidedTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    guidedTimeoutsRef.current = [];
  }

  function scheduleGuidedAction(action: () => void, delay: number) {
    const timeoutId = window.setTimeout(() => {
      guidedTimeoutsRef.current = guidedTimeoutsRef.current.filter((current) => current !== timeoutId);
      action();
    }, delay);
    guidedTimeoutsRef.current.push(timeoutId);
  }

  function resetConsecutiveGestureCapture({ clearLock = false }: { clearLock?: boolean } = {}) {
    candidateCheckGenerationRef.current += 1;
    candidateCheckPendingRef.current = false;
    lastCandidateCheckFrameCountRef.current = 0;
    pendingGestureCompletionRef.current = null;
    captureStateRef.current = createGestureCaptureState();
    if (clearLock) consecutiveGestureLockRef.current = false;
  }

  function resetGuidedCapture({ keepPoseGate = false }: { keepPoseGate?: boolean } = {}) {
    pendingModelPredictionRef.current = false;
    gestureCaptureActiveRef.current = false;
    resetConsecutiveGestureCapture({ clearLock: true });
    resetStablePoseTracking();
    resetLiveGestureBuffer(liveGestureFramesRef.current);
    liveGestureHandFramesRef.current = [];
    if (!keepPoseGate) {
      predictedPoseAnchorRef.current = null;
      waitingForPoseChangeRef.current = false;
    }
  }

  function startGuidedRun() {
    if (!learningItems.length) {
      notify({
        title: "Gestures are still loading",
        description: "Wait a moment, then start guided practice again."
      });
      return;
    }

    clearGuidedTimeouts();
    const nextQueue = shuffleGuidedGestures(learningItems);
    const nextResults = nextQueue.map<GuidedGestureResult>((item) => ({
      gestureId: item.id,
      gestureLabel: item.label,
      status: "not-attempted",
      attempts: []
    }));

    practiceModeRef.current = "guided";
    setPracticeMode("guided");
    guidedQueueRef.current = nextQueue;
    setGuidedQueue(nextQueue);
    guidedResultsRef.current = nextResults;
    setGuidedResults(nextResults);
    guidedIndexRef.current = 0;
    setGuidedIndex(0);
    setSelectedGestureId(nextQueue[0].id);
    setReferenceFlipped(false);
    setCountdownValue(3);
    setGuidedFeedbackTitle("");
    setGuidedFeedbackDetail("");
    readyGestureStartedAtRef.current = 0;
    resetGuidedCapture();
    clearPrediction();
    setStatusMessage("");
    setGuidedPhaseValue("ready");

    if (!cameraStarted) void startCamera();
  }

  function switchToFreePractice() {
    clearGuidedTimeouts();
    practiceModeRef.current = "free";
    setPracticeMode("free");
    guidedQueueRef.current = [];
    setGuidedQueue([]);
    guidedResultsRef.current = [];
    setGuidedResults([]);
    guidedIndexRef.current = 0;
    setGuidedIndex(0);
    readyGestureStartedAtRef.current = 0;
    setGuidedPhaseValue("ready");
    resetGuidedCapture();
    clearPrediction();
    setStatusMessage(cameraStarted ? "Hold a supported gesture in frame when ready." : "");
  }

  function beginGuidedCountdown() {
    if (practiceModeRef.current !== "guided" || guidedPhaseRef.current === "complete") return;
    clearGuidedTimeouts();
    resetGuidedCapture();
    clearPrediction();
    readyGestureStartedAtRef.current = 0;
    setCountdownValue(3);
    setGuidedPhaseValue("countdown");
    scheduleGuidedAction(() => setCountdownValue(2), 1000);
    scheduleGuidedAction(() => setCountdownValue(1), 2000);
    scheduleGuidedAction(() => openGuidedCapture(false), 3000);
  }

  function openGuidedCapture(isRetry: boolean) {
    if (practiceModeRef.current !== "guided") return;
    clearGuidedTimeouts();
    resetGuidedCapture({ keepPoseGate: isRetry });
    clearPrediction();
    setModelStatus("idle");
    setStatusMessage(isRetry ? "Try the same gesture again." : "Make the gesture, then hold it still for 2 seconds.");
    setGuidedPhaseValue("capturing");
  }

  function handleGuidedReadyPose(hands: HandLandmarkPoint[][]) {
    if (practiceModeRef.current !== "guided" || guidedPhaseRef.current !== "ready") {
      readyGestureStartedAtRef.current = 0;
      return;
    }

    if (!isThumbsUpPose(hands)) {
      readyGestureStartedAtRef.current = 0;
      return;
    }

    const now = performance.now();
    if (!readyGestureStartedAtRef.current) {
      readyGestureStartedAtRef.current = now;
      return;
    }
    if (now - readyGestureStartedAtRef.current >= READY_GESTURE_HOLD_MS) beginGuidedCountdown();
  }

  function updateGuidedResults(nextResults: GuidedGestureResult[]) {
    guidedResultsRef.current = nextResults;
    setGuidedResults(nextResults);
  }

  function completeGuidedSession() {
    clearGuidedTimeouts();
    resetGuidedCapture();
    clearPrediction();
    setStatusMessage("");
    setGuidedPhaseValue("complete");
  }

  function advanceGuidedSession() {
    if (practiceModeRef.current !== "guided") return;
    const nextIndex = guidedIndexRef.current + 1;
    if (nextIndex >= guidedQueueRef.current.length) {
      completeGuidedSession();
      return;
    }

    guidedIndexRef.current = nextIndex;
    setGuidedIndex(nextIndex);
    setSelectedGestureId(guidedQueueRef.current[nextIndex].id);
    setReferenceFlipped(false);
    beginGuidedCountdown();
  }

  function skipGuidedGesture() {
    const target = guidedQueueRef.current[guidedIndexRef.current];
    if (!target) return;
    clearGuidedTimeouts();
    const nextResults = guidedResultsRef.current.map((result) =>
      result.gestureId === target.id ? { ...result, status: "skipped" as const } : result
    );
    updateGuidedResults(nextResults);
    advanceGuidedSession();
  }

  function handleGuidedPrediction(
    nextPrediction: DemoGesturePrediction | null,
    feedbackPrediction: DemoGesturePrediction | null,
    capturedHandCount: number,
    feedbackOverride?: string,
    feedbackIssueCategory?: GestureFeedbackIssueCategory
  ) {
    const target = guidedQueueRef.current[guidedIndexRef.current];
    if (!target || guidedPhaseRef.current !== "capturing") return;

    const correct = Boolean(nextPrediction && labelsMatch(nextPrediction.label, target.label));
    const previousResult = guidedResultsRef.current.find((result) => result.gestureId === target.id);
    const attempt: GuidedAttempt = {
      targetId: target.id,
      targetLabel: target.label,
      predictedLabel: feedbackPrediction?.label ?? nextPrediction?.label ?? null,
      confidence: feedbackPrediction?.matchPercent ?? nextPrediction?.matchPercent ?? null,
      outcome: correct ? "correct" : feedbackPrediction ? "incorrect" : "unclear",
      attemptNumber: (previousResult?.attempts.length ?? 0) + 1
    };
    const nextResults = guidedResultsRef.current.map((result) =>
      result.gestureId === target.id
        ? {
            ...result,
            status: correct ? ("correct" as const) : result.status,
            attempts: [...result.attempts, attempt]
          }
        : result
    );
    updateGuidedResults(nextResults);
    setPrediction(nextPrediction);
    setStatusMessage("");
    setGuidedPhaseValue("feedback");

    if (correct) {
      clearCorrectiveFeedback();
      setGuidedFeedbackTitle("Great job!");
      setGuidedFeedbackDetail("You did it.");
      scheduleGuidedAction(advanceGuidedSession, GUIDED_SUCCESS_DELAY_MS);
      return;
    }

    void requestCorrectiveFeedback(
      feedbackPrediction ?? nextPrediction,
      capturedHandCount,
      "hands-visible",
      feedbackOverride,
      feedbackIssueCategory,
      target.label
    );
    setGuidedFeedbackTitle("Try again");
    setGuidedFeedbackDetail("");
  }

  async function prepareHandTracker() {
    if (handLandmarkerRef.current && drawingUtilsRef.current) return handLandmarkerRef.current;

    setTrackerStatus("loading");
    const { vision, handLandmarker, handConnections } = await loadGestureHandTracker();
    handLandmarkerRef.current = handLandmarker;
    handConnectionsRef.current = handConnections;

    const canvas = canvasRef.current;
    if (!canvas?.getContext("2d")) throw new Error("The tracking canvas is unavailable.");
    drawingUtilsRef.current = createGestureDrawingUtils(vision, canvas);
    setTrackerStatus("ready");
    return handLandmarker;
  }

  function runHandTracking() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = handLandmarkerRef.current;
    const drawingUtils = drawingUtilsRef.current;
    const context = canvas?.getContext("2d");
    if (!video || !canvas || !context || !handLandmarker || !drawingUtils) return;

    if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const result = handLandmarker.detectForVideo(video, performance.now());
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (showHandLandmarksRef.current) {
        result.landmarks.forEach((landmarks) => {
          drawingUtils.drawConnectors(landmarks, handConnectionsRef.current, {
            color: "#2dd4bf",
            lineWidth: 5
          });
          drawingUtils.drawLandmarks(landmarks, {
            color: "#ffffff",
            fillColor: "#2563eb",
            lineWidth: 2,
            radius: 4
          });
        });
      }

      const handCount = result.landmarks.length;
      if (handCount === 0) {
        noHandsFrameCountRef.current += 1;
        // Re-arm success audio only after hands are fully out of frame for several frames.
        if (noHandsFrameCountRef.current >= 6) {
          lastAutoAudioKeyRef.current = null;
          if (consecutiveGestureLockRef.current) {
            resetConsecutiveGestureCapture({ clearLock: true });
            setStatusMessage("Hands are clear. Hold a supported gesture in frame when ready.");
          }
        }
      } else {
        noHandsFrameCountRef.current = 0;
      }

      if (handCount !== lastHandCountRef.current) {
        lastHandCountRef.current = handCount;
        setDetectedHandCount(handCount);
        setTrackingState(handCount === 0 ? "no-hands" : handCount <= 2 ? "hands-visible" : "too-many-hands");
      }

      handleGuidedReadyPose(result.landmarks);
      const guidedCaptureOpen =
        practiceModeRef.current === "guided" && guidedPhaseRef.current === "capturing";
      if (practiceModeRef.current === "free" || guidedCaptureOpen) {
        updateLiveModelCapture(result.landmarks, result.handedness);
      }
    }

    animationFrameRef.current = window.requestAnimationFrame(runHandTracking);
  }

  async function startCamera() {
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setCameraStarted(true);
    setTrackingState("no-hands");
    setDetectedHandCount(0);
    noHandsFrameCountRef.current = 0;
    lastAutoAudioKeyRef.current = null;
    pendingModelPredictionRef.current = false;
    gestureCaptureActiveRef.current = false;
    resetConsecutiveGestureCapture({ clearLock: true });
    lastHandsSeenAtRef.current = 0;
    resetStablePoseTracking();
    predictedPoseAnchorRef.current = null;
    waitingForPoseChangeRef.current = false;
    modelFailureNotifiedRef.current = false;
    clearPrediction();
    resetLiveGestureBuffer(liveGestureFramesRef.current);
    liveGestureHandFramesRef.current = [];
    setModelStatus("idle");
    setStatusMessage("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await prepareHandTracker();
      lastVideoTimeRef.current = -1;
      lastHandCountRef.current = -1;
      runHandTracking();
    } catch {
      setTrackerStatus("error");
      setCameraStarted(false);
      setTrackingState("idle");
      notify({
        title: "Camera unavailable",
        description: "Allow camera access and restart the camera to use the live hand outline."
      });
    }
  }

  function stopCamera() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    drawingUtilsRef.current = null;
    setCameraStarted(false);
    setTrackingState("idle");
    setDetectedHandCount(0);
    lastHandCountRef.current = -1;
    lastVideoTimeRef.current = -1;
    noHandsFrameCountRef.current = 0;
    lastAutoAudioKeyRef.current = null;
    pendingModelPredictionRef.current = false;
    gestureCaptureActiveRef.current = false;
    resetConsecutiveGestureCapture({ clearLock: true });
    lastHandsSeenAtRef.current = 0;
    resetStablePoseTracking();
    predictedPoseAnchorRef.current = null;
    waitingForPoseChangeRef.current = false;
    modelFailureNotifiedRef.current = false;
    clearPrediction();
    resetLiveGestureBuffer(liveGestureFramesRef.current);
    liveGestureHandFramesRef.current = [];
    setModelStatus("idle");
    setStatusMessage("");
    if (practiceModeRef.current === "guided" && guidedPhaseRef.current !== "complete") {
      clearGuidedTimeouts();
      readyGestureStartedAtRef.current = 0;
      setGuidedPhaseValue("ready");
    }
  }

  function clearPrediction() {
    predictionCandidateRef.current = { label: null, frames: 0 };
    currentPredictionLabelRef.current = null;
    setPrediction(null);
    clearCorrectiveFeedback();
  }

  function clearCorrectiveFeedback() {
    feedbackRequestIdRef.current += 1;
    setCorrectiveFeedback(null);
    setFeedbackLoading(false);
  }

  function updateLiveModelCapture(
    hands: Parameters<typeof appendLiveGestureFrame>[1],
    handedness: MediaPipeCategory[][]
  ) {
    const now = performance.now();

    if (hands.length) {
      const currentHands = copyHands(hands);
      lastHandsSeenAtRef.current = now;

      if (consecutiveGestureLockRef.current) {
        setStatusMessage("Move your hands out of view to start again.");
        return;
      }

      if (pendingModelPredictionRef.current) return;

      // Keep the completed result visible while the learner holds the same pose.
      // A meaningful pose change starts a new capture without requiring hands to leave the frame.
      if (waitingForPoseChangeRef.current) {
        const distanceFromPredictedPose = getHandPoseDistance(predictedPoseAnchorRef.current, currentHands);
        if (distanceFromPredictedPose < PREDICTED_POSE_REARM_DISTANCE) return;

        waitingForPoseChangeRef.current = false;
        predictedPoseAnchorRef.current = null;
      }

      if (!gestureCaptureActiveRef.current) {
        clearPrediction();
        resetConsecutiveGestureCapture();
        resetLiveGestureBuffer(liveGestureFramesRef.current);
        liveGestureHandFramesRef.current = [];
        gestureCaptureActiveRef.current = true;
        stablePoseStartedAtRef.current = now;
        stablePoseAnchorRef.current = currentHands;
        stableStatusStepRef.current = 0;
        setStatusMessage("Hold still — 2.0 seconds to prediction.");
      }

      appendLiveGestureFrame(liveGestureFramesRef.current, hands);
      liveGestureHandFramesRef.current.push(copyGestureFrame(hands, handedness));
      if (liveGestureHandFramesRef.current.length > 192) {
        liveGestureHandFramesRef.current.splice(0, liveGestureHandFramesRef.current.length - 192);
      }
      checkLiveGestureCandidate();
      setModelStatus((current) => (current === "ready" ? current : "idle"));

      const movementFromStableAnchor = getHandPoseDistance(stablePoseAnchorRef.current, currentHands);
      if (movementFromStableAnchor > STABLE_POSE_MOVEMENT_TOLERANCE) {
        stablePoseStartedAtRef.current = now;
        stablePoseAnchorRef.current = currentHands;
        stableStatusStepRef.current = 0;
        setStatusMessage("Hold still — 2.0 seconds to prediction.");
        return;
      }

      const stableDuration = now - stablePoseStartedAtRef.current;
      const statusStep = Math.min(4, Math.floor(stableDuration / 500));
      if (statusStep !== stableStatusStepRef.current && statusStep < 4) {
        stableStatusStepRef.current = statusStep;
        const secondsRemaining = (STABLE_POSE_AUTO_PREDICT_DELAY_MS - statusStep * 500) / 1000;
        setStatusMessage(`Hold still — ${secondsRemaining.toFixed(1)} seconds to prediction.`);
      }

      if (stableDuration >= STABLE_POSE_AUTO_PREDICT_DELAY_MS) {
        completeLiveGestureCapture("stable-pose", currentHands);
      }
      return;
    }

    resetStablePoseTracking();
    predictedPoseAnchorRef.current = null;
    waitingForPoseChangeRef.current = false;
    if (!gestureCaptureActiveRef.current || pendingModelPredictionRef.current) return;

    const noHandsDuration = now - lastHandsSeenAtRef.current;
    if (noHandsDuration < NO_HANDS_AUTO_PREDICT_DELAY_MS) return;

    completeLiveGestureCapture("hands-removed");
  }

  function checkLiveGestureCandidate() {
    const frameCount = liveGestureFramesRef.current.length;
    if (
      frameCount < MIN_LIVE_GESTURE_FRAMES ||
      frameCount - lastCandidateCheckFrameCountRef.current <
        getGestureCandidateCheckStep(MIN_LIVE_GESTURE_FRAMES) ||
      candidateCheckPendingRef.current ||
      captureStateRef.current.phase === "ignoring-b"
    ) {
      return;
    }

    const generation = candidateCheckGenerationRef.current;
    const candidateFrames = takeRecentGestureWindow(
      liveGestureFramesRef.current,
      MIN_LIVE_GESTURE_FRAMES
    );
    const candidateHandFrames = takeRecentGestureWindow(
      liveGestureHandFramesRef.current,
      MIN_LIVE_GESTURE_FRAMES
    );
    lastCandidateCheckFrameCountRef.current = frameCount;
    candidateCheckPendingRef.current = true;

    // Candidate checks look only at the newest minimum-sized window so a
    // following gesture can be distinguished without changing the full buffer
    // used by ordinary single-gesture completion.
    void predictMakaLearnGesture(candidateFrames)
      .then((nextPrediction) => {
        if (
          generation !== candidateCheckGenerationRef.current ||
          (!gestureCaptureActiveRef.current && !pendingGestureCompletionRef.current)
        ) {
          return;
        }

        const guardResult = applyGestureCandidateGuards(
          nextPrediction,
          candidateHandFrames
        );
        const safetyResult = guardResult.prediction
          ? applyEatToiletFingerSafety(
              guardResult.prediction,
              candidateHandFrames
            )
          : guardResult;
        const candidatePrediction = safetyResult.prediction;
        captureStateRef.current = observeGestureCandidate(
          captureStateRef.current,
          candidatePrediction
            ? {
                label: candidatePrediction.label,
                confidence: candidatePrediction.matchPercent,
                payload: {
                  frames: candidateFrames,
                  handFrames: candidateHandFrames,
                  prediction: candidatePrediction
                }
              }
            : null
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (generation !== candidateCheckGenerationRef.current) return;
        candidateCheckPendingRef.current = false;
        const pendingCompletion = pendingGestureCompletionRef.current;
        if (!pendingCompletion) return;
        pendingGestureCompletionRef.current = null;
        processCompletedGestureCapture(pendingCompletion);
      });
  }

  function completeLiveGestureCapture(
    trigger: "stable-pose" | "hands-removed",
    heldHands: HandLandmarkPoint[][] | null = null
  ) {
    if (!gestureCaptureActiveRef.current || pendingModelPredictionRef.current) return;

    const completion: PendingGestureCompletion = {
      trigger,
      frames: liveGestureFramesRef.current.slice(),
      handFrames: liveGestureHandFramesRef.current.slice(),
      heldHands
    };
    gestureCaptureActiveRef.current = false;
    resetStablePoseTracking();
    waitingForPoseChangeRef.current = trigger === "stable-pose";
    predictedPoseAnchorRef.current = trigger === "stable-pose" ? heldHands : null;
    resetLiveGestureBuffer(liveGestureFramesRef.current);
    liveGestureHandFramesRef.current = [];

    if (candidateCheckPendingRef.current) {
      pendingGestureCompletionRef.current = completion;
      setModelStatus("loading");
      setStatusMessage(
        trigger === "stable-pose"
          ? "Gesture held still. Checking prediction..."
          : "Checking gesture..."
      );
      return;
    }

    processCompletedGestureCapture(completion);
  }

  function processCompletedGestureCapture(completion: PendingGestureCompletion) {
    captureStateRef.current = completeGestureCapture(captureStateRef.current);
    const reservedGesture = shouldUseReservedGesture(captureStateRef.current)
      ? captureStateRef.current.reservedA
      : null;
    const capturedFrames = reservedGesture?.payload.frames ?? completion.frames;
    const capturedHandFrames =
      reservedGesture?.payload.handFrames ?? completion.handFrames;
    const trigger = completion.trigger;

    if (capturedFrames.length < MIN_LIVE_GESTURE_FRAMES) {
      updateCompletedGesturePrediction(
        null,
        "Try the gesture again with your hands visible for a little longer.",
        null,
        summarizeCapturedHandCount(capturedHandFrames)
      );
      setModelStatus("idle");
      return;
    }

    pendingModelPredictionRef.current = true;
    setModelStatus("loading");
    setStatusMessage(trigger === "stable-pose" ? "Gesture held still. Checking prediction..." : "Checking gesture...");

    const predictionPromise = reservedGesture
      ? Promise.resolve(reservedGesture.payload.prediction)
      : predictMakaLearnGesture(capturedFrames);

    void predictionPromise
      .then((nextPrediction) => {
        setModelStatus("ready");
        const guardResult = applyBasicGesturePredictionGuards(nextPrediction, capturedHandFrames);
        const safetyResult = guardResult.prediction
          ? applyEatToiletFingerSafety(guardResult.prediction, capturedHandFrames)
          : guardResult;
        const confidenceResult = applyConfidenceThreshold(safetyResult.prediction);
        const feedbackResult = confidenceResult.feedback
          ? confidenceResult
          : safetyResult.feedback
            ? safetyResult
            : guardResult;
        updateCompletedGesturePrediction(
          confidenceResult.prediction,
          feedbackResult.feedback,
          feedbackResult.feedbackPrediction ?? safetyResult.prediction ?? guardResult.prediction ?? nextPrediction,
          summarizeCapturedHandCount(capturedHandFrames),
          feedbackResult.issueCategory
        );
        if (
          reservedGesture &&
          trigger === "stable-pose" &&
          confidenceResult.prediction
        ) {
          consecutiveGestureLockRef.current = true;
          waitingForPoseChangeRef.current = false;
          predictedPoseAnchorRef.current = null;
          setStatusMessage("Move your hands out of view to start again.");
        }
      })
      .catch(() => {
        setModelStatus("error");
        clearPrediction();
        setStatusMessage("Recognition is unavailable right now. Check the model file, then try again.");
        if (!modelFailureNotifiedRef.current) {
          modelFailureNotifiedRef.current = true;
          notify({
            title: "Live recognition unavailable",
            description: "The camera still works, but the trained gesture model could not be loaded.",
            tone: "error"
          });
        }
      })
      .finally(() => {
        pendingModelPredictionRef.current = false;
      });
  }

  function resetStablePoseTracking() {
    stablePoseStartedAtRef.current = 0;
    stablePoseAnchorRef.current = null;
    stableStatusStepRef.current = -1;
  }

  function updateCompletedGesturePrediction(
    nextPrediction: DemoGesturePrediction | null,
    feedbackOverride?: string,
    feedbackPrediction: DemoGesturePrediction | null = nextPrediction,
    capturedHandCount = detectedHandCount,
    feedbackIssueCategory?: GestureFeedbackIssueCategory
  ) {
    if (practiceModeRef.current === "guided") {
      handleGuidedPrediction(
        nextPrediction,
        feedbackPrediction,
        capturedHandCount,
        feedbackOverride,
        feedbackIssueCategory
      );
      return;
    }

    const nextLabel = nextPrediction?.label ?? null;
    predictionCandidateRef.current = { label: nextLabel, frames: nextPrediction ? 1 : 0 };
    currentPredictionLabelRef.current = nextLabel;
    setPrediction(nextPrediction);
    setStatusMessage("");
    if (nextPrediction) {
      clearCorrectiveFeedback();
      return;
    }

    void requestCorrectiveFeedback(
      feedbackPrediction,
      capturedHandCount,
      "hands-visible",
      feedbackOverride,
      feedbackIssueCategory
    );
  }

  async function requestCorrectiveFeedback(
    feedbackPrediction: DemoGesturePrediction | null,
    handCount: number,
    feedbackTrackingState: GestureFeedbackTrackingState,
    localFeedbackHint?: string,
    localIssueCategory?: GestureFeedbackIssueCategory,
    selectedTargetLabel?: string,
    forcedIssueCategory?: GestureFeedbackIssueCategory
  ) {
    if (!selectedGesture && !selectedTargetLabel) return;

    const requestId = feedbackRequestIdRef.current + 1;
    feedbackRequestIdRef.current = requestId;
    const selectedLabel = selectedTargetLabel ?? selectedGesture?.label ?? "Gesture";
    const feedbackTargetLabel = selectedTargetLabel ?? feedbackPrediction?.label ?? selectedLabel;
    const derivedFeedbackRequest = buildGestureFeedbackRequest({
      selectedGestureLabel: selectedLabel,
      feedbackTargetLabel,
      prediction: feedbackPrediction,
      detectedHandCount: handCount,
      expectedHandCount: getExpectedGestureHandCount(feedbackTargetLabel),
      trackingState: feedbackTrackingState,
      localFeedbackHint,
      localIssueCategory
    });
    // Guided practice has already made its final outcome decision. Carry that
    // decision into both feedback surfaces so the learner never sees mixed states.
    const feedbackRequest = forcedIssueCategory
      ? { ...derivedFeedbackRequest, issueCategory: forcedIssueCategory }
      : derivedFeedbackRequest;
    const fallbackFeedback = createTemplateGestureFeedback(feedbackRequest);
    setCorrectiveFeedback(null);
    setFeedbackLoading(true);

    try {
      const response = await fetch("/api/gesture-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackRequest)
      });
      if (!response.ok) throw new Error("Feedback request failed");
      const nextFeedback = (await response.json()) as GestureFeedbackResponse;
      if (feedbackRequestIdRef.current !== requestId) return;
      setCorrectiveFeedback(nextFeedback?.learnerMessage && nextFeedback?.teacherNote ? nextFeedback : fallbackFeedback);
    } catch {
      if (feedbackRequestIdRef.current === requestId) {
        setCorrectiveFeedback(fallbackFeedback);
      }
    } finally {
      if (feedbackRequestIdRef.current === requestId) {
        setFeedbackLoading(false);
      }
    }
  }

  function summarizeCapturedHandCount(frames: CapturedGestureFrame[]) {
    if (!frames.length) return 0;
    const counts = new Map<number, number>();
    frames.forEach((frame) => counts.set(frame.hands.length, (counts.get(frame.hands.length) ?? 0) + 1));
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 0;
  }

  function applyConfidenceThreshold(nextPrediction: DemoGesturePrediction | null): {
    prediction: DemoGesturePrediction | null;
    feedbackPrediction?: DemoGesturePrediction;
    feedback?: string;
    issueCategory?: GestureFeedbackIssueCategory;
  } {
    if (!nextPrediction || nextPrediction.matchPercent >= MIN_CONFIDENT_PREDICTION_PERCENT) {
      return { prediction: nextPrediction };
    }

    return {
      prediction: null,
      feedback: "Try again with the gesture a little clearer in the camera view."
    };
  }

  function copyGestureFrame(hands: HandLandmarkPoint[][], handedness: MediaPipeCategory[][]): CapturedGestureFrame {
    return {
      hands: hands.map((hand) => hand.map((point) => ({ x: point.x, y: point.y, z: point.z }))),
      handedness: hands.map((_, index) => toKnownHandedness(handedness[index]?.[0]?.categoryName))
    };
  }

  function toKnownHandedness(value?: string): CapturedGestureFrame["handedness"][number] {
    return value === "Left" || value === "Right" ? value : "Unknown";
  }

  function handleGestureChange(nextGestureId: string) {
    setSelectedGestureId(nextGestureId);
    setReferenceFlipped(false);
    clearPrediction();
    setStatusMessage(cameraStarted ? "Reference changed. Hold a supported gesture in frame when ready." : "");
  }

  function moveGesture(direction: -1 | 1) {
    if (!learningItems.length) return;
    setCarouselDirection(direction);
    const nextIndex = (selectedGestureIndex + direction + learningItems.length) % learningItems.length;
    handleGestureChange(learningItems[nextIndex].id);
  }

  function playSelectedGestureAudio() {
    if (!selectedGesture) return;
    if (selectedGesture.audioUrl) {
      playAudioSource(selectedGesture.audioUrl, selectedGesture.label, () => {
        notify({
          title: "Audio unavailable",
          description: "Try the teacher-uploaded audio again or use the spoken cue."
        });
      });
      return;
    }

    speakAudioCuePlaceholder(selectedGesture.label, () => {
      notify({
        title: "Audio unavailable",
        description: "The browser could not play this audio cue."
      });
    });
  }

  if (isStudentMode) {
    return (
      <>
      <section
        className="absolute inset-2 isolate overflow-hidden rounded-[2rem] border border-white/90 bg-[#f4fbff] p-2 shadow-[0_24px_70px_rgba(37,99,235,0.14)] sm:inset-3 sm:p-3 lg:inset-4 lg:p-4"
      >
        <StudentGestureImageBackground />
        <div
          className={cn(
            "relative z-10 grid h-full min-h-0 gap-2 sm:gap-3 lg:gap-4",
            cameraFocusMode
              ? "grid-rows-[minmax(0,1fr)]"
              : "grid-rows-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[1.13fr_0.87fr] xl:grid-rows-1"
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className={cn("flex shrink-0 flex-wrap items-center justify-center gap-2 sm:gap-3", cameraFocusMode ? "mb-2" : "mb-3")}>
              <div
                className="flex rounded-full border border-white/90 bg-white/80 p-1.5 shadow-[0_10px_22px_rgba(37,99,235,0.12)] backdrop-blur-xl"
                role="group"
                aria-label="Practice mode"
              >
                <button
                  type="button"
                  onClick={switchToFreePractice}
                  aria-pressed={practiceMode === "free"}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-black transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200 sm:px-5",
                    practiceMode === "free" ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-blue-50"
                  )}
                >
                  <Hand className="h-5 w-5" aria-hidden="true" />
                  Free practice
                </button>
                <button
                  type="button"
                  onClick={startGuidedRun}
                  aria-pressed={practiceMode === "guided"}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-black transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200 sm:px-5",
                    practiceMode === "guided"
                      ? "bg-sky-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-sky-50"
                  )}
                >
                  <ListChecks className="h-5 w-5" aria-hidden="true" />
                  Guided 7
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCameraFocusMode((current) => !current)}
                className={cn(
                  "inline-flex items-center gap-3 rounded-full border border-yellow-200 bg-gradient-to-b from-[#fff6a8] to-[#ffe175] font-black text-ink shadow-[0_10px_20px_rgba(250,204,21,0.2),inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_26px_rgba(250,204,21,0.25)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-200",
                  cameraFocusMode ? "min-h-12 px-5 text-base sm:min-h-14 sm:px-7 sm:text-lg" : "min-h-14 px-7 text-lg"
                )}
              >
                <Focus className="h-6 w-6" aria-hidden="true" />
                Focus Mode
              </button>
              <button
                type="button"
                onClick={() => setShowHandLandmarks((current) => !current)}
                className={cn(
                  "inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/95 font-black text-ink shadow-[0_10px_20px_rgba(37,99,235,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_26px_rgba(37,99,235,0.16)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200",
                  cameraFocusMode ? "min-h-12 px-5 text-base sm:min-h-14 sm:px-7 sm:text-lg" : "min-h-14 px-7 text-lg"
                )}
                aria-pressed={showHandLandmarks}
              >
                {showHandLandmarks ? <Eye className="h-6 w-6" aria-hidden="true" /> : <EyeOff className="h-6 w-6" aria-hidden="true" />}
                Landmarks {showHandLandmarks ? "On" : "Off"}
              </button>
            </div>

            <CameraPanel
              cameraStarted={cameraStarted}
              videoRef={videoRef}
              canvasRef={canvasRef}
              trackerStatus={trackerStatus}
              detectedHandCount={detectedHandCount}
              playful
              fillAvailable
              onStartCamera={startCamera}
              onStopCamera={stopCamera}
              overlay={
                practiceMode === "guided" ? (
                  <GuidedCameraOverlay
                    phase={guidedPhase}
                    countdownValue={countdownValue}
                    target={guidedTarget}
                    currentIndex={guidedIndex}
                    total={guidedQueue.length}
                    cameraReady={cameraStarted && trackerStatus === "ready"}
                    feedbackTitle={guidedFeedbackTitle}
                    feedbackDetail={guidedFeedbackDetail}
                    onReady={beginGuidedCountdown}
                    onFeedbackAction={() => openGuidedCapture(true)}
                    onStartCamera={startCamera}
                    onSkip={skipGuidedGesture}
                    onEnd={() => setEndSessionDialogOpen(true)}
                  />
                ) : undefined
              }
            />

            <LearnerFeedbackBar
              stateLabel={
                practiceMode === "guided"
                  ? guidedPhase === "complete"
                    ? "Session complete"
                    : guidedPhase === "feedback"
                      ? guidedFeedbackCorrect
                        ? guidedFeedbackTitle
                        : ""
                      : `Gesture ${Math.min(guidedIndex + 1, guidedQueue.length)} of ${guidedQueue.length}`
                  : recognizedGesture
                    ? "Great job!"
                    : "Ready"
              }
              detail={
                practiceMode === "guided"
                  ? guidedPhase === "feedback"
                    ? guidedFeedbackCorrect
                      ? guidedFeedbackDetail
                      : ""
                    : guidedTarget
                      ? `Show: ${getLearnerCardLabel(guidedTarget.label)}`
                      : ""
                  : recognizedGesture
                  ? "You did it."
                  : cameraStarted
                    ? "Keep your hands inside the box."
                    : ""
              }
              statusMessage={prediction ? "" : statusMessage}
              correctiveFeedback={correctiveFeedback}
              feedbackLoading={feedbackLoading}
              success={practiceMode === "guided" ? guidedFeedbackCorrect : recognizedGesture}
              feedbackOnly={practiceMode === "guided" && guidedPhase === "feedback" && !guidedFeedbackCorrect}
              compact={cameraFocusMode}
            />
          </div>

          <div className={cameraFocusMode ? "hidden" : "flex min-h-0 min-w-0 flex-col overflow-hidden xl:pt-10"}>
            {practiceMode === "guided" && guidedPhase === "complete" ? (
              <GuidedSessionSummary
                results={guidedResults}
                summary={guidedSummary}
                onTryAgain={startGuidedRun}
                onFreePractice={switchToFreePractice}
              />
            ) : selectedGesture ? (
              <AnimatePresence custom={carouselDirection} mode="wait">
                <motion.div
                  key={selectedGesture.id}
                  className="min-h-0 flex-1"
                  custom={carouselDirection}
                  initial={{ opacity: 0, x: carouselDirection * 80, scale: 0.96, rotate: carouselDirection * 2 }}
                  animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, x: carouselDirection * -80, scale: 0.96, rotate: carouselDirection * -2 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                >
                  <LearnerReferenceFlipCard
                    item={selectedGesture}
                    flipped={referenceFlipped}
                    onFlip={() => setReferenceFlipped((current) => !current)}
                    onPlayAudio={playSelectedGestureAudio}
                  />
                </motion.div>
              </AnimatePresence>
            ) : null}

            {practiceMode === "guided" && guidedPhase !== "complete" ? (
              <GuidedProgressPanel
                queue={guidedQueue}
                results={guidedResults}
                currentIndex={guidedIndex}
                onSkip={skipGuidedGesture}
                onEnd={() => setEndSessionDialogOpen(true)}
              />
            ) : (
            <div className="mt-2 flex shrink-0 items-center justify-center gap-5 sm:mt-3 sm:gap-8">
              <Button type="button" variant="secondary" size="icon" aria-label="Previous card" onClick={() => moveGesture(-1)} className="h-16 w-16 rounded-full border-4 border-white bg-white/95 text-[#19294d] shadow-[0_16px_28px_rgba(37,99,235,0.16),inset_0_2px_0_rgba(255,255,255,0.95)] sm:h-20 sm:w-20">
                <ArrowLeft className="h-9 w-9 stroke-[3.5] sm:h-11 sm:w-11" aria-hidden="true" />
              </Button>
              <div className="flex items-center gap-2" aria-label={`Card ${selectedGestureIndex + 1} of ${learningItems.length}`}>
                {learningItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`h-3.5 w-3.5 rounded-full transition ${index === selectedGestureIndex ? "bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.16)]" : "bg-blue-200 hover:bg-blue-300"}`}
                    aria-label={`Open ${item.label}`}
                    onClick={() => handleGestureChange(item.id)}
                  />
                ))}
              </div>
              <Button type="button" variant="secondary" size="icon" aria-label="Next card" onClick={() => moveGesture(1)} className="h-16 w-16 rounded-full border-4 border-white bg-white/95 text-[#19294d] shadow-[0_16px_28px_rgba(37,99,235,0.16),inset_0_2px_0_rgba(255,255,255,0.95)] sm:h-20 sm:w-20">
                <ArrowRight className="h-9 w-9 stroke-[3.5] sm:h-11 sm:w-11" aria-hidden="true" />
              </Button>
            </div>
            )}
          </div>
        </div>
      </section>
      <ConfirmDialog
        open={endSessionDialogOpen}
        title="End guided practice?"
        description="Your attempts so far will stay in the session summary. Gestures you have not reached will be marked as not attempted."
        confirmLabel="End session"
        tone="danger"
        onClose={() => setEndSessionDialogOpen(false)}
        onConfirm={() => {
          setEndSessionDialogOpen(false);
          completeGuidedSession();
        }}
      />
      </>
    );
  }

  return (
    <>
      {isStudentMode ? null : <GuideBanner pageKey="gesture-practice" />}
      <section className="grid gap-3 xl:h-[calc(100vh-4.25rem)] xl:min-h-0 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="flex min-h-0 flex-col overflow-hidden p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge>Teacher view</Badge>
            <CardTitle className="mt-2 text-2xl">Gesture recognition</CardTitle>
            <CardDescription>View the learner, selected reference, and detector feedback in one workspace.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={startCamera}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              {cameraStarted ? "Restart camera" : "Start camera"}
            </Button>
          </div>
        </div>

        <GuideTip id="gesture.camera">
          <CameraPanel
            cameraStarted={cameraStarted}
            videoRef={videoRef}
            canvasRef={canvasRef}
            trackerStatus={trackerStatus}
            detectedHandCount={detectedHandCount}
            onStopCamera={stopCamera}
          />
        </GuideTip>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <TrackingMetric icon={Hand} label="Hands" value={`${detectedHandCount}/2`} valid={hasValidHands} />
          <TrackingMetric icon={UserRound} label="Camera" value={cameraStarted ? "Live" : "Off"} valid={cameraStarted} />
          <TrackingMetric icon={Eye} label="Model" value={getModelStatusLabel(modelStatus, hasValidHands)} valid={modelStatus === "ready"} />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            key={trackingState}
            initial={{ opacity: 0.65, y: 7, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className={`rounded-lg border p-3 ${
              meta.tone === "ready"
                ? "border-green-200 bg-mint text-green-900"
                : meta.tone === "warning"
                  ? "border-orange-200 bg-coral text-orange-950"
                  : "border-blue-100 bg-skywash text-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" aria-hidden="true" />
              <p className="font-semibold">{meta.label}</p>
            </div>
            <p className="mt-1 text-sm leading-5">{meta.detail}</p>
          </motion.div>

          <div className="rounded-lg border border-blue-100 bg-skywash p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">Feedback</p>
              <AnimatePresence mode="wait">
                <motion.span
                  key={trackingState}
                  initial={{ opacity: 0, scale: 0.55, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.7, rotate: 10 }}
                  transition={{ type: "spring", stiffness: 430, damping: 24 }}
                >
                  <StatusIcon state={trackingState} />
                </motion.span>
              </AnimatePresence>
            </div>
            {statusMessage ? <p className="mt-1 text-sm leading-5 text-slate-600">{statusMessage}</p> : null}
            <RecognizedGestureMessage prediction={prediction} compact />
            <CorrectiveFeedbackPanel feedback={correctiveFeedback} loading={feedbackLoading} compact />
          </div>
        </div>
      </Card>

      <Card className="flex min-h-0 flex-col overflow-hidden bg-[#fbfdff] p-4">
        {selectedGesture ? (
          <>
            <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selectedCategory?.name ?? "Sample gesture"}</Badge>
                </div>
                <CardTitle className="mt-2 text-2xl">{selectedGesture.label}</CardTitle>
                <CardDescription>Reference cue for teacher-guided practice.</CardDescription>
              </div>
              <GestureSelector
                id="teacher-gesture-reference"
                label="Reference gesture"
                items={learningItems}
                selectedGestureId={selectedGesture.id}
                onChange={handleGestureChange}
                helperText="The live model listens for every trained gesture."
              />
            </div>

            <div className="mt-3 rounded-lg border border-blue-100 bg-skywash p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">How to perform it</p>
              <p className="mt-1 text-sm font-semibold leading-5 text-ink">{referenceInstruction}</p>
              {selectedGesture.instruction ? (
                <p className="mt-1 text-sm leading-5 text-slate-600">{selectedGesture.instruction}</p>
              ) : null}
            </div>

            <div className="mt-3 grid min-h-0 gap-2 sm:grid-cols-2">
              <PracticeReferenceMedia
                title="Reference image"
                value={selectedGesture.symbolImageUrl}
                label={`${selectedGesture.label} reference image`}
                emptyText="No reference image added"
                compact
              />
              <PracticeReferenceMedia
                title="Gesture image/video"
                value={selectedGesture.gestureMediaUrl}
                label={`${selectedGesture.label} gesture reference`}
                emptyText="No gesture media added"
                compact
              />
              <PracticeReferenceMedia
                title="Audio cue"
                value={selectedGesture.audioUrl}
                label={`${selectedGesture.label} audio cue`}
                emptyText="No audio cue added"
                kind="audio"
                compact
                className="sm:col-span-2"
              />
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Live prediction</p>
                <p className="mt-1 text-base font-black text-ink">{prediction?.label ?? getPredictionWaitingLabel(modelStatus, hasValidHands)}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Model confidence</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {prediction
                    ? `${prediction.matchPercent}% confidence`
                    : getConfidenceWaitingLabel(modelStatus, hasValidHands)}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </Card>
      </section>
    </>
  );
}

function StudentGestureImageBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/gesture-practice/student-mode-background.png')" }}
    />
  );
}

function GuidedCameraOverlay({
  phase,
  countdownValue,
  target,
  currentIndex,
  total,
  cameraReady,
  feedbackTitle,
  feedbackDetail,
  onReady,
  onFeedbackAction,
  onStartCamera,
  onSkip,
  onEnd
}: {
  phase: GuidedSessionPhase;
  countdownValue: number;
  target?: LearningItem;
  currentIndex: number;
  total: number;
  cameraReady: boolean;
  feedbackTitle: string;
  feedbackDetail: string;
  onReady: () => void;
  onFeedbackAction: () => void;
  onStartCamera: () => void;
  onSkip: () => void;
  onEnd: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const shortLabel = target ? getLearnerCardLabel(target.label) : "Gesture";

  if (phase === "ready") {
    return (
      <div className="pointer-events-none grid h-full place-items-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="pointer-events-auto max-w-md rounded-[2rem] border-4 border-white/80 bg-white/95 p-5 text-center shadow-[0_24px_60px_rgba(15,23,42,0.32)] sm:p-7"
          role="status"
          aria-live="polite"
        >
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_14px_28px_rgba(16,185,129,0.3)]">
            <ThumbsUp className="h-10 w-10" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Guided practice</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
            {cameraReady ? "Give a thumbs up when you’re ready" : "Let’s get the camera ready"}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {cameraReady
              ? "Hold the thumbs-up pose for a moment, or use the button below."
              : "Camera access is needed before the seven-gesture session can begin."}
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-5 w-full rounded-full"
            onClick={cameraReady ? onReady : onStartCamera}
          >
            {cameraReady ? <ThumbsUp className="h-5 w-5" aria-hidden="true" /> : <Camera className="h-5 w-5" aria-hidden="true" />}
            {cameraReady ? "I’m ready" : "Start camera"}
          </Button>
          <Button
            type="button"
            variant="danger"
            size="lg"
            onClick={onEnd}
            className="mt-3 w-full rounded-full"
          >
            End guided practice
          </Button>
        </motion.div>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="pointer-events-none grid h-full place-items-center bg-[#10234f]/62 p-4 backdrop-blur-[2px]" role="status" aria-live="assertive">
        <div className="text-center text-white">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-blue-100">
            Gesture {currentIndex + 1} of {total}
          </p>
          <p className="mt-2 text-2xl font-black sm:text-3xl">Get ready for {shortLabel}</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={countdownValue}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.55, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.3 }}
              transition={{ duration: reduceMotion ? 0 : 0.35 }}
              className="mx-auto mt-5 grid h-32 w-32 place-items-center rounded-full border-8 border-white/80 bg-white/15 text-7xl font-black shadow-[0_0_0_14px_rgba(255,255,255,0.08)] sm:h-40 sm:w-40 sm:text-8xl"
            >
              {countdownValue}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="pointer-events-none grid h-full place-items-center bg-slate-950/48 p-4 backdrop-blur-sm">
        <div className="rounded-full border-2 border-white/80 bg-white/95 px-6 py-3 text-center font-black text-sky-700 shadow-xl">
          <Trophy className="mr-2 inline h-5 w-5" aria-hidden="true" />
          Session complete
        </div>
      </div>
    );
  }

  const success = phase === "feedback" && feedbackTitle === "Great job!";
  return (
    <div className="pointer-events-none flex h-full flex-col justify-between p-3 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-white/30 bg-slate-950/70 px-4 py-3 text-white shadow-lg backdrop-blur-md">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">
            Gesture {currentIndex + 1} of {total}
          </p>
          <p className="mt-1 text-xl font-black sm:text-2xl">Show {shortLabel}</p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 bg-slate-950/70 px-4 text-sm font-bold text-white backdrop-blur-md hover:bg-slate-900 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200"
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Skip</span>
          </button>
          <button
            type="button"
            onClick={onEnd}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-400 bg-red-600 px-4 text-sm font-bold text-white shadow-lg hover:bg-red-700 focus-visible:outline focus-visible:outline-4 focus-visible:outline-red-200"
          >
            <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            <span className="hidden sm:inline">End</span>
          </button>
        </div>
      </div>

      {phase === "feedback" ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cn(
            "mx-auto mb-4 max-w-lg rounded-[1.75rem] border-4 px-5 py-4 text-center shadow-2xl backdrop-blur-xl sm:px-7",
            success ? "border-emerald-200 bg-emerald-50/95 text-emerald-950" : "border-red-300 bg-red-50/95 text-red-950"
          )}
          role="status"
          aria-live="polite"
        >
          <p className="text-2xl font-black sm:text-3xl">{feedbackTitle}</p>
          {feedbackDetail ? <p className="mt-1 text-sm font-semibold leading-6 sm:text-base">{feedbackDetail}</p> : null}
          {!success ? (
            <Button
              type="button"
              size="lg"
              onClick={onFeedbackAction}
              className="pointer-events-auto mt-4 w-full rounded-full"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
        </motion.div>
      ) : (
        <div className="mx-auto mb-3 rounded-full border border-white/30 bg-slate-950/70 px-5 py-2 text-sm font-black text-white backdrop-blur-md">
          Make the gesture, then hold still
        </div>
      )}
    </div>
  );
}

function GuidedProgressPanel({
  queue,
  results,
  currentIndex,
  onSkip,
  onEnd
}: {
  queue: LearningItem[];
  results: GuidedGestureResult[];
  currentIndex: number;
  onSkip: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="mt-4 rounded-[1.5rem] border border-white/90 bg-white/85 p-4 shadow-[0_14px_30px_rgba(37,99,235,0.12)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-600">Guided 7</p>
          <p className="mt-1 font-black text-ink">Your gesture journey</p>
        </div>
        <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
          {Math.min(currentIndex + 1, queue.length)}/{queue.length}
        </span>
      </div>
      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
        {queue.map((item, index) => {
          const result = results.find((entry) => entry.gestureId === item.id);
          const complete = result?.status === "correct";
          const skipped = result?.status === "skipped";
          const current = index === currentIndex;
          return (
            <li
              key={item.id}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold",
                complete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : skipped
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : current
                      ? "border-sky-300 bg-sky-50 text-sky-800 shadow-sm"
                      : "border-blue-100 bg-white/70 text-slate-500"
              )}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/90 text-xs shadow-sm">
                {complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : skipped ? <SkipForward className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span className="truncate">{getLearnerCardLabel(item.label)}</span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" size="lg" onClick={onSkip}>
          <SkipForward className="h-5 w-5" aria-hidden="true" />
          Skip gesture
        </Button>
        <Button type="button" variant="danger" size="lg" onClick={onEnd}>
          <Square className="h-4 w-4 fill-current" aria-hidden="true" />
          End session
        </Button>
      </div>
    </div>
  );
}

function GuidedSessionSummary({
  results,
  summary,
  onTryAgain,
  onFreePractice
}: {
  results: GuidedGestureResult[];
  summary: ReturnType<typeof summarizeGuidedResults>;
  onTryAgain: () => void;
  onFreePractice: () => void;
}) {
  return (
    <div className="rounded-[2rem] border-4 border-white/90 bg-white/[0.92] p-5 shadow-[0_24px_60px_rgba(37,99,235,0.18)] backdrop-blur-xl sm:p-6">
      <div className="text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-white shadow-[0_14px_28px_rgba(251,146,60,0.3)]">
          <Trophy className="h-10 w-10" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-sky-600">Session summary</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-ink">You finished your practice</h2>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <SummaryMetric value={`${summary.completed}/${results.length}`} label="Completed" />
        <SummaryMetric value={`${summary.firstTryCorrect}/${results.length}`} label="First try" />
        <SummaryMetric value={String(summary.totalAttempts)} label="Attempts" />
      </div>

      <div className="mt-5 max-h-64 space-y-2 overflow-y-auto pr-1" aria-label="Gesture results">
        {results.map((result, index) => {
          const latestAttempt = result.attempts[result.attempts.length - 1];
          return (
            <div key={result.gestureId} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-[#f8fbff] p-3">
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-black",
                  result.status === "correct"
                    ? "bg-emerald-100 text-emerald-700"
                    : result.status === "skipped"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                )}
              >
                {result.status === "correct" ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-ink">{getLearnerCardLabel(result.gestureLabel)}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {result.status === "correct"
                    ? `${result.attempts.length} attempt${result.attempts.length === 1 ? "" : "s"}`
                    : result.status === "skipped"
                      ? "Skipped"
                      : "Not attempted"}
                  {latestAttempt?.predictedLabel ? ` · Last recognized: ${getLearnerCardLabel(latestAttempt.predictedLabel)}` : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {summary.skipped ? (
        <p className="mt-3 text-center text-sm font-semibold text-amber-800">
          {summary.skipped} gesture{summary.skipped === 1 ? " was" : "s were"} skipped.
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button type="button" size="lg" onClick={onTryAgain}>
          <RotateCw className="h-5 w-5" aria-hidden="true" />
          Try again
        </Button>
        <Button type="button" variant="danger" size="lg" onClick={onFreePractice}>
          <Hand className="h-5 w-5" aria-hidden="true" />
          Free practice
        </Button>
      </div>
    </div>
  );
}

function SummaryMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-2 py-3 text-center">
      <p className="text-xl font-black text-sky-700 sm:text-2xl">{value}</p>
      <p className="mt-1 text-[0.68rem] font-black uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
    </div>
  );
}

function RecognizedGestureMessage({
  prediction,
  compact = false
}: {
  prediction: DemoGesturePrediction | null;
  compact?: boolean;
}) {
  if (!prediction) return null;

  return (
    <div
      className={`mt-3 flex items-start gap-3 rounded-lg border border-blue-200 bg-white text-blue-950 shadow-sm ${compact ? "p-3" : "p-4"}`}
      role="status"
      aria-live="polite"
    >
      <Sparkles className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className={compact ? "text-sm font-black" : "font-black"}>Recognized Gesture: {prediction.label}</p>
      </div>
    </div>
  );
}

function getGesturePerformanceInstruction(item?: LearningItem) {
  if (!item) return "Choose a reference gesture to view the classroom cue.";
  return item.description ?? "Copy the reference slowly and keep both hands visible in the camera frame.";
}

function getModelStatusLabel(status: GestureModelStatus, hasValidHands: boolean) {
  if (status === "ready") return "Ready";
  if (status === "loading") return "Predicting";
  if (status === "error") return "Check";
  return hasValidHands ? "Recording" : "Waiting";
}

function getPredictionWaitingLabel(status: GestureModelStatus, hasValidHands: boolean) {
  if (status === "loading") return "Checking gesture";
  if (status === "error") return "Recognition unavailable";
  return hasValidHands ? "Hold the gesture still for 2 seconds" : "Waiting for hands";
}

function getConfidenceWaitingLabel(status: GestureModelStatus, hasValidHands: boolean) {
  if (status === "loading") return "Predicting held gesture...";
  if (status === "error") return "Model file not loaded";
  return hasValidHands ? "Recording — hold still to submit" : "Move hands into frame";
}

function getFixedGestureItems(items: LearningItem[]) {
  return items.filter(
    (item) => item.contentType === "gesture" && (item.tags.includes("fixed") || fixedGestureLabels.has(item.label))
  );
}

function ensureFixedGestureItems(items: LearningItem[]) {
  return getFixedGestureItems(items);
}

function LearnerReferenceFlipCard({
  item,
  flipped,
  onFlip,
  onPlayAudio
}: {
  item: LearningItem;
  flipped: boolean;
  onFlip: () => void;
  onPlayAudio: () => void;
}) {
  const frontLabel = getLearnerCardLabel(item.label);
  const imageSrc = getGestureReferenceImageSrc(item);

  return (
    <div className="mx-auto h-full min-h-0 w-full max-w-[32rem]">
      <div
        role="button"
        tabIndex={0}
        onClick={onFlip}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onFlip();
          }
        }}
        className="group block h-full min-h-0 w-full text-left [perspective:1400px]"
        aria-pressed={flipped}
        aria-label={flipped ? `Hide ${item.label} media` : `Show ${item.label} video and audio`}
      >
        <div
          className={`relative h-full min-h-0 rounded-[2rem] transition-transform duration-500 [transform-style:preserve-3d] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] border border-white/90 bg-white shadow-[0_22px_48px_rgba(37,99,235,0.16)] [backface-visibility:hidden]">
            <div className="flex min-h-0 flex-1 flex-col items-center justify-between gap-2 px-4 pb-3 pt-4 text-center sm:gap-3 sm:px-6 sm:pb-4 sm:pt-5">
              <div className="relative grid min-h-0 w-full max-w-[25rem] flex-1 place-items-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-50 to-sky-100 p-2 sm:p-3">
                {imageSrc ? (
                  <GestureReferenceImage src={imageSrc} alt={`${frontLabel} reference`} />
                ) : (
                  <GestureFallbackIllustration />
                )}
              </div>
              <div className="grid justify-items-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 shadow-inner">
                  <MousePointerClick className="h-5 w-5" aria-hidden="true" />
                  Click me
                </span>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-4 shadow-[0_22px_48px_rgba(37,99,235,0.16)] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-5">
            <h2 className="text-center text-3xl font-black text-ink sm:text-5xl">{frontLabel}</h2>

            <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between gap-2 sm:mt-4 sm:gap-3">
              <div className="grid min-h-0 flex-1 place-items-center overflow-hidden rounded-3xl border border-blue-100 bg-skywash p-2 sm:p-3">
                <GestureVideoPreview value={item.gestureMediaUrl} label={`${item.label} gesture reference`} />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-4">
                  <AudioWaveform compact />
                </div>
                <Button type="button" size="lg" onClick={(event) => {
                  event.stopPropagation();
                  onPlayAudio();
                }} className="min-h-16 rounded-full px-6 text-lg">
                  <PlayCircle className="h-7 w-7" aria-hidden="true" />
                  Play
                </Button>
              </div>
              <span className="mx-auto inline-flex items-center gap-2 rounded-full bg-blue-50 px-5 py-3 text-base font-black text-blue-700 shadow-inner">
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
                Click me
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GestureReferenceImage({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="relative block h-full w-full overflow-hidden rounded-[1.5rem] bg-white">
      {/* Gesture Recognition crops guide-card labels/footer visually; the original Content Library media is unchanged. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </span>
  );
}

function GestureFallbackIllustration() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-x-8 bottom-0 h-32 rounded-t-full bg-blue-500/90" />
      <div className="absolute left-1/2 top-12 h-24 w-24 -translate-x-1/2 rounded-full bg-[#ffd2b2] shadow-inner">
        <span className="absolute left-6 top-10 h-3 w-3 rounded-full bg-ink" />
        <span className="absolute right-6 top-10 h-3 w-3 rounded-full bg-ink" />
        <span className="absolute bottom-8 left-1/2 h-3 w-8 -translate-x-1/2 rounded-b-full border-b-4 border-[#d98267]" />
      </div>
      <div className="absolute bottom-28 left-[42%] h-5 w-24 origin-left rotate-[22deg] rounded-full bg-[#ffd2b2] shadow-sm" />
      <div className="absolute bottom-28 left-[52%] h-4 w-16 origin-left rotate-[6deg] rounded-full bg-[#ffd2b2] shadow-sm" />
      <div className="absolute bottom-28 left-[51%] h-3 w-12 origin-left -rotate-[9deg] rounded-full bg-[#ffd2b2] shadow-sm" />
    </div>
  );
}

function GestureVideoPreview({ value, label }: { value?: string; label: string }) {
  const mediaValue = value?.trim();

  if (mediaValue && isVideoUrl(mediaValue) && canEmbedMedia(mediaValue)) {
    return (
      <video controls className="max-h-64 w-full rounded-2xl" aria-label={label}>
        <source src={toMediaSrc(mediaValue)} />
      </video>
    );
  }

  if (mediaValue && isImageUrl(mediaValue) && canEmbedMedia(mediaValue)) {
    return (
      // Uploaded gesture images can use temporary preview URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={toMediaSrc(mediaValue)} alt={label} className="max-h-64 w-full rounded-2xl object-contain" />
    );
  }

  return (
    <div className="grid h-full min-h-44 w-full place-items-center rounded-2xl bg-white/70 text-center">
      <PlayCircle className="h-16 w-16 text-blue-500" aria-hidden="true" />
    </div>
  );
}

function LearnerFeedbackBar({
  stateLabel,
  detail,
  statusMessage,
  correctiveFeedback,
  feedbackLoading,
  success,
  feedbackOnly = false,
  compact = false
}: {
  stateLabel: string;
  detail: string;
  statusMessage: string;
  correctiveFeedback: GestureFeedbackResponse | null;
  feedbackLoading: boolean;
  success: boolean;
  feedbackOnly?: boolean;
  compact?: boolean;
}) {
  if (feedbackOnly) {
    return (
      <div
        className={cn(
          "border border-blue-100 bg-white/80 shadow-[0_14px_32px_rgba(37,99,235,0.09)]",
          compact ? "mt-2 rounded-2xl p-3" : "mt-4 rounded-[1.75rem] p-4"
        )}
        role="status"
        aria-live="polite"
      >
        <CorrectiveFeedbackPanel
          feedback={correctiveFeedback}
          loading={feedbackLoading}
          compact={compact}
          flush
          prominent
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid border shadow-[0_14px_32px_rgba(37,99,235,0.09)] sm:grid-cols-[auto_1fr] sm:items-center",
        compact ? "mt-2 gap-3 rounded-2xl p-3" : "mt-4 gap-4 rounded-[1.75rem] p-4",
        success ? "border-green-200 bg-green-50/90" : "border-blue-100 bg-white/80"
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "grid place-items-center rounded-full border-4 shadow-inner",
          compact ? "h-16 w-16" : "h-20 w-20",
          success ? "border-green-400 bg-lime-200" : "border-blue-200 bg-skywash"
        )}
      >
        <FeedbackMascot success={success} />
      </div>
      <div className="min-w-0">
        <p className={cn("font-black", compact ? "text-2xl" : "text-3xl", success ? "text-green-700" : "text-ink")}>{stateLabel}</p>
        {detail ? <p className={cn("mt-1 font-bold text-slate-700", compact ? "text-sm" : "text-base")}>{detail}</p> : null}
        {statusMessage ? <p className={cn("mt-1 line-clamp-2 text-sm text-slate-600", compact ? "leading-5" : "leading-6")}>{statusMessage}</p> : null}
        <CorrectiveFeedbackPanel
          feedback={correctiveFeedback}
          loading={feedbackLoading}
          compact={compact}
          prominent
        />
      </div>
    </div>
  );
}

function CorrectiveFeedbackPanel({
  feedback,
  loading,
  compact = false,
  flush = false,
  prominent = false
}: {
  feedback: GestureFeedbackResponse | null;
  loading: boolean;
  compact?: boolean;
  flush?: boolean;
  prominent?: boolean;
}) {
  if (!feedback && !loading) return null;

  const learnerSuccess = feedback?.issueCategory === "correct";

  if (loading && !feedback) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-xl bg-white/90",
          !flush && "mt-3",
          prominent
            ? "min-h-20 border-2 border-blue-200 p-4 shadow-[0_12px_28px_rgba(37,99,235,0.14)]"
            : "border border-blue-100 shadow-sm",
          !prominent && (compact ? "min-h-16 p-3" : "min-h-20 p-4")
        )}
        role="status"
        aria-live="polite"
        aria-label="Preparing feedback"
      >
        <div className="flex items-center gap-4">
          <FeedbackWaveDots />
          {prominent ? <p className="text-lg font-black text-blue-900 sm:text-xl">Checking your gesture...</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-white/90 text-left",
        !flush && "mt-3",
        prominent
          ? cn(
              "border-2 shadow-[0_14px_32px_rgba(15,23,42,0.14)]",
              learnerSuccess ? "border-emerald-300" : "border-red-300"
            )
          : "border border-blue-100 shadow-sm",
        compact ? "text-sm" : "text-base"
      )}
    >
      <div
        className={cn(
          "grid divide-y divide-slate-200",
          prominent
            ? "md:grid-cols-[1.05fr_0.95fr] md:divide-x md:divide-y-0"
            : "sm:grid-cols-2 sm:divide-x sm:divide-y-0"
        )}
      >
        <div
          className={cn(
            prominent ? (compact ? "p-4 sm:p-5" : "p-5 sm:p-6") : compact ? "p-3" : "p-4",
            learnerSuccess ? "bg-emerald-50" : "bg-red-50",
            prominent && (learnerSuccess ? "border-l-8 border-emerald-500" : "border-l-8 border-red-500")
          )}
        >
          {prominent ? (
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-sm",
                  learnerSuccess ? "bg-emerald-600" : "bg-red-600"
                )}
              >
                {learnerSuccess ? (
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <TriangleAlert className="h-6 w-6" aria-hidden="true" />
                )}
              </span>
              <p
                className={cn(
                  "text-xs font-black uppercase tracking-[0.12em] sm:text-sm",
                  learnerSuccess ? "text-emerald-700" : "text-red-700"
                )}
              >
                For learner
              </p>
            </div>
          ) : (
            <p className={cn("text-[0.7rem] font-black uppercase tracking-wide", learnerSuccess ? "text-emerald-700" : "text-red-700")}>
              For learner
            </p>
          )}
          <p
            className={cn(
              "font-black",
              prominent ? "mt-3 text-2xl leading-8 sm:text-3xl sm:leading-9" : "mt-1 text-xl leading-7",
              learnerSuccess ? "text-emerald-950" : "text-red-950"
            )}
          >
            {feedback?.learnerMessage ?? "Preparing feedback..."}
          </p>
        </div>
        <div className={prominent ? (compact ? "p-4 sm:p-5" : "p-5 sm:p-6") : compact ? "p-3" : "p-4"}>
          <p className={cn("font-black uppercase tracking-wide text-slate-500", prominent ? "text-xs sm:text-sm" : "text-[0.7rem]")}>
            Teacher guide
          </p>
          <p className={cn("font-semibold text-slate-700", prominent ? "mt-2 text-base leading-7 sm:text-lg sm:leading-8" : "mt-1 text-sm leading-6")}>
            {feedback?.teacherNote ?? "Checking the attempt details."}
          </p>
        </div>
      </div>
      {loading ? <div className="h-1 animate-pulse bg-blue-300" aria-hidden="true" /> : null}
    </div>
  );
}

function FeedbackWaveDots() {
  return (
    <span className="flex h-6 items-end gap-1.5" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 shadow-sm"
          style={{ animationDelay: `${index * 120}ms`, animationDuration: "760ms" }}
        />
      ))}
    </span>
  );
}

function FeedbackMascot({ success }: { success: boolean }) {
  return (
    <div className={`relative h-14 w-14 rounded-full shadow-[inset_0_-5px_0_rgba(15,23,42,0.08)] ${success ? "bg-gradient-to-b from-lime-300 to-green-300" : "bg-gradient-to-b from-blue-100 to-blue-200"}`}>
      <span className="absolute left-3.5 top-4 h-2.5 w-2.5 rounded-full bg-ink" />
      <span className="absolute right-3.5 top-4 h-2.5 w-2.5 rounded-full bg-ink" />
      {success ? (
        <>
          <span className="absolute left-1/2 top-7 h-4 w-8 -translate-x-1/2 rounded-b-full border-b-4 border-green-800" />
          <Sparkles className="absolute -right-1 -top-1 h-5 w-5 fill-yellow-300 text-yellow-300" aria-hidden="true" />
        </>
      ) : (
        <>
          <span className="absolute left-1/2 top-8 h-1.5 w-7 -translate-x-1/2 rounded-full bg-blue-700" />
          <Smile className="absolute -right-1 -top-1 h-5 w-5 text-blue-400" aria-hidden="true" />
        </>
      )}
    </div>
  );
}

function getLearnerCardLabel(label: string) {
  if (/toilet/i.test(label)) return "Toilet";
  if (/eat food/i.test(label)) return "Eat";
  if (/drink(?: water)?/i.test(label)) return "Drink";
  if (/sit/i.test(label)) return "Sit";

  return label.replace(/^I want to /i, "").trim().replace(/^./, (character) => character.toUpperCase());
}

function getGestureReferenceImageSrc(item: LearningItem) {
  const symbolValue = item.symbolImageUrl?.trim();
  if (symbolValue && isImageUrl(symbolValue) && canEmbedMedia(symbolValue)) return toMediaSrc(symbolValue);

  const gestureValue = item.gestureMediaUrl?.trim();
  if (gestureValue && isImageUrl(gestureValue) && canEmbedMedia(gestureValue)) return toMediaSrc(gestureValue);

  return undefined;
}

function CameraPanel({
  cameraStarted,
  videoRef,
  canvasRef,
  trackerStatus,
  detectedHandCount,
  playful = false,
  fillAvailable = false,
  onStartCamera,
  onStopCamera,
  overlay
}: {
  cameraStarted: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  trackerStatus: "idle" | "loading" | "ready" | "error";
  detectedHandCount: number;
  playful?: boolean;
  fillAvailable?: boolean;
  onStartCamera?: () => void;
  onStopCamera?: () => void;
  overlay?: ReactNode;
}) {
  const canStartFromPanel = Boolean(playful && !cameraStarted && onStartCamera);
  const canStopFromPanel = Boolean(cameraStarted && onStopCamera);

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-slate-700/70 bg-ink shadow-inner",
        fillAvailable ? "mt-2 min-h-0 flex-1" : "mt-5",
        playful ? "rounded-[1.75rem] p-1 ring-4 ring-white/70" : "rounded-2xl",
        cameraStarted && "camera-live-glow"
      )}
    >
      {cameraStarted ? (
        <button
          type="button"
          onClick={onStopCamera}
          disabled={!canStopFromPanel}
          className={cn(
            playful && "rounded-[1.45rem]",
            "block w-full overflow-hidden focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200",
            fillAvailable ? "h-full min-h-0" : "aspect-video",
            canStopFromPanel ? "cursor-pointer" : "cursor-default"
          )}
          aria-label="Turn camera off"
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="block h-full w-full -scale-x-100 object-contain"
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={onStartCamera}
          disabled={!canStartFromPanel}
          className={cn(
            playful && "rounded-[1.45rem] border border-white/10",
            "grid w-full place-items-center text-center text-white transition",
            fillAvailable ? "h-full min-h-0" : "aspect-video",
            canStartFromPanel ? "cursor-pointer hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200" : "cursor-default"
          )}
          aria-label={playful ? "Turn camera on" : "Camera preview"}
        >
          <div>
            <span className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-white/15 bg-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
              <Camera className="h-12 w-12" aria-hidden="true" />
            </span>
            <p className="mt-4 text-xl font-black">{playful ? "Camera on" : "Camera preview will appear here"}</p>
          </div>
        </button>
      )}

      {cameraStarted ? (
        <div className="pointer-events-none absolute inset-0">
          {/*
            The canvas backing size matches the camera's native frame. Using
            the same object-fit mode as the video keeps MediaPipe's normalized
            landmark coordinates aligned in both regular and focus layouts.
          */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full -scale-x-100 object-contain"
            aria-hidden="true"
          />
          <div className={`absolute inset-4 border border-dashed border-white/35 ${playful ? "rounded-[1.35rem]" : "rounded-lg"}`} />
          <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-4 py-2 text-xs font-black text-white">
            {trackerStatus === "loading"
              ? "Preparing hand tracking..."
              : `${detectedHandCount} hand${detectedHandCount === 1 ? "" : "s"} visible`}
          </div>
        </div>
      ) : null}
      {overlay ? <div className="absolute inset-0 z-20">{overlay}</div> : null}
    </div>
  );
}

function TrackingMetric({
  icon: Icon,
  label,
  value,
  valid
}: {
  icon: typeof Hand;
  label: string;
  value: string;
  valid: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/60 p-3 shadow-sm backdrop-blur-xl">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <Icon className={valid ? "h-4 w-4 text-green-600" : "h-4 w-4 text-orange-500"} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function StatusIcon({ state }: { state: TrackingState }) {
  if (state === "hands-visible") return <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />;
  if (state === "idle") return <ScanLine className="h-8 w-8 text-blue-600" aria-hidden="true" />;
  if (state === "no-hands") return <XCircle className="h-8 w-8 text-orange-500" aria-hidden="true" />;
  return <TriangleAlert className="h-8 w-8 text-orange-500" aria-hidden="true" />;
}

function GestureSelector({
  id,
  label,
  items,
  selectedGestureId,
  onChange,
  helperText,
  compact = false
}: {
  id: string;
  label: string;
  items: LearningItem[];
  selectedGestureId: string;
  onChange: (gestureId: string) => void;
  helperText?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "min-w-44" : undefined}>
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} className={`mt-2 font-bold ${compact ? "rounded-full bg-white/90 px-4 shadow-sm" : ""}`} value={selectedGestureId} onChange={(event) => onChange(event.target.value)}>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {compact ? getLearnerCardLabel(item.label) : item.label}
          </option>
        ))}
      </Select>
      {helperText ? <FieldHint>{helperText}</FieldHint> : null}
    </div>
  );
}

function PracticeReferenceMedia({
  title,
  value,
  label,
  emptyText,
  kind = "visual",
  className = "",
  compact = false
}: {
  title: string;
  value?: string;
  label: string;
  emptyText: string;
  kind?: "visual" | "audio";
  className?: string;
  compact?: boolean;
}) {
  const mediaValue = value?.trim();
  const mediaSrc = mediaValue ? toMediaSrc(mediaValue) : "";

  return (
    <div className={`overflow-hidden rounded-lg border border-blue-100 bg-[#f8fbff] shadow-inner ${className}`}>
      <div className="border-b border-blue-100 bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-700">
        {title}
      </div>
      <div className={kind === "audio" ? `${compact ? "min-h-28" : "min-h-36"} p-3` : `grid ${compact ? "min-h-28" : "min-h-36"} place-items-center p-3`}>
        {!mediaValue ? (
          kind === "audio" ? (
            <AudioEmptyState message={emptyText} />
          ) : (
            <p className="text-center text-sm font-semibold text-slate-500">{emptyText}</p>
          )
        ) : isImageUrl(mediaValue) && canEmbedMedia(mediaValue) ? (
          // Uploaded gesture images can use temporary preview URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaSrc} alt={label} className={`${compact ? "max-h-32" : "max-h-64"} w-full rounded-md object-contain`} />
        ) : isVideoUrl(mediaValue) && canEmbedMedia(mediaValue) ? (
          <video controls className={`${compact ? "max-h-32" : "max-h-64"} w-full rounded-md`} aria-label={label}>
            <source src={mediaSrc} />
          </video>
        ) : isAudioUrl(mediaValue) ? (
          <div className={`grid h-full ${compact ? "min-h-20 gap-2" : "min-h-28 gap-3"}`}>
            <AudioWaveform compact={compact} />
            {canEmbedMedia(mediaValue) ? (
              <audio controls className="w-full self-end" aria-label={label}>
                <source src={mediaSrc} />
              </audio>
            ) : (
              <p className="break-words text-center text-sm font-bold text-blue-700">{mediaValue}</p>
            )}
          </div>
        ) : (
          <p className="break-words text-center text-2xl font-bold text-blue-700">{mediaValue}</p>
        )}
      </div>
    </div>
  );
}

function AudioEmptyState({ message }: { message: string }) {
  return (
    <div className="grid h-full min-h-28 place-items-center rounded-md bg-white/60 p-4">
      <div className="w-full max-w-xl">
        <AudioWaveform muted />
        <p className="mt-4 text-center text-sm font-semibold text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function AudioWaveform({ muted = false, compact = false }: { muted?: boolean; compact?: boolean }) {
  const bars = [18, 34, 52, 28, 64, 42, 76, 48, 30, 58, 38, 70, 44, 24, 54, 32];

  return (
    <div className={`flex ${compact ? "h-12" : "h-20"} items-center justify-center gap-1.5 rounded-md border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 px-4`}>
      {bars.map((height, index) => (
        <span
          key={`${height}-${index}`}
          className={muted ? "w-1.5 rounded-full bg-blue-200" : "w-1.5 rounded-full bg-blue-500"}
          style={{ height: `${height}%`, opacity: muted ? 0.55 : 0.85 }}
        />
      ))}
    </div>
  );
}

function isImageUrl(value: string) {
  return /\.(apng|avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(value);
}

function isVideoUrl(value: string) {
  return /\.(mov|mp4|mpeg|ogg|ogv|webm)(\?.*)?$/i.test(value);
}

function isAudioUrl(value: string) {
  return /\.(aac|m4a|mp3|oga|ogg|opus|wav|weba)(\?.*)?$/i.test(value);
}

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/") || value.startsWith("blob:");
}

function canEmbedMedia(value: string) {
  return isUrl(value);
}

function toMediaSrc(value: string) {
  return isUrl(value) ? value : `/${value}`;
}

function playAudioSource(value: string, fallbackText: string, onError: () => void) {
  if (!isUrl(value)) {
    speakAudioCuePlaceholder(fallbackText, onError);
    return;
  }

  const audio = new Audio(toMediaSrc(value));
  audio.volume = 0.45;
  audio.onerror = () => speakAudioCuePlaceholder(fallbackText, onError);
  audio.play().catch(() => speakAudioCuePlaceholder(fallbackText, onError));
}

function speakAudioCuePlaceholder(text: string, onError: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onError();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.85;
  utterance.pitch = 1;
  utterance.volume = 0.85;
  utterance.onerror = onError;
  window.speechSynthesis.speak(utterance);
}





