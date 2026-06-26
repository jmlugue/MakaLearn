"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DrawingUtils, HandLandmarker } from "@mediapipe/tasks-vision";
import { Camera, CheckCircle2, Eye, Hand, RotateCcw, ScanLine, Sparkles, TriangleAlert, UserRound, Volume2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldHint, Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
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
  const selectedGesture = learningItems.find((item) => item.id === selectedGestureId) ?? learningItems[0];
  const selectedPredictionGuide = supportedGesturePredictions.find((gesture) => gesture.label === selectedGesture?.label);
  const selectedCategory = categories.find((category) => category.id === selectedGesture?.categoryId);
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
          title: "Using local gesture data",
          description: error instanceof Error ? error.message : "Supabase gesture data could not be loaded."
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
    if (!isCorrectGesture || !selectedGesture?.audioUrl) return;
    const audioKey = `${selectedGesture.id}:${prediction?.label ?? ""}`;
    if (lastAutoAudioKeyRef.current === audioKey) return;
    lastAutoAudioKeyRef.current = audioKey;
    playAudioSource(selectedGesture.audioUrl, selectedGesture.label, () => {
      notify({
        title: "Audio unavailable",
        description: "Use the reference panel audio control or check the uploaded audio file."
      });
    });
  }, [isCorrectGesture, notify, prediction?.label, selectedGesture?.audioUrl, selectedGesture?.id, selectedGesture?.label]);

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

  function resetTracking() {
    setTrackingState(cameraStarted ? "no-hands" : "idle");
    setDetectedHandCount(0);
    lastHandCountRef.current = -1;
    noHandsFrameCountRef.current = 0;
    lastAutoAudioKeyRef.current = null;
    clearPrediction();
    setFeedback(cameraStarted ? "Tracking reset. Place one or two hands in frame and hold a supported pose." : trackingMeta.idle.detail);
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
        ? nextPrediction.label === selectedGesture?.label
          ? generateCorrectiveFeedbackPlaceholder(nextPrediction.label)
          : `Detected "${nextPrediction.label}". Check the reference and try "${selectedGesture?.label ?? "the selected gesture"}" again slowly.`
        : "No supported pose matched yet. Check the examples and hold one pose steadily."
    );
  }

  function handleGestureChange(nextGestureId: string) {
    setSelectedGestureId(nextGestureId);
    lastAutoAudioKeyRef.current = null;
    clearPrediction();
    setFeedback(cameraStarted ? "Target changed. Hold the new gesture in frame when ready." : "Start the camera to show hand visibility and validation feedback.");
  }

  if (isStudentMode) {
    return (
      <section className="grid gap-3 xl:h-[calc(100vh-5.25rem)] xl:min-h-0 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="flex min-h-0 flex-col overflow-hidden p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge>Student mode</Badge>
              <CardTitle className="mt-2 text-2xl">Practice the gesture</CardTitle>
              <CardDescription>Keep your hands inside the frame and copy the selected reference.</CardDescription>
            </div>
            <Button size="lg" onClick={startCamera}>
              <Camera className="h-5 w-5" aria-hidden="true" />
              {cameraStarted ? "Restart camera" : "Start camera"}
            </Button>
          </div>

          <CameraPanel
            cameraStarted={cameraStarted}
            videoRef={videoRef}
            canvasRef={canvasRef}
            trackerStatus={trackerStatus}
            detectedHandCount={detectedHandCount}
          />

          <div className="mt-3 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
            <div
              className={`rounded-lg border p-4 text-center ${
                isCorrectGesture
                  ? "border-green-200 bg-mint text-green-950"
                  : prediction
                    ? "border-orange-200 bg-coral text-orange-950"
                    : "border-blue-100 bg-skywash text-slate-700"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="text-xl font-black">
                {isCorrectGesture ? "Good match" : prediction ? "Try again slowly" : meta.label}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {isCorrectGesture
                  ? `You matched ${selectedGesture?.label}.`
                  : prediction
                    ? `The camera saw ${prediction.label}.`
                    : meta.detail}
              </p>
              {isCorrectGesture && selectedGesture?.audioUrl ? (
                <p className="mt-2 inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-green-800">
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                  Audio played
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-blue-100 bg-skywash p-4">
              <p className="font-semibold text-ink">Feedback</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{feedback}</p>
            </div>
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden bg-[#fbfdff] p-4">
          <GestureSelector
            id="student-gesture-target"
            label="Choose gesture"
            items={learningItems}
            selectedGestureId={selectedGesture?.id ?? ""}
            onChange={handleGestureChange}
            helperText="Change the target without leaving student mode."
          />

          <div className="mt-3 rounded-lg border border-blue-100 bg-white/70 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{selectedCategory?.name ?? "Reference"}</Badge>
              {selectedPredictionGuide ? <Badge className="bg-mint text-green-700">{selectedPredictionGuide.pose}</Badge> : null}
            </div>
            <CardTitle className="mt-2 text-2xl">{selectedGesture?.label ?? "Gesture reference"}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {selectedGesture?.instruction ?? "Wait for the teacher to choose a gesture."}
            </p>
          </div>

          {selectedGesture ? (
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
          ) : null}
        </Card>
      </section>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Gesture Recognition"
        title="Sample gesture prediction"
        description="Show a supported one-hand or two-hand pose and hold it briefly to see a live demo prediction."
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Camera and hand detector</CardTitle>
              <CardDescription>The landmark outline follows the hand while demo rules match its finger pose.</CardDescription>
            </div>
            <Button onClick={startCamera}>
              <Camera className="h-4 w-4" aria-hidden="true" />
              {cameraStarted ? "Restart camera" : "Start camera"}
            </Button>
          </div>

          <div className={`relative mt-5 overflow-hidden rounded-2xl border border-slate-700/70 bg-ink shadow-inner ${cameraStarted ? "camera-live-glow" : ""}`}>
            {cameraStarted ? (
              <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full -scale-x-100 object-cover" />
            ) : (
              <div className="grid aspect-video place-items-center text-center text-white">
                <div>
                  <Camera className="mx-auto h-12 w-12" aria-hidden="true" />
                  <p className="mt-3 font-semibold">Camera preview will appear here</p>
                </div>
              </div>
            )}

            {cameraStarted ? (
              <div className="pointer-events-none absolute inset-0">
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" aria-hidden="true" />
                <div className="absolute inset-4 rounded-lg border border-white/35" />
                <div className="absolute bottom-3 left-3 rounded-md bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white">
                  {trackerStatus === "loading"
                    ? "Preparing hand tracking..."
                    : `${detectedHandCount} hand${detectedHandCount === 1 ? "" : "s"} visible`}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <TrackingMetric icon={Hand} label="Hands" value={`${detectedHandCount}/2`} valid={hasValidHands} />
            <TrackingMetric icon={UserRound} label="Camera" value={cameraStarted ? "Live" : "Off"} valid={cameraStarted} />
            <TrackingMetric icon={Eye} label="Outline" value={hasValidHands ? "Following" : "Waiting"} valid={hasValidHands} />
          </div>
        </Card>

        <div className="grid gap-4">
          <Card className="bg-[#fbfdff]">
            <CardTitle>Gesture target</CardTitle>
            <CardDescription>Choose the gesture to practice. These demo mappings are not official Makaton gestures.</CardDescription>
            <div className="mt-4">
              <GestureSelector
                id="teacher-gesture-target"
                label="Practice target"
                items={learningItems}
                selectedGestureId={selectedGesture?.id ?? ""}
                onChange={handleGestureChange}
                helperText={selectedPredictionGuide?.pose ?? "Select a supported sample pose."}
              />
            </div>
          </Card>

          {selectedGesture ? (
            <Card className="flex h-full flex-col">
              <Badge>{selectedCategory?.name ?? "Sample gesture"}</Badge>
              <CardTitle className="mt-3">{selectedGesture.label}</CardTitle>
              <p className="mt-3 text-sm leading-6 text-slate-600">{selectedGesture.instruction}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <PracticeReferenceMedia
                  title="Reference image"
                  value={selectedGesture.symbolImageUrl}
                  label={`${selectedGesture.label} reference image`}
                  emptyText="No reference image added"
                />
                <PracticeReferenceMedia
                  title="Gesture image/video"
                  value={selectedGesture.gestureMediaUrl}
                  label={`${selectedGesture.label} gesture reference`}
                  emptyText="No gesture media added"
                />
                <PracticeReferenceMedia
                  title="Audio cue"
                  value={selectedGesture.audioUrl}
                  label={`${selectedGesture.label} audio cue`}
                  emptyText="No audio cue added"
                  kind="audio"
                  className="md:col-span-2"
                />
              </div>
            </Card>
          ) : null}

          <Card className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Detection status</CardTitle>
                <CardDescription>The result appears after the same supported pose is stable for several frames.</CardDescription>
              </div>
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

            <motion.div
              key={trackingState}
              initial={{ opacity: 0.65, y: 7, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 360, damping: 30 }}
              className={`mt-4 rounded-lg border p-4 ${
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
              <p className="mt-2 text-sm leading-6">{meta.detail}</p>
            </motion.div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Sample prediction</p>
                <p className="mt-2 text-lg font-black text-ink">{prediction?.label ?? "Waiting for a supported pose"}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Rule match</p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {prediction
                    ? `${prediction.matchPercent}% sample match`
                    : hasValidHands
                      ? "Checking finger pose..."
                      : "Move your hands into the camera frame"}
                </p>
              </div>
            </div>

            {prediction ? (
              <div
                className="mt-4 flex items-start gap-3 rounded-lg border border-green-200 bg-mint p-4 text-green-950"
                role="status"
                aria-live="polite"
              >
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold">Predicted: {prediction.label}</p>
                  <p className="mt-1 text-sm">Matched demo pose: {prediction.pose}.</p>
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded-lg bg-skywash p-4">
              <p className="font-semibold text-ink">Corrective feedback preview</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feedback}</p>
            </div>

            <CardFooter className="mt-4">
              <Button variant="secondary" onClick={resetTracking}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset tracking
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </>
  );
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
      symbolImageUrl: item.symbolImageUrl || required.symbolImageUrl,
      gestureMediaUrl: item.gestureMediaUrl || required.gestureMediaUrl,
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

function CameraPanel({
  cameraStarted,
  videoRef,
  canvasRef,
  trackerStatus,
  detectedHandCount
}: {
  cameraStarted: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  trackerStatus: "idle" | "loading" | "ready" | "error";
  detectedHandCount: number;
}) {
  return (
    <div className={`relative mt-5 overflow-hidden rounded-2xl border border-slate-700/70 bg-ink shadow-inner ${cameraStarted ? "camera-live-glow" : ""}`}>
      {cameraStarted ? (
        <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full -scale-x-100 object-cover" />
      ) : (
        <div className="grid aspect-video place-items-center text-center text-white">
          <div>
            <Camera className="mx-auto h-12 w-12" aria-hidden="true" />
            <p className="mt-3 font-semibold">Camera preview will appear here</p>
          </div>
        </div>
      )}

      {cameraStarted ? (
        <div className="pointer-events-none absolute inset-0">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100" aria-hidden="true" />
          <div className="absolute inset-4 rounded-lg border border-white/35" />
          <div className="absolute bottom-3 left-3 rounded-md bg-slate-950/70 px-3 py-2 text-xs font-semibold text-white">
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
  helperText
}: {
  id: string;
  label: string;
  items: LearningItem[];
  selectedGestureId: string;
  onChange: (gestureId: string) => void;
  helperText?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} className="mt-2 font-bold" value={selectedGestureId} onChange={(event) => onChange(event.target.value)}>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
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
          // Official/approved gesture images can be uploaded through Supabase Storage later.
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
