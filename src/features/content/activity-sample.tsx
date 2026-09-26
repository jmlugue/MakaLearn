"use client";

import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, MousePointerClick, Play, Pointer, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createActivityQuestions } from "@/lib/supabase/app-data";
import { activityTypeLabels } from "@/utils/activity-labels";
import { activityTypeDescriptions } from "@/features/activities/activity-helpers";
import { SymbolOption } from "@/features/activities/player/player-parts";
import { getActivityQuestionOptions, getDisplayLabel, shuffleOptions } from "@/features/activities/player/player-utils";
import { studentInstruction } from "@/features/activities/player/student-theme";
import type { Activity, ActivityQuestion, ActivityType, LearningItem } from "@/types";

type Phase = "idle" | "move" | "tap" | "done";

// Timing of one demo step, in milliseconds.
const MOVE_MS = 750;
const TAP_MS = 350;
const DONE_MS = 1400;
/** Drag and drop shows this many word boxes, like a small round of the real game. */
const DRAG_BOXES = 3;

/**
 * A small copy of the Student mode game, built from the chosen cards. It plays on hover: a pointer taps the
 * right picture (or drags each picture onto its word) and it turns green with "Correct!". "Try it yourself"
 * lets the teacher answer: one tap, or a drag in Drag and drop.
 */
export function ActivitySample({
  type,
  items,
  pool,
  canTry = true
}: {
  type: ActivityType;
  items: LearningItem[];
  pool: LearningItem[];
  /** False for admins, who watch the demo but do not play. */
  canTry?: boolean;
}) {
  const itemKey = items.map((item) => item.id).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only when the chosen cards or format change.
  const questions = useMemo(() => createActivityQuestions(type, items, pool), [type, itemKey]);
  const [mode, setMode] = useState<"demo" | "try">("demo");
  const demo = mode === "demo";

  if (!questions.length) return null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{activityTypeLabels[type]}</p>
          <p className="mt-0.5 text-sm text-slate-600">{activityTypeDescriptions[type]}</p>
        </div>
        {canTry ? (
        <button
          type="button"
          onClick={() => setMode(demo ? "try" : "demo")}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-white/90 px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-white"
        >
          {demo ? <MousePointerClick className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {demo ? "Try it yourself" : "Watch demo"}
        </button>
        ) : null}
      </div>

      {type === "drag-drop-symbol" ? (
        <DragSample key={mode} questions={questions} pool={pool} demo={demo} />
      ) : (
        <ChoiceSample key={mode} type={type} questions={questions} pool={pool} demo={demo} />
      )}
    </div>
  );
}

/** The frame both samples share: the Demo or Your turn tag, then the same blue instruction strip as Student mode. */
function Stage({
  type,
  demo,
  hovering,
  stageRef,
  onHover,
  aside,
  children
}: {
  type: ActivityType;
  demo: boolean;
  hovering: boolean;
  stageRef: RefObject<HTMLDivElement>;
  onHover: (hovering: boolean) => void;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      ref={stageRef}
      tabIndex={demo ? 0 : -1}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
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
        ) : (
          aside
        )}
      </div>
      <p className="mt-3 rounded-xl bg-blue-600 px-3 py-2 text-center text-sm font-black text-white">{studentInstruction(type)}</p>
      {children}
    </div>
  );
}

function useStagePoints(stageRef: RefObject<HTMLDivElement>) {
  return {
    pointFor(element: HTMLElement | null) {
      const stage = stageRef.current?.getBoundingClientRect();
      const box = element?.getBoundingClientRect();
      if (!stage || !box) return { x: 0, y: 0 };
      return { x: box.left - stage.left + box.width / 2, y: box.top - stage.top + box.height / 2 };
    },
    restPoint() {
      const stage = stageRef.current?.getBoundingClientRect();
      return stage ? { x: stage.width - 28, y: stage.height - 20 } : { x: 0, y: 0 };
    }
  };
}

