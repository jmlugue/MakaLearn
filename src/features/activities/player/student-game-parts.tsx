"use client";

import { type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Home, Lightbulb, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActivityBackground } from "@/features/activities/player/player-utils";
import { SymbolOption } from "@/features/activities/player/player-parts";
import { studentButton, studentCard, studentText } from "@/features/activities/player/student-theme";
import type { LearningItem } from "@/types";

const ease = [0.22, 1, 0.36, 1] as const;

export type StepState = "todo" | "current" | "correct" | "wrong";

/**
 * Every Student mode game: background, top bar, the instruction line, then the game itself. Overlays
 * (feedback, intro, score) go in `overlay`.
 */
export function StudentGameFrame({
  activityId,
  topBar,
  instruction,
  children,
  overlay
}: {
  activityId: string;
  topBar: ReactNode;
  instruction: string;
  children: ReactNode;
  overlay?: ReactNode;
}) {
  return (
    <section
      className="fixed inset-0 z-40 grid h-[100dvh] w-screen overflow-hidden bg-[#dff5ff] p-2 sm:p-3 lg:p-4"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1)), url('${getActivityBackground(activityId)}')`,
        backgroundPosition: "center",
        backgroundSize: "cover"
      }}
    >
      <div className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-2 rounded-[2rem] border border-white/80 bg-white/30 p-2 shadow-[0_18px_58px_rgba(37,99,235,0.12)] backdrop-blur-[2px] sm:gap-3 sm:p-3">
        {topBar}
        <p className="mx-auto w-full max-w-4xl rounded-2xl border-2 border-blue-100 bg-white/95 px-4 py-2 text-center shadow-sm sm:py-3" role="status">
          <span className={studentText.instruction}>{instruction}</span>
        </p>
        <div className="min-h-0">{children}</div>
      </div>
      {overlay}
    </section>
  );
}

/** Home on the left (after the student menu logo), progress in the middle, Hint and Listen on the right. */
export function StudentTopBar({
  steps,
  onHome,
  onHint,
  hint,
  onListen,
  isListening
}: {
  steps: StepState[];
  onHome: () => void;
  onHint: () => void;
  /** "used": only two cards are left, so another hint would give the answer away. "off": not now. */
  hint: "ready" | "off" | "used";
  onListen: () => void;
  isListening: boolean;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 pl-[3.75rem] sm:gap-3 sm:pl-16">
      <button type="button" className={cn(studentButton.base, studentButton.secondary)} onClick={onHome} aria-label="All activities">
        <Home className="h-6 w-6" aria-hidden="true" />
        <span className="hidden sm:inline">Activities</span>
      </button>
      <div className="order-last flex w-full justify-center lg:order-none lg:w-auto">
        <StudentProgressDots steps={steps} />
      </div>
      <div className="flex gap-2 sm:gap-3">
        <button
          type="button"
          className={cn(studentButton.base, studentButton.hint)}
          onClick={onHint}
          disabled={hint !== "ready"}
          aria-label={hint === "used" ? "No more hints" : "Hint"}
        >
          <Lightbulb className="h-6 w-6" aria-hidden="true" />
          <span className="hidden sm:inline">Hint</span>
        </button>
        <button
          type="button"
          className={cn(studentButton.base, studentButton.secondary)}
          onClick={onListen}
          disabled={isListening}
          aria-label="Listen"
        >
          <Volume2 className="h-6 w-6" aria-hidden="true" />
          <span className="hidden sm:inline">{isListening ? "Listening" : "Listen"}</span>
        </button>
      </div>
    </header>
  );
}

/** One circle per question: green tick, red cross, blue for the current one. */
export function StudentProgressDots({ steps }: { steps: StepState[] }) {
  const done = steps.filter((step) => step === "correct" || step === "wrong").length;
  return (
    <ol className="flex items-center gap-1.5 rounded-full border-2 border-blue-100 bg-white/95 px-2 py-1.5 shadow-sm sm:gap-2 sm:px-3" aria-label={`${done} of ${steps.length} done`}>
      {steps.map((step, index) => (
        <li
          key={index}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-black sm:h-10 sm:w-10 sm:text-base",
            step === "correct" && "border-emerald-500 bg-emerald-500 text-white",
            step === "wrong" && "border-rose-500 bg-rose-500 text-white",
            step === "current" && "border-blue-600 bg-blue-600 text-white ring-4 ring-blue-100",
            step === "todo" && "border-blue-200 bg-[#fff] text-blue-700"
          )}
        >
          {step === "correct" ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> : null}
          {step === "wrong" ? <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> : null}
          {step === "current" || step === "todo" ? index + 1 : null}
          <span className="sr-only">{step === "correct" ? "correct" : step === "wrong" ? "not right" : ""}</span>
        </li>
      ))}
    </ol>
  );
}

/** A picture card, no word on it. The same size and shape in every game. */
export function StudentPictureCard({
  value,
  learningItems,
  className,
  children
}: {
  value: string;
  learningItems: LearningItem[];
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span className={cn(studentCard, "border-white", className)}>
      <span className="relative grid h-full min-h-0 place-items-center overflow-hidden">
        <SymbolOption value={value} learningItems={learningItems} framed={false} preferNoTextPecs className="!h-full max-h-full" />
      </span>
      {children}
    </span>
  );
}

/** Tick or cross in the corner of a card. */
export function StudentResultBadge({ tone }: { tone: "correct" | "wrong" }) {
  return (
    <span
      className={cn(
        "absolute right-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-full border-4 border-white text-white shadow-md sm:h-12 sm:w-12",
        tone === "correct" ? "bg-emerald-500" : "bg-rose-500"
      )}
      aria-hidden="true"
    >
      {tone === "correct" ? <Check className="h-6 w-6" strokeWidth={3.5} /> : <X className="h-6 w-6" strokeWidth={3.5} />}
    </span>
  );
}

export type AnswerFeedback = {
  tone: "correct" | "wrong";
  title: string;
  /** On a wrong answer, the right card, shown so the child sees what it was. */
  rightValue?: string;
  key: number;
};

/**
 * The big Correct or Not this one pop-up after an answer. It never blocks taps for long: it closes by itself.
 * `passThrough` lets a drag continue under it.
 */
export function AnswerFeedbackPopup({
  feedback,
  learningItems,
  passThrough = false
}: {
  feedback: AnswerFeedback | null;
  learningItems: LearningItem[];
  passThrough?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence>
      {feedback ? (
        <motion.div
          key={feedback.key}
          className={cn("fixed inset-0 z-[70] grid place-items-center bg-sky-950/15 px-4", passThrough && "pointer-events-none bg-transparent")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="alert"
        >
          <motion.div
            className={cn(
              "grid w-full max-w-md justify-items-center gap-3 rounded-[2rem] border-4 bg-[#fff] px-6 py-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.25)]",
              feedback.tone === "correct" ? "border-emerald-300" : "border-rose-300"
            )}
            initial={reduceMotion ? false : { scale: 0.7, y: 20 }}
            animate={reduceMotion ? {} : feedback.tone === "correct" ? { scale: 1, y: 0 } : { scale: 1, y: 0, x: [0, -12, 12, -8, 8, 0] }}
            transition={{ duration: 0.4, ease }}
          >
            <span
              className={cn(
                "grid h-20 w-20 place-items-center rounded-full text-white shadow-[inset_0_-6px_0_rgba(15,23,42,0.12)] sm:h-24 sm:w-24",
                feedback.tone === "correct" ? "bg-emerald-500" : "bg-rose-500"
              )}
              aria-hidden="true"
            >
              {feedback.tone === "correct" ? <Check className="h-12 w-12" strokeWidth={3.5} /> : <X className="h-12 w-12" strokeWidth={3.5} />}
            </span>
            <p className={cn(studentText.popupTitle, feedback.tone === "correct" ? "text-emerald-600" : "text-rose-600")}>{feedback.title}</p>
            {feedback.rightValue ? (
              <div className="grid justify-items-center gap-2">
                <span className="text-lg font-black text-[#10285e]">The right one is</span>
                <StudentPictureCard value={feedback.rightValue} learningItems={learningItems} className="w-28 border-emerald-400 sm:w-32">
                  <StudentResultBadge tone="correct" />
                </StudentPictureCard>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
