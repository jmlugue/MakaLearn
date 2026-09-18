"use client";

import { Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { activityUsesImageOptions, getDisplayLabel, getQuestionTitle, getChoiceTheme } from "@/features/activities/player/player-utils";
import { SymbolOption } from "@/features/activities/player/player-parts";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

export function GamePromptCard({ activity, learningItems }: { activity: Activity; learningItems: LearningItem[] }) {
  const prompt =
    activity.type === "drag-drop-symbol"
      ? "Match each card to its word."
      : activity.questions.length === 1
        ? getQuestionTitle(activity, activity.questions[0], learningItems)
        : activity.prompt;

  return (
    <div
      className="relative mx-auto w-full max-w-7xl rounded-[2rem] border-4 border-white bg-white/90 px-5 py-5 text-center shadow-[0_14px_0_rgba(147,197,253,0.32),0_30px_58px_rgba(37,99,235,0.16)] sm:px-10 lg:py-6"
    >
      <p className="text-2xl font-black leading-[1.18] text-[#10285e] sm:text-4xl">
        {prompt}
      </p>
    </div>
  );
}

export function QuestionChoicePanel({
  activity,
  question,
  singleQuestion,
  learningItems,
  selectedAnswer,
  scored,
  hinted,
  chooseAnswer
}: {
  activity: Activity;
  question: ActivityQuestion;
  singleQuestion: boolean;
  learningItems: LearningItem[];
  selectedAnswer?: string;
  scored: boolean;
  hinted: boolean;
  chooseAnswer: (questionId: string, value: string) => void;
}) {
  const isFillBlank = activity.type === "fill-blank";
  const title = getQuestionTitle(activity, question, learningItems);
  const shouldShowSymbolOptions = activityUsesImageOptions(activity.type) || isFillBlank;

  return (
    <article
      className={cn(
        "min-h-0 rounded-[2rem] p-1 transition sm:p-2",
        hinted ? "bg-amber-200/40 ring-8 ring-amber-100/70" : ""
      )}
    >
      <div className={cn("min-h-0 rounded-[1.75rem] border-4 border-white bg-white/86 px-5 py-4 text-center shadow-[0_10px_0_rgba(147,197,253,0.2)]", singleQuestion ? "hidden" : "block")}>
        <div className="min-w-0">
          {isFillBlank ? (
            <FillBlankPrompt prompt={question.prompt} answer={selectedAnswer} />
          ) : (
            <h2
              className={cn(
                "line-clamp-3 font-black leading-tight text-[#10285e]",
                activity.type === "match-word-symbol" ? "text-4xl sm:text-5xl" : "text-lg sm:text-xl"
              )}
            >
              {title}
            </h2>
          )}
          {hinted ? <p className="mt-2 text-sm font-black text-amber-700">Try this one first.</p> : null}
        </div>
      </div>

      <div className={cn("grid min-h-0 grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5", singleQuestion ? "mt-0" : "mt-4")}>
        {question.options.map((option, optionIndex) => {
          const selected = selectedAnswer === option;
          const correct = option === question.answer;
          return (
            <LargeAnswerCard
              key={option}
              option={option}
              optionIndex={optionIndex}
              learningItems={learningItems}
              showSymbol={shouldShowSymbolOptions}
              showLabel={isFillBlank}
              selected={selected}
              correct={correct}
              scored={scored}
              onChoose={() => chooseAnswer(question.id, option)}
            />
          );
        })}
      </div>
    </article>
  );
}

export function FillBlankPrompt({ prompt, answer }: { prompt: string; answer?: string }) {
  const [before, after] = prompt.split("____");

  if (after === undefined) {
    return <h2 className="mt-1 text-xl font-black leading-tight text-[#0d255a] sm:text-2xl">{prompt}</h2>;
  }

  return (
    <h2 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-black leading-tight text-[#10285e] sm:text-2xl">
      <span>{before.trim()}</span>
      <span className="inline-grid min-h-12 min-w-28 place-items-center rounded-2xl border-2 border-dashed border-blue-300 bg-[#f8fbff] px-3 text-blue-700">
        {answer || ""}
      </span>
      <span>{after.trim()}</span>
    </h2>
  );
}

export function LargeAnswerCard({
  option,
  optionIndex,
  learningItems,
  showSymbol,
  showLabel = false,
  selected,
  correct,
  scored,
  onChoose
}: {
  option: string;
  optionIndex: number;
  learningItems: LearningItem[];
  showSymbol: boolean;
  showLabel?: boolean;
  selected: boolean;
  correct: boolean;
  scored: boolean;
  onChoose: () => void;
}) {
  const theme = getChoiceTheme(`${option}-${optionIndex}`);
  const statusClass = scored && selected
    ? correct
      ? `${theme.correct} ring-8`
      : `${theme.wrong} ring-8`
    : selected
      ? `${theme.selected} ring-8`
      : theme.card;

  return (
    <button
      type="button"
      onClick={onChoose}
      aria-pressed={selected}
      className={cn(
        showSymbol
          ? cn(
              "relative grid h-[20rem] min-h-0 overflow-hidden rounded-[2rem] border-4 p-3 text-center transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100 sm:h-[22rem] lg:h-[24rem]",
              showLabel ? "grid-rows-[minmax(0,1fr)_auto]" : "grid-rows-[minmax(0,1fr)]"
            )
          : "relative flex min-h-32 flex-col items-center justify-center gap-2 rounded-[2rem] border-4 p-3 text-center transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100 sm:min-h-44 lg:min-h-48",
        statusClass
      )}
    >
      {selected ? (
        <span
          className={cn(
            "absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border-2 border-white text-white shadow-sm",
            scored && !correct ? "bg-rose-500" : "bg-emerald-500"
          )}
          aria-hidden="true"
        >
          {scored && !correct ? <XCircle className="h-6 w-6" /> : <Check className="h-6 w-6" />}
        </span>
      ) : null}
      {showSymbol ? (
        <>
          <span className="grid h-full min-h-0 w-full place-items-center overflow-hidden rounded-[1.35rem] bg-white/82 p-2">
            <SymbolOption value={option} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
            <span className="sr-only">{getDisplayLabel(option, learningItems)}</span>
          </span>
          {showLabel ? (
            <span className="mt-2 rounded-2xl bg-white/85 px-3 py-2 text-xl font-black uppercase leading-tight text-[#10285e] shadow-sm sm:text-2xl">
              {getDisplayLabel(option, learningItems)}
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-2xl font-black uppercase leading-tight text-[#10285e] sm:text-3xl lg:text-4xl">
          {getDisplayLabel(option, learningItems)}
        </span>
      )}
      {scored && selected && !showSymbol ? (
        <span className={cn("rounded-full bg-white/76 px-4 py-1 text-lg font-black", correct ? "text-emerald-700" : "text-rose-700")}>
          {correct ? "Correct" : "Try again"}
        </span>
      ) : null}
    </button>
  );
}
