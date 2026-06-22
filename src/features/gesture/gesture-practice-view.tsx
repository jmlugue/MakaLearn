"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DrawingUtils, HandLandmarker } from "@mediapipe/tasks-vision";
import { Camera, CheckCircle2, Eye, Hand, RotateCcw, ScanLine, TriangleAlert, UserRound, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldHint, Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { categories as mockCategories, learningItems as mockLearningItems } from "@/data/mock-data";
import { fetchMakaLearnData } from "@/lib/supabase/app-data";
import { generateCorrectiveFeedbackPlaceholder } from "@/utils/gesture-feedback";
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
    label: "Hands visible",
    detail: "Valid frame: one person and one or two hands detected.",
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
    detail: "Validation allows a maximum of two hands at a time.",
    handCount: 3,
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);
  const handConnectionsRef = useRef<HandConnection[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastHandCountRef = useRef(-1);
  const [learningItems, setLearningItems] = useState<LearningItem[]>(
    getFixedGestureItems(mockLearningItems)
  );
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [selectedItemId, setSelectedItemId] = useState(
    getFixedGestureItems(mockLearningItems)[0]?.id ?? ""
  );
  const [cameraStarted, setCameraStarted] = useState(false);
  const [trackerStatus, setTrackerStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [detectedHandCount, setDetectedHandCount] = useState(0);
  const [trackingState, setTrackingState] = useState<TrackingState>("idle");
  const [feedback, setFeedback] = useState("Start the camera to show hand visibility and validation feedback.");
  const selectedItem = learningItems.find((item) => item.id === selectedItemId) ?? learningItems[0];
  const selectedCategory = categories.find((category) => category.id === selectedItem?.categoryId);
  const meta = trackingMeta[trackingState];
  const hasValidHands = trackingState === "hands-visible";

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        const gestureItems = getFixedGestureItems(data.learningItems);
        setLearningItems(gestureItems.length ? gestureItems : getFixedGestureItems(mockLearningItems));
        setCategories(data.categories.length ? data.categories : mockCategories);
        setSelectedItemId((current) => current || gestureItems[0]?.id || "");
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
      if (handCount !== lastHandCountRef.current) {
        lastHandCountRef.current = handCount;
        setDetectedHandCount(handCount);
        setTrackingState(handCount > 0 ? "hands-visible" : "no-hands");
        setFeedback(
          handCount > 0 && selectedItem
            ? generateCorrectiveFeedbackPlaceholder(selectedItem.label)
            : trackingMeta["no-hands"].detail
        );
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
    setFeedback("Raise one or both hands in the camera frame to begin.");

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
    setFeedback(cameraStarted ? "Tracking reset. Place one person in frame and show up to two hands." : trackingMeta.idle.detail);
  }

  return (
    <>
      <PageHeader
        eyebrow="Gesture Recognition"
        title="Guided gesture practice"
        description="Follow the live hand outline, check visibility, and use teacher-led feedback during practice."
      />

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Camera and hand detector</CardTitle>
              <CardDescription>The landmark outline follows up to two visible hands in real time.</CardDescription>
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
                  {trackerStatus === "loading" ? "Preparing hand tracking…" : `${detectedHandCount} of 2 hands visible`}
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
            <CardTitle>Fixed gesture setup</CardTitle>
            <div className="mt-4">
              <Label htmlFor="gesture-item">Gesture</Label>
              <Select id="gesture-item" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}>
                {learningItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <FieldHint>Only the seven final gesture labels are available here.</FieldHint>
            </div>
          </Card>

          {selectedItem ? (
            <Card className="flex h-full flex-col">
              <Badge>{selectedCategory?.name ?? "Fixed gesture"}</Badge>
              <CardTitle className="mt-3">{selectedItem.label}</CardTitle>
              <p className="mt-3 text-sm leading-6 text-slate-600">{selectedItem.instruction}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <PracticeReferenceMedia
                  title="Reference image"
                  value={selectedItem.symbolImageUrl}
                  label={`${selectedItem.label} reference image`}
                  emptyText="No reference image added"
                />
                <PracticeReferenceMedia
                  title="Gesture image/video"
                  value={selectedItem.gestureMediaUrl}
                  label={`${selectedItem.label} gesture reference`}
                  emptyText="No gesture media added"
                />
                <PracticeReferenceMedia
                  title="Audio cue"
                  value={selectedItem.audioUrl}
                  label={`${selectedItem.label} audio cue`}
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
                <CardDescription>Keep the hands inside the frame before starting the teacher-led check.</CardDescription>
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
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Selected gesture</p>
                <p className="mt-2 text-lg font-black text-ink">{selectedItem?.label ?? "Choose a gesture"}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Practice check</p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {hasValidHands ? "Hands are visible—continue practice" : "Move hands into the camera frame"}
                </p>
              </div>
            </div>

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

function PracticeReferenceMedia({
  title,
  value,
  label,
  emptyText,
  kind = "visual",
  className = ""
}: {
  title: string;
  value?: string;
  label: string;
  emptyText: string;
  kind?: "visual" | "audio";
  className?: string;
}) {
  const mediaValue = value?.trim();

  return (
    <div className={`overflow-hidden rounded-lg border border-blue-100 bg-[#f8fbff] shadow-inner ${className}`}>
      <div className="border-b border-blue-100 bg-white/70 px-3 py-2 text-xs font-bold uppercase tracking-wide text-blue-700">
        {title}
      </div>
      <div className={kind === "audio" ? "min-h-36 p-3" : "grid min-h-36 place-items-center p-3"}>
        {!mediaValue ? (
          kind === "audio" ? (
            <AudioEmptyState message={emptyText} />
          ) : (
            <p className="text-center text-sm font-semibold text-slate-500">{emptyText}</p>
          )
        ) : isImageUrl(mediaValue) ? (
          // Official/approved gesture images can be uploaded through Supabase Storage later.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaValue} alt={label} className="max-h-64 w-full rounded-md object-contain" />
        ) : isVideoUrl(mediaValue) ? (
          <video controls className="max-h-64 w-full rounded-md" aria-label={label}>
            <source src={mediaValue} />
          </video>
        ) : isAudioUrl(mediaValue) ? (
          <div className="grid h-full min-h-28 gap-3">
            <AudioWaveform />
            <audio controls className="w-full self-end" aria-label={label}>
              <source src={mediaValue} />
            </audio>
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

function AudioWaveform({ muted = false }: { muted?: boolean }) {
  const bars = [18, 34, 52, 28, 64, 42, 76, 48, 30, 58, 38, 70, 44, 24, 54, 32];

  return (
    <div className="flex h-20 items-center justify-center gap-1.5 rounded-md border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-blue-50 px-4">
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
  return isUrl(value) && /\.(apng|avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(value);
}

function isVideoUrl(value: string) {
  return isUrl(value) && /\.(mov|mp4|mpeg|ogg|ogv|webm)(\?.*)?$/i.test(value);
}

function isAudioUrl(value: string) {
  return isUrl(value) && /\.(aac|m4a|mp3|oga|ogg|opus|wav|weba)(\?.*)?$/i.test(value);
}

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/") || value.startsWith("blob:");
}
