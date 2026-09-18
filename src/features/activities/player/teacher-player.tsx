"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Library, RotateCcw, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SectionLabel, glassBoxClass } from "@/features/content/content-shared";
import { SymbolOption } from "@/features/activities/player/player-parts";
import {
  type ActivityScore,
  activityUsesImageOptions,
  getDisplayLabel,
  getQuestionListenText,
  getQuestionTitle,
  shuffleOptions,
  speakText
} from "@/features/activities/player/player-utils";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

type TeacherPlayerProps = {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  result: ActivityScore | null;
  dragged: string;
  setDragged: (value: string) => void;
  chooseAnswer: (questionId: string, value: string) => void;
  /** Scores and saves the result, like the student player. */
  onScore: (questionIds?: string[]) => void;
  onRestart: () => void;
  onExit: () => void;
  /** Reports "question n of total" to the top bar. */
  onProgress: (current: number, total: number) => void;
};

/**
 * The teacher's player: plain blue glass, one question at a time, Check then Next, and a score card at the
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
  const question = questions[Math.min(index, Math.max(questions.length - 1, 0))];
  const selected = question ? answers[question.id] : undefined;
  const isChecked = question ? Boolean(checked[question.id]) : false;
  const last = index >= questions.length - 1;

  useEffect(() => {
    onProgress(Math.min(index + 1, questions.length), questions.length);
  }, [index, onProgress, questions.length]);

  if (result) return <ScoreCard result={result} onRestart={onRestart} onExit={onExit} />;
  if (!question) return <EmptyNote />;

  const showPictures = activityUsesImageOptions(activity.type) || activity.type === "fill-blank";
  const showWords = !activityUsesImageOptions(activity.type);

  return (
    <div className="space-y-5">
      <QuestionPrompt activity={activity} question={question} learningItems={learningItems} selected={selected} />

      <div className={cn("grid gap-3", question.options.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        {question.options.map((option) => {
          const picked = selected === option;
          const correct = option === question.answer;
          const state = !isChecked ? (picked ? "picked" : "idle") : correct ? "correct" : picked ? "wrong" : "idle";
          return (
            <button
              key={option}
              type="button"
              disabled={isChecked}
              aria-pressed={picked}
              onClick={() => chooseAnswer(question.id, option)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-white/90 p-3 text-center shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                state === "idle" && "border-blue-100 hover:border-blue-300",
                state === "picked" && "border-blue-600 ring-4 ring-blue-100",
                state === "correct" && "border-green-500 bg-green-50 ring-4 ring-green-100",
                state === "wrong" && "border-red-400 bg-red-50 ring-4 ring-red-100",
                isChecked && "cursor-default"
              )}
            >
              {showPictures ? <SymbolOption value={option} learningItems={learningItems} framed={false} className="h-28 sm:h-32" /> : null}
              {showWords ? <span className="text-lg font-bold text-ink">{getDisplayLabel(option, learningItems)}</span> : null}
              {state === "correct" ? <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 text-green-600" aria-hidden="true" /> : null}
              {state === "wrong" ? <XCircle className="absolute right-2 top-2 h-5 w-5 text-red-500" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500" role="status">
          {isChecked ? (selected === question.answer ? "Correct." : "Not quite. The green card is the answer.") : selected ? "Press Check." : "Pick an answer."}
        </p>
        {!isChecked ? (
          <Button type="button" disabled={!selected} onClick={() => setChecked((current) => ({ ...current, [question.id]: true }))}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Check
          </Button>
        ) : last ? (
          <Button type="button" onClick={() => onScore()}>
            See score
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" onClick={() => setIndex((current) => current + 1)}>
            Next
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
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
    <div className={cn("flex items-start gap-3 p-5", glassBoxClass)}>
      <div className="min-w-0 flex-1">
        <SectionLabel>{isMatch ? "Find the card for" : "Question"}</SectionLabel>
        {parts && parts.length > 1 ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold leading-snug text-ink">
            <span>{parts[0].trim()}</span>
            <span className="inline-grid min-h-10 min-w-24 place-items-center rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 px-3 text-blue-700">
              {selected ? getDisplayLabel(selected, learningItems) : ""}
            </span>
            <span>{parts[1].trim()}</span>
          </p>
        ) : (
          <p className={cn("mt-2 font-bold leading-snug text-ink", isMatch ? "text-4xl" : "text-2xl")}>
            {getQuestionTitle(activity, question, learningItems)}
          </p>
        )}
      </div>
      <ListenButton text={getQuestionListenText(activity, question, learningItems)} />
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
      <div className={cn("p-4", glassBoxClass)}>
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
                  "flex min-h-40 flex-col items-center gap-2 rounded-2xl border-2 p-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                  tone === "idle" && (dragged ? "border-dashed border-blue-400 bg-blue-50/60" : "border-dashed border-blue-200 bg-white/70"),
                  tone === "correct" && "border-green-500 bg-green-50",
                  tone === "wrong" && "border-red-400 bg-red-50"
                )}
              >
                <span className="rounded-lg bg-white px-2 py-1 text-sm font-bold uppercase text-ink ring-1 ring-blue-100">{question.prompt}</span>
                {answer ? (
                  <SymbolOption value={answer} learningItems={learningItems} framed={false} className="h-24" />
                ) : (
                  <span className="grid flex-1 place-items-center text-xs font-semibold text-slate-400">Drop here</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!result ? (
        <div className={cn("p-4", glassBoxClass)}>
          <SectionLabel>Cards</SectionLabel>
          {tray.length ? (
            <div className="mt-3 flex flex-wrap gap-3">
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
                    "w-28 rounded-2xl border-2 bg-white p-2 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                    dragged === card ? "border-blue-600 ring-4 ring-blue-100" : "border-blue-100 hover:border-blue-300"
                  )}
                >
                  <SymbolOption value={card} learningItems={learningItems} framed={false} className="h-20" />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm font-semibold text-slate-500">All cards are placed.</p>
          )}
        </div>
      ) : null}

      {result ? (
        <ScoreCard result={result} onRestart={onRestart} onExit={onExit} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500" role="status">
            {dragged ? "Now pick its word." : "Click a card, then its word. Or drag it."}
          </p>
          <Button type="button" disabled={placedCount === 0} onClick={() => onScore()}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Check
          </Button>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ result, onRestart, onExit }: { result: ActivityScore; onRestart: () => void; onExit: () => void }) {
  // Green, yellow, red carry their usual meaning: all correct, some to review, needs more practice.
  const tone = result.score === 100 ? "green" : result.score >= 50 ? "yellow" : "red";
  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border p-6 text-center shadow-sm",
        tone === "green" && "border-green-200 bg-green-50",
        tone === "yellow" && "border-yellow-200 bg-yellow-50",
        tone === "red" && "border-red-200 bg-red-50"
      )}
    >
      <p className="text-5xl font-extrabold text-ink">{result.score}%</p>
      <p className="mt-2 text-sm font-semibold text-slate-600">
        {result.correct} correct, {result.incorrect} to review
      </p>
      <p className="mt-1 text-sm text-slate-500">
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
        "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 bg-white text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
        speaking && "ring-4 ring-blue-100"
      )}
    >
      <Volume2 className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

function EmptyNote() {
  return <p className={cn("p-6 text-center text-sm font-semibold text-slate-500", glassBoxClass)}>This activity has no questions yet.</p>;
}
