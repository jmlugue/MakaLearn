"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, Library, RotateCcw, Volume2, X, XCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/features/content/content-shared";
import {
  type ActivityScore,
  getActivityQuestionOptions,
  getDisplayLabel,
  getQuestionListenText,
  getQuestionTitle,
  shuffleOptions,
  speakText
} from "@/features/activities/player/player-utils";
import { SymbolOption } from "@/features/activities/player/player-parts";
import { activityInstruction } from "@/features/activities/activity-helpers";
import { FEEDBACK_MS, MAX_TRIES, WRONG_MS } from "@/features/activities/player/student-theme";
import { playCue } from "@/lib/sound-cues";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

type TeacherPlayerProps = {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  result: ActivityScore | null;
  dragged: string;
  setDragged: (value: string) => void;
  chooseAnswer: (questionId: string, value: string) => void;
  /** Works out the score to show. Nothing is saved. */
  onScore: (questionIds?: string[]) => void;
  onRestart: () => void;
  onExit: () => void;
  /** Reports progress to the top bar. */
  onProgress: (current: number, total: number) => void;
};

/** Blue glass panel used across the player. Plain app blue (#2563eb), no sky tints. */
const panelClass =
  "relative overflow-hidden rounded-3xl border border-white/90 bg-gradient-to-br from-white to-blue-50/60 shadow-[0_18px_40px_rgba(37,99,235,0.1)]";

/** Pause on the last answer before the score opens by itself. */
const SCORE_DELAY_MS = 1200;
/** How long a right answer stays on screen before the next question (a little quicker than Student mode). */
const RIGHT_MS = Math.min(FEEDBACK_MS, 1200);
/** Saved as the answer of a Drag and drop box whose tries ran out, so it scores as wrong. */
const MISSED = "__missed__";

/**
 * The teacher's player: plain blue glass look, same rules as Student mode.
 * - Match and Fill in the blank: three guesses. A wrong pick buzzes, shakes, and flashes red. Right on any try turns
 *   green and counts. The third wrong pick turns red and the right card green. Then the next question comes by itself.
 * - Drag and drop: a card only stays on its own word, three tries per card. A wrong drop buzzes, shakes, and the
 *   card goes back. After its third, the card is shown on its own word in red and that word counts as wrong.
 * The score pop-up opens by itself at the end.
 */
export function TeacherPlayer(props: TeacherPlayerProps) {
  if (props.activity.type === "drag-drop-symbol") return <DragDropBoard {...props} />;
  return <ChoiceSteps {...props} />;
}

