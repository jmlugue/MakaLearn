"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Library, RotateCcw, Volume2, X, XCircle } from "lucide-react";
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

/**
 * The teacher's player: plain blue glass, one question at a time, Check then Next, and a score pop-up at the
 * end. Student mode keeps the game-style player; this one is for running and checking an activity quickly.
 */
export function TeacherPlayer(props: TeacherPlayerProps) {
  if (props.activity.type === "drag-drop-symbol") return <DragDropBoard {...props} />;
  return <ChoiceSteps {...props} />;
}

function ChoiceSteps({ activity, learningItems, answers, result, chooseAnswer, onScore, onRestart, onExit, onProgress }: TeacherPlayerProps) {
  const questions = activity.questions;
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [optionShuffleSeed] = useState(() => Math.random());
  const question = questions[Math.min(index, Math.max(questions.length - 1, 0))];
  const options = useMemo(
    () => question ? getActivityQuestionOptions(activity, question, learningItems, optionShuffleSeed) : [],
    [activity, learningItems, optionShuffleSeed, question]
  );
  const selected = question ? answers[question.id] : undefined;
  const isChecked = question ? Boolean(checked[question.id]) : false;
  const last = index >= questions.length - 1;
  const answeredCount = Object.keys(checked).length;

  useEffect(() => {
    onProgress(answeredCount, questions.length);
  }, [answeredCount, onProgress, questions.length]);

  // The score opens on its own once the last answer is checked, after a moment to see the green and red cards.
  // A ref keeps the timer from restarting each time the parent passes a new onScore.
  const finished = last && isChecked;
  const scoreRef = useRef(onScore);
  useEffect(() => {
    scoreRef.current = onScore;
  });
  useEffect(() => {
    if (!finished || result) return undefined;
    const timer = window.setTimeout(() => scoreRef.current(), SCORE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [finished, result]);

  if (!question) return <EmptyNote />;

  return (
    <div className="space-y-5">
      <StepTracker
        current={index}
        steps={questions.map((candidate) =>
          !checked[candidate.id] ? "open" : answers[candidate.id] === candidate.answer ? "right" : "wrong"
        )}
      />
      <QuestionPrompt activity={activity} question={question} learningItems={learningItems} selected={selected} />

      <div className={cn("grid gap-4", options.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        {options.map((option) => {
          const picked = selected === option;
          const correct = option === question.answer;
          const state = !isChecked ? (picked ? "picked" : "idle") : correct ? "correct" : picked ? "wrong" : "idle";
          return (
            <button
              key={option}
              type="button"
              disabled={isChecked}
              aria-pressed={picked}
              aria-label={`Choose ${getDisplayLabel(option, learningItems)} card`}
              onClick={() => chooseAnswer(question.id, option)}
              className={cn(
                "group relative flex min-w-0 flex-col gap-2 rounded-3xl border-2 bg-white p-2.5 text-center shadow-[0_10px_24px_rgba(37,99,235,0.08)] transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
                state === "idle" && "border-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_16px_32px_rgba(37,99,235,0.16)]",
                state === "picked" && "border-blue-600 ring-4 ring-blue-100",
                state === "correct" && "border-green-500 ring-4 ring-green-100",
                state === "wrong" && "border-red-400 ring-4 ring-red-100",
                isChecked && "cursor-default"
              )}
            >
              <PictureWell value={option} learningItems={learningItems} tone={state} />
              {state === "correct" ? <CheckCircle2 className="absolute right-3 top-3 h-6 w-6 rounded-full bg-white text-green-600" aria-hidden="true" /> : null}
              {state === "wrong" ? <XCircle className="absolute right-3 top-3 h-6 w-6 rounded-full bg-white text-red-500" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      <ActionBar status={isChecked ? (last ? "All done. Your score is coming up." : "") : selected ? "Press Check." : "Pick an answer."} tone="neutral">
        {!isChecked ? (
          <Button type="button" disabled={!selected} onClick={() => setChecked((current) => ({ ...current, [question.id]: true }))}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Check
          </Button>
        ) : last ? null : (
          // After the last Check the score pop-up opens by itself. No button here, so it cannot be skipped by accident.
          <Button type="button" onClick={() => setIndex((current) => current + 1)}>
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
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
  const [seed] = useState(() => Math.random());
  const cards = useMemo(
    () => shuffleOptions([...new Set(questions.map((question) => question.answer))], seed),
    [questions, seed]
  );
  const placedCount = questions.filter((question) => answers[question.id]).length;
  const tray = cards.filter((card) => !questions.some((question) => answers[question.id] === card));

  useEffect(() => {
    onProgress(placedCount, questions.length);
  }, [onProgress, placedCount, questions.length]);

  if (!questions.length) return <EmptyNote />;

  function place(questionId: string) {
    if (!dragged || result) return;
    chooseAnswer(questionId, dragged);
    setDragged("");
  }

  return (
    <div className="space-y-5">
      <div className={cn(panelClass, "p-4")}>
        <SectionLabel>Put each card on its word</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {questions.map((question) => {
            const answer = answers[question.id];
            const tone = !result || !answer ? "idle" : answer === question.answer ? "correct" : "wrong";
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => (answer && !result ? chooseAnswer(question.id, "") : place(question.id))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  place(question.id);
                }}
                aria-label={answer ? `Remove card from ${question.prompt}` : `Place card on ${question.prompt}`}
                className={cn(
                  "flex min-w-0 flex-col items-center gap-2 rounded-3xl border-2 p-2 text-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
                  tone === "idle" && (dragged ? "border-dashed border-blue-400 bg-blue-50/70" : "border-dashed border-blue-200 bg-white/80"),
                  tone === "correct" && "border-green-500 bg-green-50",
                  tone === "wrong" && "border-red-400 bg-red-50"
                )}
              >
                <span className="max-w-full break-words rounded-xl bg-blue-600 px-2.5 py-1 text-sm font-bold uppercase leading-tight text-white">
                  {question.prompt}
                </span>
                {answer ? (
                  <PictureWell value={answer} learningItems={learningItems} tone={tone} />
                ) : (
                  <span className="grid aspect-[3/4] w-full max-w-[13rem] place-items-center rounded-2xl text-xs font-semibold text-blue-300">Drop here</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!result ? (
        <div className={cn(panelClass, "p-4")}>
          <SectionLabel>Cards</SectionLabel>
          {tray.length ? (
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {tray.map((card) => (
                <button
                  key={card}
                  type="button"
                  draggable
                  onDragStart={() => setDragged(card)}
                  onClick={() => setDragged(dragged === card ? "" : card)}
                  aria-pressed={dragged === card}
                  aria-label={`Pick ${getDisplayLabel(card, learningItems)} card`}
                  className={cn(
                    "rounded-3xl border-2 bg-white p-2 shadow-[0_10px_24px_rgba(37,99,235,0.08)] transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200",
                    dragged === card ? "border-blue-600 ring-4 ring-blue-100" : "border-white hover:-translate-y-0.5 hover:border-blue-300"
                  )}
                >
                  <PictureWell value={card} learningItems={learningItems} />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-500">All cards are placed.</p>
          )}
        </div>
      ) : null}

      <ActionBar status={dragged ? "Now pick its word." : "Click a card, then its word. Or drag it."} tone="neutral">
        <Button type="button" disabled={placedCount === 0 || Boolean(result)} onClick={() => onScore()}>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Check
        </Button>
      </ActionBar>

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
          {tone === "green" ? "All correct." : tone === "yellow" ? "Go over the missed ones together." : "Practise the cards again, then retry."}
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
