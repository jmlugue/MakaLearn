"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, MousePointerClick, Play, Pointer, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { createActivityQuestions } from "@/lib/supabase/app-data";
import { activityTypeShortLabels } from "@/utils/activity-labels";
import { SymbolOption } from "@/features/activities/player/player-parts";
import type { ActivityType, LearningItem } from "@/types";

const explanations: Partial<Record<ActivityType, string>> = {
  "match-word-symbol": "Learners read the word and tap the card that matches.",
  "choose-correct-symbol": "Learners read the prompt and choose the right card.",
  "fill-blank": "Learners pick the word that completes the sentence.",
  "drag-drop-symbol": "Learners drag each card onto its word."
};

type Phase = "idle" | "move" | "tap" | "done";

// Timing of one demo round, in milliseconds.
const MOVE_MS = 750;
const TAP_MS = 350;
const DONE_MS = 1400;

/**
 * Sample of a PECS activity built from the lesson's own cards.
 * Demo mode plays on hover: a cursor moves to the right answer (or drags the card onto the word) and it turns green.
 * "Try it yourself" switches to answering by click.
 */
export function ActivitySample({ type, items, pool }: { type: ActivityType; items: LearningItem[]; pool: LearningItem[] }) {
  const reduceMotion = useReducedMotion();
  const itemKey = items.map((item) => item.id).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when the chosen cards or format change.
  const questions = useMemo(() => createActivityQuestions(type, items, pool), [type, itemKey]);
  const [mode, setMode] = useState<"demo" | "try">("demo");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  // Bumps every demo round so a lesson with a single card still loops.
  const [round, setRound] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });

  const stageRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const targetRef = useRef<HTMLDivElement>(null);

  const question = questions[index % Math.max(questions.length, 1)];
  const isFillBlank = type === "fill-blank";
  const isDragDrop = type === "drag-drop-symbol";
  const correctIndex = question ? question.options.indexOf(question.answer) : -1;

  function pointFor(element: HTMLElement | null) {
    const stage = stageRef.current?.getBoundingClientRect();
    const box = element?.getBoundingClientRect();
    if (!stage || !box) return { x: 0, y: 0 };
    return { x: box.left - stage.left + box.width / 2, y: box.top - stage.top + box.height / 2 };
  }

  function restPoint() {
    const stage = stageRef.current?.getBoundingClientRect();
    return stage ? { x: stage.width - 28, y: stage.height - 20 } : { x: 0, y: 0 };
  }

  // Demo loop while hovered.
  useEffect(() => {
    if (mode !== "demo" || !hovering || !question) {
      setPhase("idle");
      setCursor(restPoint());
      return;
    }

    const timers: number[] = [];
    const schedule = (fn: () => void, delay: number) => timers.push(window.setTimeout(fn, delay));

    setPhase("move");
    // Start from the resting corner, then glide to the right answer on the next tick.
    setCursor(restPoint());
    schedule(() => setCursor(pointFor(optionRefs.current[correctIndex] ?? null)), 30);
    schedule(() => {
      setPhase("tap");
      if (isDragDrop) setCursor(pointFor(targetRef.current));
    }, reduceMotion ? 0 : MOVE_MS);
    schedule(() => setPhase("done"), reduceMotion ? 200 : MOVE_MS + TAP_MS + (isDragDrop ? 450 : 0));
    schedule(
      () => {
        if (questions.length > 1) setIndex((current) => current + 1);
        setRound((current) => current + 1);
      },
      (reduceMotion ? 200 : MOVE_MS + TAP_MS + (isDragDrop ? 450 : 0)) + DONE_MS
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the loop restarts per question and hover state.
  }, [mode, hovering, round, correctIndex, isDragDrop, reduceMotion]);

  if (!question) return null;

  const demo = mode === "demo";
  const showCorrect = demo && phase === "done";
  const tryCorrect = !demo && picked !== null && picked === question.answer;
  const placed = isDragDrop ? (demo ? (phase === "tap" || phase === "done" ? question.answer : null) : picked) : null;

  function optionState(option: string, position: number) {
    if (demo) {
      if (position !== correctIndex) return "idle";
      if (phase === "done") return "correct";
      if (phase === "tap") return "pressed";
      return "idle";
    }
    if (picked !== option) return "idle";
    return option === question.answer ? "correct" : "wrong";
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{activityTypeShortLabels[type]}</p>
          <p className="mt-0.5 text-sm text-slate-600">{explanations[type]}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPicked(null);
            setMode(demo ? "try" : "demo");
          }}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-white/90 px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-white"
        >
          {demo ? <MousePointerClick className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {demo ? "Try it yourself" : "Watch demo"}
        </button>
      </div>

      <div
        ref={stageRef}
        tabIndex={demo ? 0 : -1}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setHovering(true)}
        onBlur={() => setHovering(false)}
        aria-label={demo ? "Activity demo. Hover or focus to play." : "Activity sample"}
        className={cn(
          "relative mt-3 overflow-hidden rounded-2xl border bg-white/90 p-4 shadow-[0_10px_30px_rgba(37,99,235,0.08)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
          demo && hovering ? "border-blue-300" : "border-blue-100"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">{demo ? "Demo" : "Your turn"}</span>
          {demo ? (
            <span className={cn("text-xs font-semibold transition", hovering ? "text-blue-700" : "text-slate-400")}>
              {hovering ? "Playing" : "Hover to play"}
            </span>
          ) : questions.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                setPicked(null);
                setIndex((current) => current + 1);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-700"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Try another
            </button>
          ) : null}
        </div>

        {isDragDrop ? (
          <div className="mt-3 flex justify-center">
            <div
              ref={targetRef}
              className={cn(
                "grid min-h-24 w-40 place-items-center rounded-2xl border-2 border-dashed p-2 text-center transition",
                placed === null
                  ? "border-blue-200 bg-blue-50/50"
                  : showCorrect || (!demo && placed === question.answer)
                    ? "border-emerald-400 bg-emerald-50"
                    : !demo
                      ? "border-amber-400 bg-amber-50"
                      : "border-blue-400 bg-blue-50"
              )}
            >
              {placed ? (
                <motion.div layoutId={`sample-card-${question.id}-${question.options.indexOf(placed)}`} className="w-16" transition={{ duration: reduceMotion ? 0 : 0.45 }}>
                  <Option value={placed} learningItems={pool} small />
                </motion.div>
              ) : (
                <span className="text-lg font-black text-ink">{question.prompt}</span>
              )}
            </div>
          </div>
        ) : (
          <p className={cn("mt-3 text-center font-black text-ink", type === "match-word-symbol" ? "text-3xl" : "text-lg")}>{question.prompt}</p>
        )}

        <div className={cn("mt-4 grid gap-2", isFillBlank ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-3")}>
          {question.options.map((option, position) => {
            const state = optionState(option, position);
            const hideForDrag = isDragDrop && placed === option;
            return (
              <motion.button
                key={`${question.id}-${option}`}
                ref={(element) => {
                  optionRefs.current[position] = element;
                }}
                type="button"
                disabled={demo}
                onClick={() => setPicked(option)}
                animate={{ scale: state === "pressed" && !reduceMotion ? 0.94 : 1 }}
                className={cn(
                  "grid place-items-center rounded-xl border-2 bg-[#fff] p-2 transition-colors disabled:cursor-default",
                  isFillBlank ? "min-h-11" : "aspect-square",
                  state === "correct" && "border-emerald-400 bg-emerald-50 shadow-[0_0_0_4px_rgba(52,211,153,0.2)]",
                  state === "wrong" && "border-amber-400 bg-amber-50",
                  state === "pressed" && "border-blue-400 bg-blue-50",
                  state === "idle" && "border-blue-100 hover:border-blue-300"
                )}
              >
                {hideForDrag ? (
                  <span className="h-full w-full rounded-lg border-2 border-dashed border-blue-100" aria-hidden="true" />
                ) : (
                  <motion.div layoutId={isDragDrop ? `sample-card-${question.id}-${position}` : undefined} className="grid h-full w-full place-items-center">
                    <Option value={option} learningItems={pool} />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="mt-3 min-h-6">
          {showCorrect || tryCorrect ? (
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"
              role="status"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Correct!
            </motion.p>
          ) : !demo && picked !== null ? (
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700" role="status">
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Try again
            </p>
          ) : null}
        </div>

        {demo && !reduceMotion ? (
          <motion.span
            className="pointer-events-none absolute left-0 top-0 z-10 text-blue-700 drop-shadow"
            initial={false}
            animate={{ x: cursor.x - 6, y: cursor.y - 2, scale: phase === "tap" ? 0.85 : 1, opacity: hovering ? 1 : 0 }}
            transition={{ duration: phase === "tap" && isDragDrop ? 0.45 : MOVE_MS / 1000, ease: "easeInOut" }}
            aria-hidden="true"
          >
            <Pointer className="h-7 w-7 fill-white" />
          </motion.span>
        ) : null}
      </div>
    </div>
  );
}

function Option({ value, learningItems, small }: { value: string; learningItems: LearningItem[]; small?: boolean }) {
  return (
    <SymbolOption
      value={value}
      learningItems={learningItems}
      framed={false}
      preferNoTextPecs
      className={cn("w-full", small ? "!h-16" : "!h-24")}
    />
  );
}
