"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Hand, Play, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { activityTypeIcons } from "@/features/activities/activity-type-badge";
import { activityTypeTones } from "@/features/activities/activity-helpers";
import { activityTypeShortLabels } from "@/utils/activity-labels";
import { studentButton } from "@/features/activities/player/student-theme";
import type { ActivityType } from "@/types";

const hiddenIntroKey = "makalearn.studentIntroHidden";

/** Activities whose How to play card was turned off with "Don't show this again" (this browser only). */
export function isIntroHidden(activityId: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(hiddenIntroKey) ?? "[]");
    return Array.isArray(stored) && stored.includes(activityId);
  } catch {
    return false;
  }
}

function hideIntro(activityId: string) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(hiddenIntroKey) ?? "[]");
    const ids: string[] = Array.isArray(stored) ? stored : [];
    if (!ids.includes(activityId)) window.localStorage.setItem(hiddenIntroKey, JSON.stringify([...ids, activityId]));
  } catch {
    // Storage blocked: the card simply shows again next time.
  }
}

/** "How to play": shown before the first question, read aloud. Can be turned off per activity. */
export function StudentIntroCard({
  activityId,
  type,
  instruction,
  isListening,
  onListen,
  onStart
}: {
  activityId: string;
  type: ActivityType;
  instruction: string;
  isListening: boolean;
  onListen: () => void;
  onStart: () => void;
}) {
  const [dontShow, setDontShow] = useState(false);
  const Icon = activityTypeIcons[type];

  function start() {
    if (dontShow) hideIntro(activityId);
    onStart();
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-sky-950/25 px-4 py-6 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-intro-title"
        className="grid w-full max-w-lg gap-5 rounded-[2rem] border-4 border-white bg-[#fff] px-5 py-6 text-center shadow-[0_24px_70px_rgba(37,99,235,0.25)] sm:px-8 sm:py-7"
      >
        <span className={cn("mx-auto inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-base font-black", activityTypeTones[type].badge)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
          {activityTypeShortLabels[type]}
        </span>

        <div className="grid h-44 place-items-center rounded-[1.5rem] border-2 border-sky-100 bg-sky-50/80">
          <IntroDemo drag={type === "drag-drop-symbol"} />
        </div>

        <div className="grid gap-1 rounded-[1.5rem] border-2 border-blue-200 bg-blue-600 px-4 py-4 text-white shadow-[0_6px_0_rgba(30,64,175,0.3)]">
          <span className="text-sm font-black uppercase tracking-wide text-blue-100">How to play</span>
          <p id="student-intro-title" className="text-2xl font-black leading-tight sm:text-3xl">{instruction}</p>
        </div>

        <div className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button type="button" className={cn(studentButton.base, studentButton.secondary)} onClick={onListen} disabled={isListening}>
              <Volume2 className="h-6 w-6" aria-hidden="true" />
              {isListening ? "Listening" : "Listen"}
            </button>
            <button type="button" className={cn(studentButton.base, studentButton.primary, "sm:min-w-44")} onClick={start} autoFocus>
              <Play className="h-6 w-6 fill-white" aria-hidden="true" />
              Start
            </button>
          </div>
          <label className="mx-auto inline-flex min-h-11 cursor-pointer items-center gap-3 text-base font-bold text-slate-600">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(event) => setDontShow(event.target.checked)}
              className="h-6 w-6 cursor-pointer rounded-md border-2 border-blue-300 accent-blue-600"
            />
            Don&apos;t show this again
          </label>
        </div>
      </div>
    </div>
  );
}

/** A small looping picture of the move: a hand taps a card, or drags a card into a box. */
function IntroDemo({ drag }: { drag: boolean }) {
  const reduceMotion = useReducedMotion();
  const loop = { duration: 2.4, repeat: Infinity, repeatDelay: 0.6, ease: "easeInOut" as const };

  if (drag) {
    return (
      <div className="relative h-40 w-56" aria-hidden="true">
        <div className="absolute left-1/2 top-0 grid h-20 w-16 -translate-x-1/2 place-items-center rounded-xl border-4 border-dashed border-blue-300 bg-sky-50" />
        <motion.div
          className="absolute left-[4.5rem] top-[5.25rem] h-16 w-12 rounded-xl border-4 border-white bg-blue-200 shadow-md"
          animate={reduceMotion ? { x: 16, y: -78 } : { x: [0, 0, 16, 16], y: [0, 0, -78, -78] }}
          transition={reduceMotion ? { duration: 0 } : { ...loop, times: [0, 0.2, 0.7, 1] }}
        >
          <motion.span
            className="absolute -bottom-6 -right-5 text-blue-700"
            animate={reduceMotion ? {} : { scale: [1, 0.85, 0.85, 1] }}
            transition={reduceMotion ? { duration: 0 } : { ...loop, times: [0, 0.2, 0.7, 1] }}
          >
            <Hand className="h-9 w-9 fill-white" />
          </motion.span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex h-32 items-end justify-center gap-3 pb-6" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn("relative h-20 w-14 rounded-xl border-4 bg-blue-100 shadow-md", index === 1 ? "border-white" : "border-white opacity-70")}
          animate={index === 1 && !reduceMotion ? { borderColor: ["#ffffff", "#ffffff", "#10b981", "#10b981"] } : undefined}
          transition={index === 1 && !reduceMotion ? { ...loop, times: [0, 0.45, 0.5, 1] } : undefined}
          style={index === 1 && reduceMotion ? { borderColor: "#10b981" } : undefined}
        >
          {index === 1 ? (
            <motion.span
              className="absolute -right-3 -top-3 grid h-7 w-7 place-items-center rounded-full bg-emerald-500 text-white"
              animate={reduceMotion ? { opacity: 1 } : { opacity: [0, 0, 1, 1], scale: [0.5, 0.5, 1, 1] }}
              transition={reduceMotion ? { duration: 0 } : { ...loop, times: [0, 0.48, 0.55, 1] }}
            >
              <Check className="h-4 w-4" strokeWidth={3.5} />
            </motion.span>
          ) : null}
        </motion.div>
      ))}
      <motion.span
        className="absolute bottom-0 left-1/2 text-blue-700"
        animate={reduceMotion ? { x: -6, y: -20 } : { x: [40, -6, -6, 40], y: [10, -20, -20, 10], scale: [1, 1, 0.85, 1] }}
        transition={reduceMotion ? { duration: 0 } : { ...loop, times: [0, 0.4, 0.5, 1] }}
      >
        <Hand className="h-10 w-10 fill-white" />
      </motion.span>
    </div>
  );
}
