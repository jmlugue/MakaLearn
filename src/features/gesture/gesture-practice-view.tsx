"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DrawingUtils, HandLandmarker } from "@mediapipe/tasks-vision";
import {
  ArrowBigLeft,
  ArrowBigRight,
  Camera,
  CheckCircle2,
  Eye,
  Hand,
  Maximize2,
  Minimize2,
  MousePointerClick,
  PlayCircle,
  RotateCcw,
  ScanLine,
  Sparkles,
  Star,
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
import { useStudentMode } from "@/features/student-mode/student-mode-context";
import { categories as mockCategories, learningItems as mockLearningItems } from "@/data/mock-data";
import { fetchMakaLearnData } from "@/lib/supabase/app-data";
import { generateCorrectiveFeedbackPlaceholder } from "@/utils/gesture-feedback";
import {
  predictGesturePlaceholder,
  supportedGesturePredictions,
  type DemoGesturePrediction
} from "@/utils/gesture-prediction";
import type { Category, LearningItem } from "@/types";

type TrackingState = "idle" | "hands-visible" | "no-hands" | "too-many-hands" | "multiple-people";
type HandConnection = { start: number; end: number };

const fixedGestureLabels = new Set([
  "I want to go to toilet",
  "I want to eat food",
  "I want to drink water",
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
    detail: "One or two hands are visible. Hold a supported pose briefly for a sample prediction.",
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
    detail: "The sample predictor reads a maximum of two hands at a time.",
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
  const lastAutoAudioKeyRef = useRef<string | null>(null);
  const noHandsFrameCountRef = useRef(0);
  const [learningItems, setLearningItems] = useState<LearningItem[]>(
    getFixedGestureItems(mockLearningItems)
  );
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [detectedHandCount, setDetectedHandCount] = useState(0);
  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [prediction, setPrediction] = useState<DemoGesturePrediction | null>(null);
  const [feedback, setFeedback] = useState("Start the camera to show hand visibility and validation feedback.");
  const [selectedGestureId, setSelectedGestureId] = useState("");
  const [referenceFlipped, setReferenceFlipped] = useState(false);
  const [carouselDirection, setCarouselDirection] = useState(1);
  const [cameraFocusMode, setCameraFocusMode] = useState(false);
  const selectedGesture = learningItems.find((item) => item.id === selectedGestureId) ?? learningItems[0];
  const selectedGestureIndex = Math.max(
    0,
    learningItems.findIndex((item) => item.id === selectedGesture?.id)
  );
  const selectedPredictionGuide = supportedGesturePredictions.find((gesture) => gesture.label === selectedGesture?.label);
  const selectedCategory = categories.find((category) => category.id === selectedGesture?.categoryId);
  const detectedGesture = prediction
    ? learningItems.find((item) => item.label === prediction.label)
    : undefined;
  const referenceInstruction = getGesturePerformanceInstruction(selectedGesture, selectedPredictionGuide?.pose);
  const meta = trackingMeta[trackingState];
  const hasValidHands = trackingState === "hands-visible";
  const isCorrectGesture = Boolean(prediction && selectedGesture && prediction.label === selectedGesture.label);

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        const gestureItems = ensureFixedGestureItems(data.learningItems);
        setLearningItems(gestureItems.length ? gestureItems : ensureFixedGestureItems(mockLearningItems));
        setCategories(data.categories.length ? data.categories : mockCategories);
      } catch (error) {
        notify({
          title: "Gesture data ready",
          description: "Saved gesture references are available in this workspace."
        });
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      handLandmarkerRef.current?.close();
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
  }, [detectedGesture?.audioUrl, detectedGesture?.id, detectedGesture?.label, notify, prediction]);

  async function prepareHandTracker() {
    if (handLandmarkerRef.current && drawingUtilsRef.current) return handLandmarkerRef.current;

    setTrackerStatus("loading");
    const vision = await import("@mediapipe/tasks-vision");
    const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const handLandmarker = await vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "/models/hand_landmarker.task" },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    handLandmarkerRef.current = handLandmarker;
    handConnectionsRef.current = vision.HandLandmarker.HAND_CONNECTIONS;
    const context = canvasRef.current?.getContext("2d");
    if (!context) throw new Error("The tracking canvas is unavailable.");
    drawingUtilsRef.current = new vision.DrawingUtils(context);
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

      const handCount = result.landmarks.length;
      if (handCount === 0) {
        noHandsFrameCountRef.current += 1;
        // Re-arm success audio only after hands are fully out of frame for several frames.
        if (noHandsFrameCountRef.current >= 6) {
          lastAutoAudioKeyRef.current = null;
        }
      } else {
        noHandsFrameCountRef.current = 0;
      }

      if (handCount !== lastHandCountRef.current) {
        lastHandCountRef.current = handCount;
        setDetectedHandCount(handCount);
        setTrackingState(handCount === 0 ? "no-hands" : handCount <= 2 ? "hands-visible" : "too-many-hands");
      }

      const nextPrediction = predictGesturePlaceholder(result.landmarks);
      updateStablePrediction(nextPrediction);
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
    clearPrediction();
    setFeedback("Raise one or two hands in the camera frame to begin.");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
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
      notify({
        title: "Camera unavailable",
        description: "Allow camera access and restart the camera to use the live hand outline."
      });
    }
  }

  function clearPrediction() {
    predictionCandidateRef.current = { label: null, frames: 0 };
    currentPredictionLabelRef.current = null;
    setPrediction(null);
  }

  function updateStablePrediction(nextPrediction: DemoGesturePrediction | null) {
    const nextLabel = nextPrediction?.label ?? null;
    const candidate = predictionCandidateRef.current;
    predictionCandidateRef.current =
      candidate.label === nextLabel
        ? { label: nextLabel, frames: candidate.frames + 1 }
        : { label: nextLabel, frames: 1 };

    // Require several matching frames to reduce flicker from landmark noise.
    if (predictionCandidateRef.current.frames < 6 || currentPredictionLabelRef.current === nextLabel) return;

    currentPredictionLabelRef.current = nextLabel;
    setPrediction(nextPrediction);
    setFeedback(
      nextPrediction
        ? generateCorrectiveFeedbackPlaceholder()
        : "No supported pose matched yet. Check the examples and hold one pose steadily."
    );
  }

  function handleGestureChange(nextGestureId: string) {
    setSelectedGestureId(nextGestureId);
    setReferenceFlipped(false);
    clearPrediction();
    setFeedback(cameraStarted ? "Reference changed. Hold a supported gesture in frame when ready." : "Start the camera to show hand visibility and validation feedback.");
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
      <section className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-b from-white via-[#eef7ff] to-[#e4f2ff] p-3 shadow-[0_24px_70px_rgba(37,99,235,0.14)] sm:p-5 xl:min-h-[calc(100vh-5.25rem)]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(7deg,#b8e4cd_0_34%,transparent_35%),linear-gradient(-8deg,transparent_0_44%,#d6f1e0_45%_67%,transparent_68%)]" />
        <div className="pointer-events-none absolute left-7 top-24 hidden h-10 w-10 rotate-12 text-yellow-300 sm:block">
          <Star className="h-full w-full fill-current drop-shadow-sm" aria-hidden="true" />
        </div>
        <div className="pointer-events-none absolute right-8 top-40 hidden h-9 w-9 -rotate-12 text-yellow-300 lg:block">
          <Star className="h-full w-full fill-current drop-shadow-sm" aria-hidden="true" />
        </div>
        <div className="pointer-events-none absolute right-24 top-8 hidden h-9 w-24 rounded-full bg-blue-100/80 shadow-[28px_10px_0_rgba(219,234,254,0.95),-22px_8px_0_rgba(219,234,254,0.85)] md:block" />

        <div className={`relative z-10 grid gap-4 ${cameraFocusMode ? "" : "xl:grid-cols-[1.13fr_0.87fr] xl:items-start"}`}>
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
              <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex min-h-14 items-center gap-3 rounded-full border border-yellow-200 bg-gradient-to-b from-[#fff6a8] to-[#ffe175] px-6 text-lg font-black text-ink shadow-[0_10px_20px_rgba(250,204,21,0.2),inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_26px_rgba(250,204,21,0.25)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-yellow-200"
                >
                  <Camera className="h-6 w-6" aria-hidden="true" />
                  {cameraStarted ? "Camera on" : "Turn camera on"}
                </button>
                <button
                  type="button"
                  onClick={() => setCameraFocusMode((current) => !current)}
                  className="inline-flex min-h-14 items-center gap-3 rounded-full border border-blue-100 bg-white/90 px-5 text-base font-black text-blue-700 shadow-[0_10px_22px_rgba(37,99,235,0.12)] transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100"
                >
                  {cameraFocusMode ? <Minimize2 className="h-5 w-5" aria-hidden="true" /> : <Maximize2 className="h-5 w-5" aria-hidden="true" />}
                  {cameraFocusMode ? "Show cards" : "Big camera"}
                </button>
              </div>
            </div>

            <CameraPanel
              cameraStarted={cameraStarted}
              videoRef={videoRef}
              canvasRef={canvasRef}
              trackerStatus={trackerStatus}
              detectedHandCount={detectedHandCount}
              playful
            />

            <LearnerFeedbackBar
              stateLabel={isCorrectGesture ? "Great job!" : prediction ? "Nice try!" : meta.label}
              detail={
                isCorrectGesture
                  ? "You matched the card."
                  : prediction
                    ? `The camera saw ${prediction.label}.`
                    : cameraStarted
                      ? "Keep your hands inside the box."
                      : "Tap the yellow button when you are ready."
              }
              feedback={feedback}
              score={isCorrectGesture ? 4 : prediction ? 3 : hasValidHands ? 2 : 1}
              success={isCorrectGesture}
              warning={Boolean(prediction && !isCorrectGesture)}
            />
          </div>

          <div className={cameraFocusMode ? "hidden" : "min-w-0"}>
            {selectedGesture ? (
              <AnimatePresence custom={carouselDirection} mode="wait">
                <motion.div
                  key={selectedGesture.id}
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

            <div className="mt-4 flex items-center justify-center gap-4">
              <Button type="button" variant="secondary" size="icon" aria-label="Previous card" onClick={() => moveGesture(-1)} className="h-20 w-20 rounded-[1.5rem] border-4 border-white bg-gradient-to-br from-yellow-200 via-white to-blue-100 text-blue-800 shadow-[0_16px_28px_rgba(37,99,235,0.18),inset_0_2px_0_rgba(255,255,255,0.95)]">
                <ArrowBigLeft className="h-12 w-12 fill-blue-500/20 stroke-[2.7]" aria-hidden="true" />
              </Button>
              <div className="flex items-center gap-2" aria-label={`Card ${selectedGestureIndex + 1} of ${learningItems.length}`}>
                {learningItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`h-3.5 rounded-full transition-all ${index === selectedGestureIndex ? "w-8 bg-blue-600" : "w-3.5 bg-blue-200 hover:bg-blue-300"}`}
                    aria-label={`Open ${item.label}`}
                    onClick={() => handleGestureChange(item.id)}
                  />
                ))}
              </div>
              <Button type="button" variant="secondary" size="icon" aria-label="Next card" onClick={() => moveGesture(1)} className="h-20 w-20 rounded-[1.5rem] border-4 border-white bg-gradient-to-br from-yellow-200 via-white to-blue-100 text-blue-800 shadow-[0_16px_28px_rgba(37,99,235,0.18),inset_0_2px_0_rgba(255,255,255,0.95)]">
                <ArrowBigRight className="h-12 w-12 fill-blue-500/20 stroke-[2.7]" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
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

        <CameraPanel
          cameraStarted={cameraStarted}
          videoRef={videoRef}
          canvasRef={canvasRef}
          trackerStatus={trackerStatus}
          detectedHandCount={detectedHandCount}
        />

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <TrackingMetric icon={Hand} label="Hands" value={`${detectedHandCount}/2`} valid={hasValidHands} />
          <TrackingMetric icon={UserRound} label="Camera" value={cameraStarted ? "Live" : "Off"} valid={cameraStarted} />
          <TrackingMetric icon={Eye} label="Outline" value={hasValidHands ? "Following" : "Waiting"} valid={hasValidHands} />
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
            <p className="mt-1 text-sm leading-5 text-slate-600">{feedback}</p>
            <RecognizedGestureMessage prediction={prediction} compact />
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
                  {selectedPredictionGuide ? <Badge className="bg-mint text-green-700">{selectedPredictionGuide.pose}</Badge> : null}
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
                helperText="The detector still listens for every supported sample pose."
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
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Sample prediction</p>
                <p className="mt-1 text-base font-black text-ink">{prediction?.label ?? "Waiting for a supported pose"}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Rule match</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {prediction
                    ? `${prediction.matchPercent}% sample match`
                    : hasValidHands
                      ? "Checking finger pose..."
                      : "Move hands into frame"}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </Card>
    </section>
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

function getGesturePerformanceInstruction(item?: LearningItem, pose?: string) {
  if (!item) return "Choose a reference gesture to view the classroom cue.";
  return pose ?? item.description ?? "Copy the reference slowly and keep both hands visible in the camera frame.";
}

function getFixedGestureItems(items: LearningItem[]) {
  return items.filter(
    (item) => item.contentType === "gesture" && (item.tags.includes("fixed") || fixedGestureLabels.has(item.label))
  );
}

function ensureFixedGestureItems(items: LearningItem[]) {
  const fixedItems = getFixedGestureItems(items);
  const requiredItems = getFixedGestureItems(mockLearningItems);
  const requiredByLabel = new Map(requiredItems.map((item) => [item.label, item]));
  const upgradedItems = fixedItems.map((item) => {
    const required = requiredByLabel.get(item.label);
    if (!required) return item;

    return {
      ...item,
      // Keep teacher-uploaded media, but replace old local placeholder codes
      // and demo filenames with the bundled gesture reference images.
      symbolImageUrl: shouldUseBundledGestureReference(item.symbolImageUrl) ? required.symbolImageUrl : item.symbolImageUrl,
      gestureMediaUrl: shouldUseBundledGestureReference(item.gestureMediaUrl) ? required.gestureMediaUrl : item.gestureMediaUrl,
      audioUrl: shouldUseGeneratedGestureAudio(item.audioUrl) ? required.audioUrl : item.audioUrl
    };
  });
  const existingLabels = new Set(upgradedItems.map((item) => item.label));

  return [
    ...upgradedItems,
    ...requiredItems.filter((item) => !existingLabels.has(item.label))
  ];
}

function shouldUseGeneratedGestureAudio(value?: string) {
  return !value || (/demo\.mp3$/i.test(value) && !value.startsWith("/audio/"));
}

function shouldUseBundledGestureReference(value?: string) {
  const mediaValue = value?.trim();
  if (!mediaValue) return true;
  return !(canEmbedMedia(mediaValue) && (isImageUrl(mediaValue) || isVideoUrl(mediaValue)));
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
    <div className="mx-auto w-full max-w-2xl">
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
        className="group block w-full text-left [perspective:1400px]"
        aria-pressed={flipped}
        aria-label={flipped ? `Hide ${item.label} media` : `Show ${item.label} video and audio`}
      >
        <div
          className={`relative min-h-[38rem] rounded-[2rem] transition-transform duration-500 [transform-style:preserve-3d] sm:min-h-[43rem] ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] border border-white/90 bg-white shadow-[0_22px_48px_rgba(37,99,235,0.16)] [backface-visibility:hidden]">
            <div className="flex flex-1 flex-col items-center justify-between gap-5 px-6 pb-8 pt-8 text-center sm:px-9 sm:pt-10">
              <div>
                <h2 className="text-4xl font-black text-ink sm:text-5xl">{frontLabel}</h2>
              </div>
              <div className="relative grid aspect-[3/4] w-full max-w-[29rem] place-items-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-50 to-sky-100 p-4 sm:max-w-[31rem]">
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

          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] border border-blue-100 bg-white p-5 shadow-[0_22px_48px_rgba(37,99,235,0.16)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <h2 className="text-center text-4xl font-black text-ink sm:text-5xl">{frontLabel}</h2>

            <div className="mt-5 flex flex-1 flex-col justify-between gap-4">
              <div className="grid min-h-[13rem] place-items-center overflow-hidden rounded-3xl border border-blue-100 bg-skywash p-3 sm:min-h-[16rem]">
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
      <img src={src} alt={alt} className="absolute left-1/2 top-[-18%] h-[138%] w-[138%] max-w-none -translate-x-1/2 object-contain" />
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
  feedback,
  score,
  success,
  warning
}: {
  stateLabel: string;
  detail: string;
  feedback: string;
  score: number;
  success: boolean;
  warning: boolean;
}) {
  return (
    <div
      className={`mt-4 grid gap-4 rounded-[1.75rem] border p-4 shadow-[0_14px_32px_rgba(37,99,235,0.09)] sm:grid-cols-[auto_1fr_auto] sm:items-center ${
        success
          ? "border-green-200 bg-green-50/90"
          : warning
            ? "border-orange-200 bg-orange-50/90"
            : "border-blue-100 bg-white/80"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className={`grid h-20 w-20 place-items-center rounded-full border-4 shadow-inner ${success ? "border-green-400 bg-lime-200" : warning ? "border-orange-300 bg-orange-100" : "border-blue-200 bg-skywash"}`}>
        <FeedbackMascot success={success} warning={warning} />
      </div>
      <div className="min-w-0">
        <p className={`text-3xl font-black ${success ? "text-green-700" : warning ? "text-orange-700" : "text-ink"}`}>{stateLabel}</p>
        <p className="mt-1 text-base font-bold text-slate-700">{detail}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{feedback}</p>
      </div>
      <div className="flex items-center justify-center gap-1.5 rounded-full bg-white/80 px-4 py-3 shadow-inner">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-7 w-7 ${star <= score ? "fill-yellow-300 text-yellow-300" : "fill-blue-100 text-blue-100"}`}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  );
}

function FeedbackMascot({ success, warning }: { success: boolean; warning: boolean }) {
  return (
    <div className={`relative h-14 w-14 rounded-full shadow-[inset_0_-5px_0_rgba(15,23,42,0.08)] ${success ? "bg-gradient-to-b from-lime-300 to-green-300" : warning ? "bg-gradient-to-b from-amber-200 to-orange-200" : "bg-gradient-to-b from-blue-100 to-blue-200"}`}>
      <span className="absolute left-3.5 top-4 h-2.5 w-2.5 rounded-full bg-ink" />
      <span className="absolute right-3.5 top-4 h-2.5 w-2.5 rounded-full bg-ink" />
      {success ? (
        <>
          <span className="absolute left-1/2 top-7 h-4 w-8 -translate-x-1/2 rounded-b-full border-b-4 border-green-800" />
          <Sparkles className="absolute -right-1 -top-1 h-5 w-5 fill-yellow-300 text-yellow-300" aria-hidden="true" />
        </>
      ) : warning ? (
        <span className="absolute left-1/2 top-8 h-1.5 w-8 -translate-x-1/2 rounded-full bg-orange-700" />
      ) : (
        <>
          <span className="absolute left-1/2 top-8 h-2 w-2 -translate-x-1/2 rounded-full bg-blue-700" />
          <span className="absolute left-5 top-8 h-2 w-2 rounded-full bg-blue-700" />
          <span className="absolute right-5 top-8 h-2 w-2 rounded-full bg-blue-700" />
        </>
      )}
    </div>
  );
}

function getLearnerCardLabel(label: string) {
  if (/toilet/i.test(label)) return "Toilet";
  if (/eat food/i.test(label)) return "Eat";
  if (/drink water/i.test(label)) return "Drink";
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
  playful = false
}: {
  cameraStarted: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  trackerStatus: "idle" | "loading" | "ready" | "error";
  detectedHandCount: number;
  playful?: boolean;
}) {
  return (
    <div className={`relative mt-5 overflow-hidden border border-slate-700/70 bg-ink shadow-inner ${playful ? "rounded-[1.75rem] p-1 ring-4 ring-white/70" : "rounded-2xl"} ${cameraStarted ? "camera-live-glow" : ""}`}>
      {cameraStarted ? (
        <video ref={videoRef} autoPlay playsInline muted className={`${playful ? "rounded-[1.45rem]" : ""} aspect-video w-full -scale-x-100 object-cover`} />
      ) : (
        <div className={`${playful ? "rounded-[1.45rem] border border-white/10" : ""} grid aspect-video place-items-center text-center text-white`}>
          <div>
            <Camera className="mx-auto h-12 w-12" aria-hidden="true" />
            <p className="mt-3 text-xl font-black">{playful ? "Camera ready" : "Camera preview will appear here"}</p>
          </div>
        </div>
      )}

      {cameraStarted ? (
        <div className="pointer-events-none absolute inset-0">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" aria-hidden="true" />
          <div className={`absolute inset-4 border border-dashed border-white/35 ${playful ? "rounded-[1.35rem]" : "rounded-lg"}`} />
          <div className="absolute bottom-3 left-3 rounded-full bg-slate-950/70 px-4 py-2 text-xs font-black text-white">
            {trackerStatus === "loading"
              ? "Preparing hand tracking..."
              : `${detectedHandCount} hand${detectedHandCount === 1 ? "" : "s"} visible`}
          </div>
        </div>
      ) : null}
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