function DemoPointer({ cursor, pressed, visible, slow }: { cursor: { x: number; y: number }; pressed: boolean; visible: boolean; slow: boolean }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return null;
  return (
    <motion.span
      className="pointer-events-none absolute left-0 top-0 z-20 text-blue-700 drop-shadow"
      initial={false}
      animate={{ x: cursor.x - 6, y: cursor.y - 2, scale: pressed ? 0.85 : 1, opacity: visible ? 1 : 0 }}
      transition={{ duration: slow ? 0.45 : MOVE_MS / 1000, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <Pointer className="h-7 w-7 fill-white" />
    </motion.span>
  );
}

/** Match, Choose the picture, Fill in the blank: one question, three picture cards, one tap. */
function ChoiceSample({ type, questions, pool, demo }: { type: ActivityType; questions: ActivityQuestion[]; pool: LearningItem[]; demo: boolean }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { pointFor, restPoint } = useStagePoints(stageRef);

  const question = questions[index % questions.length];
  // The same choices the real game builds (no look-alike wrong cards), three per question.
  const options = useMemo(() => {
    const activity = { type, questions } as Activity;
    const built = getActivityQuestionOptions(activity, question, pool, 11 + index);
    if (built.length <= 3) return built;
    return shuffleOptions([question.answer, ...built.filter((option) => option !== question.answer).slice(0, 2)], 5 + index);
  }, [index, pool, question, questions, type]);
  const correctIndex = options.indexOf(question.answer);

  useEffect(() => {
    if (!demo || !hovering) {
      setPhase("idle");
      setCursor(restPoint());
      return;
    }
    const timers: number[] = [];
    const schedule = (fn: () => void, delay: number) => timers.push(window.setTimeout(fn, delay));
    setPhase("move");
    setCursor(restPoint());
    schedule(() => setCursor(pointFor(optionRefs.current[correctIndex] ?? null)), 30);
    schedule(() => setPhase("tap"), reduceMotion ? 0 : MOVE_MS);
    schedule(() => setPhase("done"), reduceMotion ? 200 : MOVE_MS + TAP_MS);
    schedule(() => {
      if (questions.length > 1) setIndex((current) => current + 1);
      setRound((current) => current + 1);
    }, (reduceMotion ? 200 : MOVE_MS + TAP_MS) + DONE_MS);
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the loop restarts per question and hover state.
  }, [demo, hovering, round, correctIndex, reduceMotion]);

  const answered = demo ? phase === "done" : picked !== null;
  const right = demo || picked === question.answer;

  function state(option: string, position: number) {
    if (demo) {
      if (position !== correctIndex) return phase === "done" ? "faded" : "idle";
      return phase === "done" ? "correct" : phase === "tap" ? "pressed" : "idle";
    }
    if (picked === null) return "idle";
    if (option === question.answer) return "correct";
    return option === picked ? "wrong" : "faded";
  }

  return (
    <Stage
      type={type}
      demo={demo}
      hovering={hovering}
      stageRef={stageRef}
      onHover={setHovering}
      aside={
        questions.length > 1 || picked !== null ? (
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setIndex((current) => current + (picked !== null ? 1 : 0));
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-700"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {picked !== null ? "Next" : "Try another"}
          </button>
        ) : null
      }
    >
      <div className="mt-3 text-center">
        {type === "fill-blank" ? (
          <SampleSentence prompt={question.prompt} filled={answered ? getDisplayLabel(question.answer, pool) : ""} />
        ) : (
          <p className={cn("font-black text-ink", type === "match-word-symbol" ? "text-3xl" : "text-lg leading-snug")}>
            {type === "match-word-symbol" ? getDisplayLabel(question.answer, pool) : question.prompt}
          </p>
        )}
      </div>

      <div className="mx-auto mt-4 grid max-w-sm grid-cols-3 gap-3">
        {options.map((option, position) => {
          const tone = state(option, position);
          return (
            <motion.button
              key={`${question.id}-${option}`}
              ref={(element) => {
                optionRefs.current[position] = element;
              }}
              type="button"
              disabled={demo || picked !== null}
              onClick={() => setPicked(option)}
              animate={{ scale: tone === "pressed" && !reduceMotion ? 0.94 : tone === "correct" && !demo && !right && !reduceMotion ? [1, 1.08, 1.04] : 1 }}
              className={cn(
                "relative grid aspect-[3/4] place-items-center rounded-xl border-[3px] bg-[#fff] p-1.5 transition-colors disabled:cursor-default",
                tone === "correct" && "border-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]",
                tone === "wrong" && "border-rose-500",
                tone === "pressed" && "border-blue-500",
                tone === "faded" && "border-blue-50 opacity-50",
                tone === "idle" && "border-blue-100 hover:border-blue-300"
              )}
            >
              <Option value={option} learningItems={pool} />
              {tone === "correct" ? <Badge tone="correct" /> : null}
              {tone === "wrong" ? <Badge tone="wrong" /> : null}
            </motion.button>
          );
        })}
      </div>

      <Feedback show={answered} right={right} />
      {demo ? <DemoPointer cursor={cursor} pressed={phase === "tap"} visible={hovering} slow={false} /> : null}
    </Stage>
  );
}

/** Drag and drop: word boxes on top, their pictures in a tray below. */
function DragSample({ questions, pool, demo }: { questions: ActivityQuestion[]; pool: LearningItem[]; demo: boolean }) {
  const reduceMotion = useReducedMotion();
  const boxes = useMemo(() => questions.slice(0, DRAG_BOXES), [questions]);
  const tray = useMemo(() => shuffleOptions(boxes.map((box) => box.answer), 7), [boxes]);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [missed, setMissed] = useState("");
  const [hovering, setHovering] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const boxRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { pointFor, restPoint } = useStagePoints(stageRef);

  // Demo: drag each picture onto its word, one after another, then start over.
  useEffect(() => {
    if (!demo || !hovering) {
      setPhase("idle");
      setPlaced({});
      setStep(0);
      setCursor(restPoint());
      return;
    }
    const box = boxes[step % boxes.length];
    const timers: number[] = [];
    const schedule = (fn: () => void, delay: number) => timers.push(window.setTimeout(fn, delay));
    if (step > 0 && step % boxes.length === 0) setPlaced({});
    setPhase("move");
    schedule(() => setCursor(pointFor(cardRefs.current[box.answer] ?? null)), 30);
    schedule(() => {
      setPhase("tap");
      setCursor(pointFor(boxRefs.current[box.id] ?? null));
    }, reduceMotion ? 0 : MOVE_MS);
    schedule(() => {
      setPhase("done");
      setPlaced((current) => ({ ...current, [box.id]: box.answer }));
    }, reduceMotion ? 200 : MOVE_MS + 450);
    schedule(() => setStep((current) => current + 1), (reduceMotion ? 200 : MOVE_MS + 450) + (step % boxes.length === boxes.length - 1 ? DONE_MS : 700));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one step per timer run.
  }, [demo, hovering, step, reduceMotion]);

  function drop(boxId: string) {
    const box = boxes.find((candidate) => candidate.id === boxId);
    if (!box || !dragging || placed[boxId]) return;
    if (dragging === box.answer) {
      setPlaced((current) => ({ ...current, [boxId]: dragging }));
      setMissed("");
    } else {
      setMissed(boxId);
    }
    setDragging("");
  }

  const allPlaced = boxes.every((box) => placed[box.id]);
  const inTray = tray.filter((card) => !Object.values(placed).includes(card));

  return (
    <Stage
      type="drag-drop-symbol"
      demo={demo}
      hovering={hovering}
      stageRef={stageRef}
      onHover={setHovering}
      aside={
        Object.keys(placed).length ? (
          <button type="button" onClick={() => setPlaced({})} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-700">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Start over
          </button>
        ) : null
      }
    >
      <div className="mt-3 grid grid-cols-3 gap-2">
        {boxes.map((box) => {
          const card = placed[box.id];
          return (
            <motion.div
              key={box.id}
              ref={(element) => {
                boxRefs.current[box.id] = element;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => drop(box.id)}
              animate={missed === box.id && !reduceMotion ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.35 }}
              className={cn(
                "grid gap-1.5 rounded-xl border-2 bg-[#fff] p-1.5 text-center",
                card ? "border-emerald-400 bg-emerald-50" : "border-blue-100"
              )}
            >
              <span className="text-sm font-black uppercase text-ink">{box.prompt}</span>
              <div className="relative mx-auto grid aspect-[3/4] w-full max-w-[5rem] place-items-center rounded-lg border-2 border-dashed border-blue-200">
                {card ? (
                  <>
                    <Option value={card} learningItems={pool} />
                    <Badge tone="correct" />
                  </>
                ) : (
                  <span className="text-[10px] font-bold text-blue-400">Drop here</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 grid min-h-[6.5rem] grid-cols-3 gap-2 rounded-xl border-2 border-dashed border-blue-100 p-2">
        {inTray.map((card) => (
          <div
            key={card}
            ref={(element) => {
              cardRefs.current[card] = element;
            }}
            draggable={!demo}
            onDragStart={() => setDragging(card)}
            onDragEnd={() => setDragging("")}
            className={cn(
              "mx-auto grid aspect-[3/4] w-full max-w-[5rem] place-items-center rounded-lg border-[3px] bg-[#fff] p-1",
              demo && phase === "tap" && boxes[step % boxes.length]?.answer === card && !reduceMotion ? "border-blue-100 opacity-0" : "border-blue-100",
              !demo && "cursor-grab active:cursor-grabbing"
            )}
            aria-label={`${getDisplayLabel(card, pool)} card`}
          >
            <Option value={card} learningItems={pool} />
          </div>
        ))}
      </div>

      {demo && phase === "tap" && !reduceMotion ? (
        // The picture rides along with the pointer from the tray to its word.
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-10 grid aspect-[3/4] w-14 place-items-center rounded-lg border-[3px] border-blue-500 bg-[#fff] p-1 shadow-lg"
          initial={{ x: pointFor(cardRefs.current[boxes[step % boxes.length].answer] ?? null).x - 28, y: pointFor(cardRefs.current[boxes[step % boxes.length].answer] ?? null).y - 36 }}
          animate={{ x: cursor.x - 28, y: cursor.y - 36 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          aria-hidden="true"
        >
          <Option value={boxes[step % boxes.length].answer} learningItems={pool} />
        </motion.div>
      ) : null}
      <Feedback show={demo ? phase === "done" : allPlaced || Boolean(missed)} right={demo || !missed} tryAgain />
      {demo ? <DemoPointer cursor={cursor} pressed={phase === "tap"} visible={hovering} slow={phase === "tap"} /> : null}
    </Stage>
  );
}

function SampleSentence({ prompt, filled }: { prompt: string; filled: string }) {
  const [before, after] = prompt.split("____");
  if (after === undefined) return <p className="text-lg font-black leading-snug text-ink">{prompt}</p>;
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-lg font-black leading-snug text-ink">
      <span>{before.trim()}</span>
      <span className={cn("inline-grid min-h-8 min-w-20 place-items-center rounded-lg border-2 border-dashed px-2", filled ? "border-emerald-400 text-emerald-700" : "border-blue-300")}>
        {filled}
      </span>
      {after.trim() ? <span>{after.trim()}</span> : null}
    </p>
  );
}

function Feedback({ show, right, tryAgain = false }: { show: boolean; right: boolean; tryAgain?: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="mt-3 flex min-h-8 justify-center">
      {show ? (
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black text-white",
            right ? "bg-emerald-500" : "bg-rose-500"
          )}
          role="status"
        >
          {right ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />}
          {right ? "Correct!" : tryAgain ? "Try again" : "Not this one"}
        </motion.p>
      ) : null}
    </div>
  );
}

function Badge({ tone }: { tone: "correct" | "wrong" }) {
  return (
    <span
      className={cn(
        "absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white text-white",
        tone === "correct" ? "bg-emerald-500" : "bg-rose-500"
      )}
      aria-hidden="true"
    >
      {tone === "correct" ? <Check className="h-3.5 w-3.5" strokeWidth={3.5} /> : <X className="h-3.5 w-3.5" strokeWidth={3.5} />}
    </span>
  );
}

function Option({ value, learningItems }: { value: string; learningItems: LearningItem[] }) {
  return <SymbolOption value={value} learningItems={learningItems} framed={false} preferNoTextPecs className="!h-full max-h-full w-full" />;
}