function ChoiceSteps({ activity, learningItems, answers, result, chooseAnswer, onScore, onRestart, onExit, onProgress }: TeacherPlayerProps) {
  const questions = activity.questions;
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [optionShuffleSeed] = useState(() => Math.random());
  /** Wrong picks so far per question. A wrong card flashes red and can be tapped again. */
  const [struck, setStruck] = useState<Record<string, string[]>>({});
  const [flash, setFlash] = useState("");
  const question = questions[Math.min(index, Math.max(questions.length - 1, 0))];
  const options = useMemo(
    () => question ? getActivityQuestionOptions(activity, question, learningItems, optionShuffleSeed) : [],
    [activity, learningItems, optionShuffleSeed, question]
  );
  const selected = question ? answers[question.id] : undefined;
  const answered = Boolean(selected);
  const answeredCount = questions.filter((candidate) => answers[candidate.id]).length;

  useEffect(() => {
    onProgress(answeredCount, questions.length);
  }, [answeredCount, onProgress, questions.length]);

  // A ref keeps the latest onScore, and the timer is cleared if the player closes.
  const scoreRef = useRef(onScore);
  useEffect(() => {
    scoreRef.current = onScore;
  });
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  if (!question) return <EmptyNote />;

  function pick(option: string) {
    if (!question || answers[question.id] || result) return;
    const right = option === question.answer;
    const wrongSoFar = struck[question.id] ?? [];
    if (!right) {
      playCue("wrong");
      setShakeKey((current) => current + 1);
      if (wrongSoFar.length + 1 < MAX_TRIES) {
        setStruck((current) => ({ ...current, [question.id]: [...wrongSoFar, option] }));
        setFlash(option);
        window.setTimeout(() => setFlash((current) => (current === option ? "" : current)), 700);
        return;
      }
    } else {
      playCue("correct");
    }
    chooseAnswer(question.id, option);
    const lastQuestion = index >= questions.length - 1;
    timerRef.current = window.setTimeout(() => {
      if (lastQuestion) scoreRef.current();
      else setIndex((current) => current + 1);
    }, right ? RIGHT_MS : WRONG_MS);
  }

  const right = answered && selected === question.answer;
  const struckHere = struck[question.id] ?? [];
  const triesLeft = MAX_TRIES - struckHere.length;

  return (
    <div className="space-y-5">
      <StepTracker
        current={index}
        steps={questions.map((candidate) =>
          !answers[candidate.id] ? "open" : answers[candidate.id] === candidate.answer ? "right" : "wrong"
        )}
      />
      <QuestionPrompt activity={activity} question={question} learningItems={learningItems} selected={selected} />

      <motion.div
        key={`${question.id}-${shakeKey}`}
        // Three choices sit in one row even on phones, so none is pushed below the screen.
        className={cn(
          "grid gap-2.5 sm:gap-4",
          options.length <= 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"
        )}
        animate={shakeKey && !reduceMotion && answered && !right ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
        transition={{ duration: 0.35 }}
      >
        {options.map((option) => {
          const picked = selected === option;
          const correct = option === question.answer;
          const state = !answered ? (flash === option ? "wrong" : "idle") : correct ? "correct" : picked ? "wrong" : "idle";
          return (
            <button
              key={option}
              type="button"
              disabled={answered}
              aria-pressed={picked}
              aria-label={`Choose ${getDisplayLabel(option, learningItems)} card`}
              onClick={() => pick(option)}
              className={cn(
                "group relative flex min-w-0 flex-col gap-2 rounded-3xl border-2 bg-white p-2.5 text-center shadow-[0_10px_24px_rgba(37,99,235,0.08)] transition duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
                state === "idle" && !answered && "border-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_16px_32px_rgba(37,99,235,0.16)]",
                state === "idle" && answered && "border-white opacity-60",
                state === "correct" && "scale-105 border-green-500 ring-4 ring-green-100",
                state === "wrong" && "border-red-400 ring-4 ring-red-100",
                answered && "cursor-default"
              )}
            >
              <PictureWell value={option} learningItems={learningItems} tone={state} />
              {state === "correct" ? <CheckCircle2 className="absolute right-3 top-3 h-6 w-6 rounded-full bg-white text-green-600" aria-hidden="true" /> : null}
              {state === "wrong" ? <XCircle className="absolute right-3 top-3 h-6 w-6 rounded-full bg-white text-red-500" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </motion.div>

      <ActionBar
        status={
          !answered
            ? struckHere.length
              ? `Not this one. ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left.`
              : "Tap the right picture."
            : right
              ? "Correct!"
              : "The right card is green."
        }
        tone={!answered ? (struckHere.length ? "bad" : "neutral") : right ? "good" : "bad"}
      >
        {null}
      </ActionBar>

      <ScoreDialog result={result} onRestart={onRestart} onExit={onExit} />
    </div>
  );
}

/**
 * One numbered circle per question: green tick when right, red cross when wrong, blue ring on the current
 * one, grey for the ones still to come. The count itself is in the top bar.
 */
function StepTracker({ current, steps }: { current: number; steps: Array<"open" | "right" | "wrong"> }) {
  return (
    <div className="flex justify-center">
      <ol className="flex items-center" aria-label={`Question ${current + 1} of ${steps.length}`}>
        {steps.map((step, position) => (
          <li key={position} className="flex items-center">
            {position > 0 ? (
              <span className={cn("h-0.5 w-5 sm:w-8", steps[position - 1] === "open" ? "bg-slate-200" : "bg-blue-200")} aria-hidden="true" />
            ) : null}
            <span
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full border-2 text-sm font-black transition",
                step === "right" && "border-green-500 bg-green-500 text-white",
                step === "wrong" && "border-red-500 bg-red-500 text-white",
                step === "open" && position === current && "border-blue-600 bg-white text-blue-600 ring-4 ring-blue-100",
                step === "open" && position !== current && "border-slate-200 bg-white text-slate-400"
              )}
              aria-label={`Question ${position + 1}: ${step === "right" ? "right" : step === "wrong" ? "wrong" : position === current ? "now" : "to do"}`}
            >
              {step === "right" ? (
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              ) : step === "wrong" ? (
                <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
              ) : (
                position + 1
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function QuestionPrompt({
  activity,
  question,
  learningItems,
  selected
}: {
  activity: Activity;
  question: ActivityQuestion;
  learningItems: LearningItem[];
  selected?: string;
}) {
  const isMatch = activity.type === "match-word-symbol";
  const parts = activity.type === "fill-blank" ? question.prompt.split("____") : null;

  return (
    <div className={cn(panelClass, "flex items-start gap-3 p-5 pl-7")}>
      <span className="absolute inset-y-0 left-0 w-1.5 bg-blue-600" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <SectionLabel>{isMatch ? "Find the card for" : "Question"}</SectionLabel>
        {parts && parts.length > 1 ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold leading-snug text-blue-600">
            <span>{parts[0].trim()}</span>
            <span className="inline-grid min-h-11 min-w-28 place-items-center rounded-2xl border-2 border-dashed border-blue-300 bg-white/80 px-3 text-blue-600">
              {selected ? getDisplayLabel(selected, learningItems) : ""}
            </span>
            <span>{parts[1].trim()}</span>
          </p>
        ) : (
          <p className={cn("mt-2 break-words font-bold leading-snug text-blue-600", isMatch ? "text-4xl" : "text-2xl")}>
            {getQuestionTitle(activity, question, learningItems)}
          </p>
        )}
        <p className="mt-3 text-sm font-semibold text-slate-600">
          {activityInstruction(activity.type, isMatch ? getQuestionTitle(activity, question, learningItems) : undefined)}
        </p>
      </div>
      <ListenButton text={getQuestionListenText(activity, question, learningItems)} />
    </div>
  );
}

/**
 * Activity cards use the dedicated no-text PECS artwork so the answer is not
 * disclosed by a word printed inside the source image.
 */
function PictureWell({ value, learningItems, tone = "idle" }: { value: string; learningItems: LearningItem[]; tone?: string }) {
  return (
    <span
      className={cn(
        "relative mx-auto block aspect-[3/4] w-full max-w-[13rem] overflow-hidden rounded-2xl",
        tone === "correct" ? "bg-green-50" : tone === "wrong" ? "bg-red-50" : "bg-blue-50/60"
      )}
    >
      <SymbolOption
        value={value}
        learningItems={learningItems}
        framed={false}
        preferNoTextPecs
        className="!h-full max-h-full p-1.5"
      />
    </span>
  );
}

function ActionBar({ status, tone, children }: { status: string; tone: "neutral" | "good" | "bad"; children: React.ReactNode }) {
  return (
    <div className={cn(panelClass, "flex flex-wrap items-center justify-between gap-3 px-4 py-3")}>
      <p
        role="status"
        className={cn("text-sm font-semibold", tone === "good" ? "text-green-700" : tone === "bad" ? "text-red-600" : "text-slate-600")}
      >
        {status}
      </p>
      {children}
    </div>
  );
}

function DragDropBoard({ activity, learningItems, answers, result, dragged, setDragged, chooseAnswer, onScore, onRestart, onExit, onProgress }: TeacherPlayerProps) {
  const questions = activity.questions;
  const reduceMotion = useReducedMotion();
  const [seed] = useState(() => Math.random());
  const [shake, setShake] = useState<{ id: string; key: number } | null>(null);
  /** Wrong drops so far per card (a card remembers its tries). */
  const [misses, setMisses] = useState<Record<string, number>>({});
  // Where a card picked up with a click follows the pointer, until it is put on a word or let go.
  const [carry, setCarry] = useState<{ x: number; y: number } | null>(null);
  const carrying = Boolean(carry && dragged);
  const cards = useMemo(
    () => shuffleOptions([...new Set(questions.map((question) => question.answer))], seed),
    [questions, seed]
  );
  const placedCount = questions.filter((question) => answers[question.id]).length;
  // A card leaves the tray once its word is done, including a word whose tries ran out.
  const tray = cards.filter((card) => !questions.some((question) => answers[question.id] && question.answer === card));
  const allPlaced = questions.length > 0 && placedCount === questions.length;

  useEffect(() => {
    onProgress(placedCount, questions.length);
  }, [onProgress, placedCount, questions.length]);

  // Every word is done (right, or out of tries), so the score opens by itself.
  const scoreRef = useRef(onScore);
  useEffect(() => {
    scoreRef.current = onScore;
  });
  useEffect(() => {
    if (!allPlaced || result) return undefined;
    const timer = window.setTimeout(() => scoreRef.current(), SCORE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [allPlaced, result]);

  useEffect(() => {
    if (!carrying) return undefined;
    function letGo() {
      setCarry(null);
      setDragged("");
    }
    function onMove(event: PointerEvent) {
      setCarry({ x: event.clientX, y: event.clientY });
    }
    // A press on a word or a card is handled by it; anywhere else lets the carried card go.
    function onDown(event: PointerEvent) {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest("[data-drop-word], [data-tray-card]")) letGo();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") letGo();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [carrying, setDragged]);

  if (!questions.length) return <EmptyNote />;

  /** A card only stays on its own word. A wrong one shakes the box and goes back; after its third wrong drop the card goes to its own word in red. */
  function place(questionId: string) {
    const target = questions.find((question) => question.id === questionId);
    if (!dragged || result || !target || answers[questionId]) return;
    if (dragged === target.answer) {
      playCue("correct");
      chooseAnswer(questionId, dragged);
    } else {
      playCue("wrong");
      setShake({ id: questionId, key: Date.now() });
      const tries = (misses[dragged] ?? 0) + 1;
      setMisses((current) => ({ ...current, [dragged]: tries }));
      const home = questions.find((question) => question.answer === dragged && !answers[question.id]);
      if (tries >= MAX_TRIES && home) chooseAnswer(home.id, MISSED);
    }
    setDragged("");
    setCarry(null);
  }

  return (
    <div className="space-y-5">
      <div className={cn(panelClass, "p-4")}>
        <SectionLabel>{activityInstruction(activity.type)}</SectionLabel>
        {/* Phones: three boxes per row and the cards in one row, so boxes and cards share one screen for dragging. */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
          {questions.map((question) => {
            const answer = answers[question.id];
            const missed = answer === MISSED;
            const shaking = shake?.id === question.id;
            return (
              <motion.button
                key={shaking ? `${question.id}-${shake.key}` : question.id}
                type="button"
                data-drop-word=""
                disabled={Boolean(answer)}
                onClick={() => place(question.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  place(question.id);
                }}
                animate={shaking && !reduceMotion ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
                transition={{ duration: 0.35 }}
                aria-label={answer ? `${question.prompt}: done` : `Place card on ${question.prompt}`}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-2 rounded-3xl border-2 p-2 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
                  missed
                    ? "cursor-default border-red-400 bg-red-50"
                    : answer
                    ? "cursor-default border-green-500 bg-green-50"
                    : shaking
                      ? "border-red-400 bg-red-50"
                      : dragged
                        ? "border-dashed border-blue-400 bg-blue-50/70"
                        : "border-dashed border-blue-200 bg-white/80"
                )}
              >
                <span className="max-w-full break-words rounded-xl bg-blue-600 px-2 py-1 text-xs font-bold uppercase sm:px-2.5 sm:text-sm leading-tight text-white">
                  {question.prompt}
                </span>
                {answer ? (
                  <PictureWell value={missed ? question.answer : answer} learningItems={learningItems} tone={missed ? "wrong" : "correct"} />
                ) : (
                  <span className="grid aspect-[3/4] w-full max-w-[13rem] place-items-center rounded-2xl text-xs font-semibold text-blue-300">Drop here</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {!result && tray.length ? (
        <div className={cn(panelClass, "p-4")}>
          <SectionLabel>Cards</SectionLabel>
          <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
            {tray.map((card) => (
              <button
                key={card}
                type="button"
                data-tray-card=""
                draggable
                onDragStart={() => {
                  setCarry(null);
                  setDragged(card);
                }}
                onDragEnd={() => setDragged("")}
                onClick={(event) => {
                  if (dragged === card) {
                    setDragged("");
                    setCarry(null);
                    return;
                  }
                  setDragged(card);
                  // A mouse click or tap carries the card with the pointer; a key press only selects it.
                  setCarry(event.detail > 0 ? { x: event.clientX, y: event.clientY } : null);
                }}
                aria-pressed={dragged === card}
                aria-label={`Drag ${getDisplayLabel(card, learningItems)} card onto its word`}
                className={cn(
                  "rounded-2xl border-2 bg-white p-1 shadow-[0_10px_24px_rgba(37,99,235,0.08)] transition sm:rounded-3xl sm:p-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
                  dragged === card ? "border-blue-600 ring-4 ring-blue-100" : "border-white hover:-translate-y-0.5 hover:border-blue-300"
                )}
              >
                <PictureWell value={card} learningItems={learningItems} />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ActionBar
        status={allPlaced ? "All done. Your score is coming up." : "Drag each card onto its word."}
        tone={allPlaced ? "good" : "neutral"}
      >
        {null}
      </ActionBar>

      {carry && dragged ? (
        <div
          className="pointer-events-none fixed left-0 top-0 z-[80] w-28 -translate-x-1/2 -translate-y-1/2 rotate-[-2deg] rounded-3xl border-2 border-blue-500 bg-white p-2 shadow-[0_24px_40px_rgba(37,99,235,0.3)]"
          style={{ left: carry.x, top: carry.y }}
          aria-hidden="true"
        >
          <PictureWell value={dragged} learningItems={learningItems} />
        </div>
      ) : null}

      <ScoreDialog result={result} onRestart={onRestart} onExit={onExit} />
    </div>
  );
}

/** The final score, view only. A blue ring fills to the percentage. */
function ScoreDialog({ result, onRestart, onExit }: { result: ActivityScore | null; onRestart: () => void; onExit: () => void }) {
  // Closing leaves the checked answers on screen; a new score opens it again.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => setDismissed(false), [result]);
  const total = result ? result.correct + result.incorrect : 0;
  const score = result?.score ?? 0;
  // Green, yellow, red keep their usual meaning in the message: all correct, some to review, more practice.
  const tone = score === 100 ? "green" : score >= 50 ? "yellow" : "red";
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <Dialog open={Boolean(result) && !dismissed} onClose={() => setDismissed(true)} title="Activity score" description="Shown only. Scores are not saved." hideHeader className="max-w-sm">
      <div className="text-center">
        <SectionLabel>Activity score</SectionLabel>
        <div className="relative mx-auto mt-3 h-36 w-36">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="#dbeafe" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#2563eb"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - score / 100)}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-4xl font-extrabold text-ink">{score}%</span>
        </div>
        <p className="mt-3 text-lg font-bold text-ink">
          {result?.correct ?? 0} of {total} correct
        </p>
        <p className={cn("mt-1 text-sm font-semibold", tone === "green" ? "text-green-700" : tone === "yellow" ? "text-yellow-700" : "text-red-600")}>
          {tone === "green" ? "All correct." : tone === "yellow" ? "Go over the missed ones together." : "Practice the cards again, then retry."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" onClick={onExit}>
            <Library className="h-4 w-4" aria-hidden="true" />
            Back to library
          </Button>
          <Button type="button" onClick={onRestart}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Play again
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function ListenButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        setSpeaking(true);
        await speakText(text);
        setSpeaking(false);
      }}
      aria-label="Listen"
      title="Listen"
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-[0_10px_22px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 hover:shadow-[0_14px_28px_rgba(37,99,235,0.32)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
        speaking && "ring-4 ring-blue-200"
      )}
    >
      <Volume2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

function EmptyNote() {
  return <p className={cn(panelClass, "p-6 text-center text-sm font-semibold text-slate-500")}>This activity has no questions yet.</p>;
}
