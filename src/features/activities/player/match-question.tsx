"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type ActivityScore,
  getQuestionTitle,
  getMatchWordOptions,
  getPagedSymbolChoiceGridClass,
  getActivityBackground
} from "@/features/activities/player/player-utils";
import {
  StepProgress,
  ActivityGameTopBar,
  SymbolOption,
  CheckStepFooter,
  CheckedOptionBadge,
  checkStepMessage,
  checkedOptionClass,
  checkedOptionState
} from "@/features/activities/player/player-parts";
import { ActivityResultModal } from "@/features/activities/player/activity-result";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

export function MatchWordSymbolStudentLayout({
  activity,
  learningItems,
  answers,
  currentQuestionIndex,
  hintedQuestionId,
  optionSetVersion,
  isListening,
  highlightedListenQuestionId,
  result,
  resultQuestionIds,
  resultPrimaryActionLabel,
  onResultPrimaryAction,
  isResultListening,
  onResultListen,
  onHint,
  onListen,
  onReset,
  onBack,
  onNext,
  onChooseAnswer,
  checkedQuestionIds,
  onCheck,
  activityNavigator
}: {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  currentQuestionIndex: number;
  hintedQuestionId: string;
  optionSetVersion: number;
  isListening: boolean;
  highlightedListenQuestionId: string;
  result: ActivityScore | null;
  resultQuestionIds: string[];
  resultPrimaryActionLabel: string;
  onResultPrimaryAction: () => void;
  isResultListening: boolean;
  onResultListen: () => void;
  onHint: () => void;
  onListen: () => void;
  onReset: () => void;
  onBack: () => void;
  onNext: () => void;
  onChooseAnswer: (question: ActivityQuestion, option: string) => void;
  /** Questions already checked: their cards are locked and show green or red. */
  checkedQuestionIds: Record<string, boolean>;
  onCheck: (question: ActivityQuestion) => void;
  activityNavigator?: ReactNode;
}) {
  const [optionShuffleSeed, setOptionShuffleSeed] = useState(() => Math.random());
  const totalSteps = Math.min(activity.questions.length, 5);
  const safeQuestionIndex = Math.min(currentQuestionIndex, Math.max(totalSteps - 1, 0));
  const currentQuestion = activity.questions[safeQuestionIndex];
  const currentStep = safeQuestionIndex + 1;
  const canMoveBack = totalSteps > 1 && safeQuestionIndex > 0;
  const isLast = safeQuestionIndex + 1 >= totalSteps;
  const isChecked = currentQuestion ? Boolean(checkedQuestionIds[currentQuestion.id]) : false;
  const currentWord = currentQuestion ? getQuestionTitle(activity, currentQuestion, learningItems) : "";
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const options = useMemo(
    () => (currentQuestion ? getMatchWordOptions(activity, currentQuestion, learningItems, optionShuffleSeed) : []),
    [activity, currentQuestion, learningItems, optionShuffleSeed]
  );
  const shouldShowHint = hintedQuestionId === currentQuestion?.id;
  const motivationText = checkStepMessage({
    isChecked,
    isRight: Boolean(currentQuestion && selectedAnswer === currentQuestion.answer),
    hasPick: Boolean(selectedAnswer),
    hinted: shouldShowHint,
    words: false,
    prompt: "Find the matching picture."
  });

  useEffect(() => {
    setOptionShuffleSeed(Math.random());
  }, [activity.id, currentQuestion?.id, optionSetVersion]);

  return (
    <section
      className="fixed inset-0 z-40 grid h-screen w-screen overflow-hidden bg-[#dff5ff] p-3 sm:p-4 lg:p-5"
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.08)), url('${getActivityBackground(activity.id)}')`,
        backgroundPosition: "center",
        backgroundSize: "cover"
      }}
    >
      <div className="absolute right-4 top-4 z-30 sm:right-6 sm:top-5">
        <ActivityGameTopBar
          stacked
          isListening={isListening}
          onHint={onHint}
          onListen={onListen}
          activityNavigator={activityNavigator}
        />
      </div>
      <div className="grid h-full min-h-0 grid-rows-[5rem_minmax(0,1fr)_7rem] gap-3 rounded-[2rem] border border-white/80 bg-white/28 p-3 shadow-[0_18px_58px_rgba(37,99,235,0.12)] backdrop-blur-[2px] sm:grid-rows-[5.5rem_minmax(0,1fr)_8rem] sm:gap-4 sm:p-4">
        <header className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div aria-hidden="true" />

          <div className="hidden min-w-0 justify-center sm:flex">
            <StepProgress currentStep={currentStep} totalSteps={totalSteps} />
          </div>

          <div aria-hidden="true" />
        </header>

        <main className="grid min-h-0 grid-rows-[minmax(5.5rem,0.48fr)_minmax(0,1.52fr)] gap-3 sm:grid-rows-[minmax(6rem,0.52fr)_minmax(0,1.48fr)] sm:gap-4">
          <div className="flex min-h-0 items-center justify-center">
            <div
              className={cn(
                "grid h-full max-h-40 w-full max-w-5xl place-items-center rounded-[2rem] border-4 border-white bg-white/92 px-5 text-center shadow-[0_12px_0_rgba(147,197,253,0.26),0_26px_48px_rgba(37,99,235,0.14)] sm:max-h-48 lg:max-h-52",
                hintedQuestionId === currentQuestion?.id && "ring-8 ring-amber-100"
              )}
            >
              <h1 className="text-5xl font-black leading-none text-[#10285e] sm:text-6xl lg:text-7xl">
                {currentWord}
              </h1>
            </div>
          </div>

          <div
            className={cn(
              "mx-auto grid min-h-0 w-full grid-cols-1 items-stretch gap-3 sm:gap-3 lg:gap-4",
              getPagedSymbolChoiceGridClass(options.length)
            )}
          >
            {options.map((option) => {
              const selected = selectedAnswer === option;
              const state = checkedOptionState(option, currentQuestion?.answer ?? "", selectedAnswer, isChecked);
              return (
                <button
                  key={`${currentQuestion?.id}-${option}`}
                  type="button"
                  disabled={isChecked}
                  onClick={() => currentQuestion && onChooseAnswer(currentQuestion, option)}
                  aria-pressed={selected}
                  className={cn(
                    "relative grid h-full min-h-0 overflow-hidden rounded-[1.75rem] border-4 bg-white/92 p-2 text-center shadow-[0_12px_0_rgba(147,197,253,0.22),0_24px_40px_rgba(37,99,235,0.12)] transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100 disabled:cursor-default sm:p-3",
                    checkedOptionClass(state, isChecked, shouldShowHint && option === currentQuestion?.answer)
                  )}
                >
                  <CheckedOptionBadge state={state} />
                  <span className="grid h-full min-h-0 place-items-center overflow-hidden rounded-[1.2rem] bg-white/85 p-1 sm:p-2">
                    <SymbolOption value={option} learningItems={learningItems} framed={false} preferNoTextPecs className="!h-full max-h-full" />
                  </span>
                </button>
              );
            })}
          </div>
        </main>

        <CheckStepFooter
          canMoveBack={canMoveBack}
          onBack={onBack}
          message={motivationText}
          isChecked={isChecked}
          isLast={isLast}
          canCheck={Boolean(selectedAnswer)}
          onCheck={() => currentQuestion && onCheck(currentQuestion)}
          onNext={onNext}
        />
      </div>

      {result ? (
        <ActivityResultModal
          activity={activity}
          learningItems={learningItems}
          answers={answers}
          result={result}
          questionIds={resultQuestionIds}
          primaryActionLabel={resultPrimaryActionLabel}
          onPrimaryAction={onResultPrimaryAction}
          isListening={isResultListening}
          onListen={onResultListen}
          highlightedQuestionId={highlightedListenQuestionId}
        />
      ) : null}
    </section>
  );
}
