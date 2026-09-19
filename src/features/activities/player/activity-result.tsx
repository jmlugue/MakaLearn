"use client";

import { CheckCircle2, RotateCcw, Star, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type ActivityScore } from "@/features/activities/player/player-utils";
import { SymbolOption } from "@/features/activities/player/player-parts";
import type { Activity, LearningItem } from "@/types";

export function ActivityResultModal({
  activity,
  learningItems,
  answers,
  result,
  questionIds,
  primaryActionLabel,
  onPrimaryAction,
  isListening = false,
  onListen,
  highlightedQuestionId = ""
}: {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  result: ActivityScore;
  questionIds?: string[];
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  isListening?: boolean;
  onListen?: () => void;
  highlightedQuestionId?: string;
}) {
  const completedQuestions = questionIds?.length
    ? activity.questions.filter((question) => questionIds.includes(question.id))
    : activity.questions.slice(0, 5);
  const isCorrect = result.incorrect === 0;
  // Once every question in the round has an answer, show the final score too. View only, nothing is saved.
  const roundQuestions = activity.questions.slice(0, 5);
  const roundDone = roundQuestions.length > 0 && roundQuestions.every((question) => answers[question.id]);
  const finalCorrect = roundQuestions.filter((question) => answers[question.id] === question.answer).length;
  const totalCompleted = result.correct + result.incorrect;
  const summaryText = activity.type === "match-word-symbol" || activity.type === "drag-drop-symbol"
    ? isCorrect
      ? `You matched ${result.correct} of ${totalCompleted} cards.`
      : `${result.incorrect} match needs another try.`
    : totalCompleted > 1
      ? isCorrect
        ? `You chose ${result.correct} of ${totalCompleted} symbols correctly.`
        : `${result.incorrect} answer needs another try.`
      : isCorrect
        ? "That answer is correct."
        : "That answer needs another try.";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-sky-900/20 px-3 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-result-title"
        className={cn(
          "activity-result-panel relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[1.75rem] border bg-gradient-to-b from-white via-white to-sky-50 p-5 text-center shadow-[0_24px_80px_rgba(37,99,235,0.2)] sm:p-6",
          isCorrect ? "activity-result-panel-correct border-emerald-200" : "activity-result-panel-wrong border-rose-200"
        )}
      >
        {isCorrect ? (
          <div className="activity-confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} className="activity-confetti-piece" />
            ))}
          </div>
        ) : null}
        <div className="relative max-h-[calc(90vh-2.5rem)] overflow-y-auto clean-scrollbar">
          <div
            className={cn(
              "mx-auto grid h-20 w-20 place-items-center rounded-full shadow-[0_12px_24px_rgba(16,185,129,0.16),inset_0_-6px_0_rgba(15,23,42,0.08)]",
              isCorrect ? "bg-gradient-to-b from-lime-300 to-green-300 text-green-900" : "activity-result-wrong-mark bg-gradient-to-b from-rose-100 to-pink-200 text-rose-700"
            )}
            aria-hidden="true"
          >
            {isCorrect ? <CheckCircle2 className="h-12 w-12" /> : <XCircle className="h-12 w-12" />}
          </div>
          <h2
            id="activity-result-title"
            className={cn(
              "mt-4 flex items-center justify-center gap-3 text-4xl font-black tracking-wide sm:text-5xl",
              isCorrect ? "text-emerald-600" : "text-rose-600"
            )}
          >
            <Star className="h-8 w-8 fill-yellow-300 text-yellow-400 sm:h-10 sm:w-10" aria-hidden="true" />
            <span>{isCorrect ? "GOOD JOB" : "TRY AGAIN"}</span>
            <Star className="h-8 w-8 fill-yellow-300 text-yellow-400 sm:h-10 sm:w-10" aria-hidden="true" />
          </h2>
          <p className="mt-2 text-base font-semibold text-slate-700">
            {summaryText}
          </p>
          {roundDone ? (
            <div className="mx-auto mt-4 inline-flex items-center gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 px-5 py-2.5 shadow-sm">
              <span className="text-sm font-black uppercase tracking-wide text-blue-700">Score</span>
              <span className="text-3xl font-black text-[#10285e]">
                {finalCorrect} / {roundQuestions.length}
              </span>
              <span className="flex gap-0.5" aria-hidden="true">
                {roundQuestions.map((question, index) => (
                  <Star
                    key={question.id}
                    className={cn("h-5 w-5", index < finalCorrect ? "fill-yellow-300 text-yellow-400" : "fill-white text-yellow-200")}
                  />
                ))}
              </span>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {completedQuestions.map((question, index) => {
              const value = answers[question.id] || question.answer;
              const activelyRead = highlightedQuestionId === question.id;
              return (
                <div
                  key={`match-complete-${question.id}-${index}`}
                  className={cn(
                    "w-24 rounded-xl border bg-white p-2 shadow-sm transition sm:w-28 md:w-32",
                    activelyRead ? "border-sky-500 ring-8 ring-sky-100 shadow-[0_14px_34px_rgba(14,165,233,0.2)]" : "border-blue-100"
                  )}
                >
                  <div className="grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <span className="grid min-h-0 w-full place-items-center overflow-hidden p-1">
                      <SymbolOption value={value} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isCorrect && onListen ? (
              <Button type="button" variant="secondary" className="min-h-12 px-6" onClick={onListen} disabled={isListening}>
                <Volume2 className="h-5 w-5" aria-hidden="true" />
                {isListening ? "Listening" : "Listen"}
              </Button>
            ) : null}
            <Button type="button" className="min-h-12 px-6" onClick={onPrimaryAction}>
              {isCorrect ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <RotateCcw className="h-5 w-5" aria-hidden="true" />}
              {primaryActionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
