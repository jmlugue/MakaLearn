"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Check, Hand, Sparkles, Volume2, X } from "lucide-react";
import type { DrawingUtils, HandLandmarker } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCENE_MS = 8000;

const scenes = [
  { key: "see", label: "See it", caption: "Every word has a symbol." },
  { key: "sign", label: "Sign it", caption: "Watch the sign, then copy it." },
  { key: "feedback", label: "Get feedback", caption: "The camera checks the sign." },
  { key: "try", label: "Try it", caption: "Show your hand to the camera." }
] as const;

// Hand landmark points traced over the "eat" reference image (455 x 377 px),
// following MediaPipe's 21-point order so the connections match the real tracker.
const handPoints: [number, number][] = [
  [182, 204],
  [168, 188], [160, 170], [157, 154], [160, 140],
  [194, 162], [199, 147], [205, 135], [211, 126],
  [204, 166], [209, 150], [214, 138], [219, 129],
  [211, 173], [216, 159], [220, 149], [223, 141],
  [214, 183], [218, 171], [221, 163], [223, 156]
];

const handConnections: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]
];

export function HowItWorksOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isLast = step === scenes.length - 1;

  const goTo = useCallback((next: number) => {
    setStep(Math.max(0, Math.min(scenes.length - 1, next)));
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || paused || isLast) return;
    const timer = window.setTimeout(() => goTo(step + 1), SCENE_MS);
    return () => window.clearTimeout(timer);
  }, [goTo, isLast, open, paused, step]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key === "ArrowRight") goTo(step + 1);
    if (event.key === "ArrowLeft") goTo(step - 1);
    if (event.key !== "Tab" || !dialogRef.current) return;

    // Keep keyboard focus inside the dialog while it is open.
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        // No backdrop blur here or on the panel: re-blurring the animated page every frame caused lag.
        <motion.div
          className="fixed inset-0 z-50 flex overflow-y-auto bg-slate-900/55 px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="how-it-works-title"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className="relative m-auto w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white bg-[#f8fbff] p-5 shadow-[0_26px_70px_rgba(15,23,42,0.28)] outline-none sm:p-8"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-blue-600">Learn Makaton in just four steps.</p>
                <h2 id="how-it-works-title" className="mt-1 text-2xl font-black tracking-[-0.03em] text-ink sm:text-3xl">
                  {scenes[step].label}
                </h2>
                <p className="mt-1 text-sm text-slate-600 sm:text-base">{scenes[step].caption}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/80 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2" aria-label="Steps">
              {scenes.map((scene, index) => (
                <button
                  key={scene.key}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Step ${index + 1}: ${scene.label}`}
                  aria-current={index === step ? "step" : undefined}
                  className="group py-2 focus-visible:outline-none"
                >
                  <span className="block h-1.5 overflow-hidden rounded-full bg-blue-100 group-focus-visible:ring-2 group-focus-visible:ring-blue-300">
                    {index < step ? <span className="block h-full w-full bg-blue-500" /> : null}
                    {index === step ? (
                      <motion.span
                        key={`${step}-${paused}`}
                        className="block h-full bg-blue-500"
                        initial={{ width: isLast ? "100%" : "0%" }}
                        animate={{ width: paused && !isLast ? "0%" : "100%" }}
                        transition={{ duration: isLast || paused ? 0 : SCENE_MS / 1000, ease: "linear" }}
                      />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "mt-2 hidden text-xs font-bold sm:block",
                      index === step ? "text-blue-700" : "text-slate-400"
                    )}
                  >
                    {scene.label}
                  </span>
                </button>
              ))}
            </div>

            <div
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              className="relative mt-4 h-[420px] overflow-hidden rounded-[1.5rem] border border-white/80 bg-gradient-to-br from-blue-50 via-white to-emerald-50/60 sm:h-[360px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={scenes[step].key}
                  className="absolute inset-0 flex items-center justify-center p-4"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 0 ? <SeeScene /> : null}
                  {step === 1 ? <SignScene /> : null}
                  {step === 2 ? <FeedbackScene /> : null}
                  {step === 3 ? <TryScene /> : null}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <Button type="button" variant="secondary" onClick={() => goTo(step - 1)} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
              </Button>
              {isLast ? (
                <Link href="/login" className="inline-flex">
                  <Button type="button" tabIndex={-1}>
                    Sign in to MakaLearn <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              ) : (
                <Button type="button" onClick={() => goTo(step + 1)}>
                  Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SeeScene() {
  const reduceMotion = useReducedMotion();
  const [speaking, setSpeaking] = useState(false);

  function speak() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Eat");
    utterance.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-10">
      <motion.div
        className="rounded-[1.5rem] bg-white p-3 shadow-[0_24px_60px_rgba(37,99,235,0.18)]"
        initial={reduceMotion ? false : { rotateY: 90, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 800 }}
      >
        <Image src="/pecs/generated_cards/eat.png" alt="Eat symbol card" width={200} height={200} className="h-40 w-40 object-contain sm:h-52 sm:w-52" />
      </motion.div>
      <div className="flex flex-col items-center gap-4 sm:items-start">
        <p className="text-5xl font-black tracking-[-0.04em] text-ink" aria-label="Eat">
          {"Eat".split("").map((letter, index) => (
            <motion.span
              key={index}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.15 }}
              aria-hidden="true"
            >
              {letter}
            </motion.span>
          ))}
        </p>
        <button
          type="button"
          onClick={speak}
          className="relative inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          {!reduceMotion ? (
            <motion.span
              className="absolute inset-0 rounded-xl ring-2 ring-blue-300"
              animate={{ opacity: [0.8, 0], scale: [1, 1.18] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: speaking ? 0 : 1.2 }}
              aria-hidden="true"
            />
          ) : null}
          <Volume2 className="h-4 w-4" aria-hidden="true" /> Hear it
        </button>
      </div>
    </div>
  );
}

const handConnectionsPath = handConnections
  .map(([from, to]) => `M ${handPoints[from][0]} ${handPoints[from][1]} L ${handPoints[to][0]} ${handPoints[to][1]}`)
  .join(" ");

// Two animated nodes (dots group + one combined line path) instead of one per point,
// which kept the scene smooth on slower classroom laptops.
function HandTrace({ delay = 0 }: { delay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg viewBox="0 0 455 377" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <motion.g
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5, duration: 0.6 }}
      >
        <path d={handConnectionsPath} stroke="#2dd4bf" strokeWidth={3} strokeLinecap="round" fill="none" />
      </motion.g>
      <motion.g
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay, duration: 0.5 }}
      >
        {handPoints.map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r={4} fill="#2563eb" stroke="#ffffff" strokeWidth={1.5} />
        ))}
      </motion.g>
    </svg>
  );
}

function SignScene() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="relative w-[280px] max-w-full rounded-[1.5rem] bg-white p-4 shadow-[0_24px_60px_rgba(37,99,235,0.16)] sm:w-[340px]"
        initial={reduceMotion ? false : { scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative aspect-[455/377] w-full">
          <Image src="/gesture-references/eat-food.png" alt="Reference sign for Eat" fill sizes="340px" className="object-contain" />
          <HandTrace delay={0.5} />
        </div>
      </motion.div>
      <motion.p
        className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-teal-700 shadow-sm"
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
      >
        <Hand className="h-3.5 w-3.5" aria-hidden="true" /> Fingers to mouth
      </motion.p>
    </div>
  );
}

function FeedbackScene() {
  const reduceMotion = useReducedMotion();
  const confidence = 92;
  const circumference = 2 * Math.PI * 26;

  return (
    <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
      <div className="relative aspect-[455/377] w-[210px] max-w-full overflow-hidden rounded-[1.25rem] bg-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.3)] sm:w-[340px]">
        <Image src="/gesture-references/eat-food.png" alt="" fill sizes="340px" className="object-contain opacity-80 invert" />
        <HandTrace delay={0.1} />
        {!reduceMotion ? (
          <motion.div
            className="absolute inset-x-0 h-12 bg-gradient-to-b from-transparent via-teal-300/25 to-transparent"
            style={{ top: 0 }}
            initial={{ y: "-100%" }}
            animate={{ y: "600%" }}
            transition={{ duration: 1.6, repeat: 1, ease: "easeInOut" }}
            aria-hidden="true"
          />
        ) : null}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Live
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 sm:items-start">
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16">
            <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#dbeafe" strokeWidth="7" />
              <motion.circle
                cx="32"
                cy="32"
                r="26"
                fill="none"
                stroke="#10b981"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: reduceMotion ? circumference * (1 - confidence / 100) : circumference }}
                animate={{ strokeDashoffset: circumference * (1 - confidence / 100) }}
                transition={{ delay: 0.6, duration: 1.6, ease: "easeOut" }}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-sm font-black text-ink">{confidence}%</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Detected</p>
            <p className="text-2xl font-black text-ink">Eat</p>
          </div>
        </div>
        <motion.div
          className="max-w-[16rem] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_30px_rgba(37,99,235,0.12)]"
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 2.2, duration: 0.4 }}
        >
          <span className="mb-1 flex items-center gap-1.5 text-xs font-bold text-blue-600">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Feedback
          </span>
          Great job! Keep your fingers close to your mouth.
        </motion.div>
        <motion.span
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 3, type: "spring", stiffness: 400, damping: 16 }}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Sign matched
        </motion.span>
      </div>
    </div>
  );
}

type TryStatus = "idle" | "loading" | "running" | "denied" | "error";

function TryScene() {
  const [status, setStatus] = useState<TryStatus>("idle");
  const [handCount, setHandCount] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
  }, []);

  // Camera and tracker are released whenever this scene unmounts (step change or close).
  useEffect(() => stop, [stop]);

  async function start() {
    setStatus("loading");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Video unavailable");
      video.srcObject = stream;
      await video.play();

      // Same local MediaPipe assets as Gesture Practice. Landmarks only, no recognition.
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks("/mediapipe/wasm");
      const landmarker = await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: "/models/hand_landmarker.task" },
        runningMode: "VIDEO",
        numHands: 2
      });
      if (!streamRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;

      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) throw new Error("Canvas unavailable");
      const drawing: DrawingUtils = new vision.DrawingUtils(context);
      let lastTime = -1;

      const loop = () => {
        if (!landmarkerRef.current || !videoRef.current) return;
        const currentVideo = videoRef.current;
        if (currentVideo.readyState >= 2 && currentVideo.currentTime !== lastTime) {
          lastTime = currentVideo.currentTime;
          canvas.width = currentVideo.videoWidth;
          canvas.height = currentVideo.videoHeight;
          const result = landmarkerRef.current.detectForVideo(currentVideo, performance.now());
          context.clearRect(0, 0, canvas.width, canvas.height);
          result.landmarks.forEach((landmarks) => {
            drawing.drawConnectors(landmarks, vision.HandLandmarker.HAND_CONNECTIONS, { color: "#2dd4bf", lineWidth: 5 });
            drawing.drawLandmarks(landmarks, { color: "#ffffff", fillColor: "#2563eb", lineWidth: 2, radius: 4 });
          });
          setHandCount(result.landmarks.length);
        }
        frameRef.current = requestAnimationFrame(loop);
      };

      setStatus("running");
      loop();
    } catch (error) {
      stop();
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setStatus(denied ? "denied" : "error");
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="relative aspect-[4/3] w-[300px] max-w-full overflow-hidden rounded-[1.25rem] bg-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.25)] sm:w-[380px]">
        <video ref={videoRef} className={cn("h-full w-full -scale-x-100 object-cover", status !== "running" && "opacity-0")} muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" aria-hidden="true" />

        {status !== "running" ? (
          <div className="absolute inset-0 grid place-items-center p-5 text-center">
            {status === "idle" || status === "loading" ? (
              <div className="flex flex-col items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-white">
                  <Camera className="h-7 w-7" aria-hidden="true" />
                </span>
                <Button type="button" onClick={start} disabled={status === "loading"}>
                  {status === "loading" ? "Starting camera..." : "Show your hand"}
                </Button>
                <p className="text-xs text-slate-300">Stays on this device. Nothing is saved.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-semibold text-white">
                  {status === "denied" ? "Camera access was blocked." : "The camera could not start."}
                </p>
                <Link href="/login" className="inline-flex">
                  <Button type="button" tabIndex={-1}>
                    Sign in to practice
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </div>
      {status === "running" ? (
        <p
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold shadow-sm",
            handCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-white/90 text-slate-600"
          )}
          aria-live="polite"
        >
          <Hand className="h-3.5 w-3.5" aria-hidden="true" />
          {handCount > 0 ? "Hand found" : "Raise your hand into view"}
        </p>
      ) : null}
    </div>
  );
}
