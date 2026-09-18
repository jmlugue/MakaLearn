"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, RotateCcw, Star, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";
import { activityTypeLabels } from "@/utils/activity-labels";
import { type ActivityScore, shuffleOptions, getCompactSymbolGridClass, getActivityBackground } from "@/features/activities/player/player-utils";
import { ActivityGameTopBar, DragChoiceCard, DroppedCardPreview } from "@/features/activities/player/player-parts";
import { ActivityResultModal } from "@/features/activities/player/activity-result";
import type { Activity, LearningItem } from "@/types";

export function DragDropSymbolStudentLayout({
  activity,
  learningItems,
  answers,
  result,
  dragged,
  hintedQuestionId,
  isListening,
  highlightedListenQuestionId,
  setDragged,
  chooseAnswer,
  onHint,
  onListen,
  onReset,
  onScore,
  onResultListen,
  activityNavigator
}: {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  result: ActivityScore | null;
  dragged: string;
  hintedQuestionId: string;
  isListening: boolean;
  highlightedListenQuestionId: string;
  setDragged: (value: string) => void;
  chooseAnswer: (questionId: string, value: string) => void;
  onHint: () => void;
  onListen: () => void;
  onReset: () => void;
  onScore: (questionIds?: string[]) => void;
  onResultListen: () => void;
  activityNavigator?: ReactNode;
}) {
  const [cardShuffleSeed, setCardShuffleSeed] = useState(() => Math.random());
  const visibleQuestions = activity.questions.slice(0, 5);
  const draggableCards = useMemo(() => {
    const cards = visibleQuestions
      .map((question) => question.answer)
      .filter((value, index, values) => values.indexOf(value) === index);

    return shuffleOptions(cards, cardShuffleSeed);
  }, [cardShuffleSeed, visibleQuestions]);
  const availableDraggableCards = draggableCards.filter(
    (card) => !visibleQuestions.some((question) => answers[question.id] === card)
  );
  const placedCount = visibleQuestions.filter((question) => answers[question.id]).length;
  const checkedCorrect = result?.correct ?? 0;
  const scoreValue = result ? `${result.correct}/${result.correct + result.incorrect}` : `0/${visibleQuestions.length}`;
  const feedbackText = result
    ? result.incorrect === 0
      ? "Great matching!"
      : "Try again with the red matches."
    : hintedQuestionId
      ? "Try the highlighted word first."
      : dragged
        ? "Now choose the matching word."
        : placedCount > 0
          ? "Keep matching the cards."
          : "Drag each picture to its word.";

  function placeCard(questionId: string, value: string) {
    chooseAnswer(questionId, value);
    setDragged("");
  }

  function resetActivity() {
    setCardShuffleSeed(Math.random());
    onReset();
  }

  useEffect(() => {
    setCardShuffleSeed(Math.random());
  }, [activity.id]);

  return (
    <section
      className="fixed inset-0 z-40 grid h-screen w-screen overflow-hidden bg-[#dff5ff] p-2 sm:p-3 lg:p-4"
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
      <div className="grid h-full min-h-0 grid-rows-[3.75rem_minmax(0,1.12fr)_minmax(0,0.88fr)_4.25rem] gap-2 rounded-[2rem] border border-white/80 bg-white/28 p-2 shadow-[0_18px_58px_rgba(37,99,235,0.12)] backdrop-blur-[2px] sm:grid-rows-[4.25rem_minmax(0,1.16fr)_minmax(0,0.84fr)_4.5rem] sm:p-3">
        <header className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3 pl-16 sm:pl-20">
            <div className="min-w-0 rounded-2xl border border-blue-100 bg-white/90 px-3 py-1.5 shadow-sm sm:px-4 sm:py-2">
              <p className="truncate text-sm font-black text-[#10285e] sm:text-lg">{activityTypeLabels[activity.type]}</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 rounded-2xl border border-yellow-100 bg-white/90 px-3 py-1.5 shadow-sm sm:gap-2 sm:px-4 sm:py-2" aria-label={`${checkedCorrect} of ${visibleQuestions.length} matches correct after check`}>
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={index}
                className={cn(
                  "h-6 w-6 sm:h-7 sm:w-7",
                  index < checkedCorrect ? "fill-yellow-300 text-yellow-400" : "fill-white text-yellow-200"
                )}
                aria-hidden="true"
              />
            ))}
          </div>

          <div aria-hidden="true" />
        </header>

        <main className={cn(
          "relative mx-auto grid h-full min-h-0 w-full content-center place-items-center gap-1.5 overflow-hidden sm:gap-2",
          getCompactSymbolGridClass(visibleQuestions.length)
        )}>
          {visibleQuestions.map((question, index) => {
            const answer = answers[question.id];
            const isCorrect = answer === question.answer;
            const scoredAnswer = Boolean(result && answer);
            const hinted = hintedQuestionId === question.id;
            const activelyRead = highlightedListenQuestionId === question.id;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => {
                  if (dragged) {
                    placeCard(question.id, dragged);
                    return;
                  }
                  if (answer) {
                    chooseAnswer(question.id, "");
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragged) {
                    placeCard(question.id, dragged);
                  }
                }}
                className={cn(
                  "mx-auto grid aspect-[3/4] h-auto max-h-full min-h-0 w-full max-w-[13.5rem] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.25rem] border-[3px] bg-white/90 p-2 text-center shadow-[0_5px_0_rgba(147,197,253,0.16),0_10px_20px_rgba(37,99,235,0.08)] transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100 sm:p-2.5",
                  hinted ? "border-amber-400 ring-8 ring-amber-100" : "border-white",
                  activelyRead ? "border-sky-500 ring-8 ring-sky-200 shadow-[0_0_0_6px_rgba(14,165,233,0.18),0_18px_36px_rgba(14,165,233,0.24)]" : "",
                  scoredAnswer && (isCorrect
                    ? "border-emerald-500 bg-emerald-50/95 ring-8 ring-emerald-100 shadow-[0_0_0_6px_rgba(16,185,129,0.16),0_18px_36px_rgba(16,185,129,0.22)]"
                    : "border-rose-500 bg-rose-50/95 ring-8 ring-rose-100 shadow-[0_0_0_6px_rgba(244,63,94,0.16),0_18px_36px_rgba(244,63,94,0.2)]")
                )}
                aria-label={answer ? `Remove card from ${question.prompt}` : `Drop card on ${question.prompt}`}
              >
                <span
                  className={cn(
                    "truncate rounded-lg border px-2 py-1 text-xs font-black uppercase leading-none sm:text-sm lg:text-base",
                    scoredAnswer
                      ? isCorrect
                        ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                        : "border-rose-200 bg-rose-100 text-rose-900"
                      : "border-blue-100 bg-white text-[#10285e]"
                  )}
                >
                  {question.prompt || `Word ${index + 1}`}
                </span>
                <span className="grid min-h-0 place-items-center py-1">
                  {answer ? (
                    <DroppedCardPreview
                      value={answer}
                      learningItems={learningItems}
                      compact
                      resultTone={result ? (isCorrect ? "correct" : "wrong") : "neutral"}
                    />
                  ) : (
                    <span className="grid h-full min-h-0 w-full place-items-center rounded-[1.15rem] border-[3px] border-dashed border-blue-100 bg-sky-50/70 px-2 text-xs font-black text-blue-400 sm:text-sm">
                      Drop card here
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </main>

        <section className={cn(
          "mx-auto grid h-full min-h-0 w-full content-center place-items-center gap-1.5 overflow-hidden pb-1 sm:gap-2",
          getCompactSymbolGridClass(Math.max(availableDraggableCards.length, 1))
        )}>
          {availableDraggableCards.length ? availableDraggableCards.map((card, index) => {
            const selected = dragged === card;
            return (
              <DragChoiceCard
                key={`${card}-${index}`}
                value={card}
                learningItems={learningItems}
                selected={selected}
                onSelect={() => setDragged(card)}
              />
            );
          }) : (
            <div className="mx-auto grid min-h-16 place-items-center rounded-2xl border border-blue-100 bg-white/90 px-5 text-center text-sm font-black text-[#10285e] shadow-sm sm:text-base">
              All cards are placed.
            </div>
          )}
        </section>

        <footer className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,34rem)_minmax(0,1fr)] items-center gap-2 sm:gap-3">
          <div className="flex min-h-12 w-fit items-center gap-2 rounded-2xl border border-yellow-100 bg-white/90 px-3 shadow-sm sm:min-h-14 sm:px-4">
            <Star className="h-6 w-6 fill-yellow-300 text-yellow-400 sm:h-7 sm:w-7" aria-hidden="true" />
            <span className="text-lg font-black text-[#10285e]">{scoreValue}</span>
          </div>

          <div className="mx-auto grid min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl border border-blue-100 bg-white/90 px-3 text-center shadow-sm sm:min-h-14 sm:gap-3 sm:px-4">
            <BrandLogo markClassName="h-9 w-9 rounded-xl sm:h-11 sm:w-11" />
            <p className="text-sm font-black text-[#10285e] sm:text-lg">{feedbackText}</p>
            <span className="h-9 w-9 sm:h-11 sm:w-11" aria-hidden="true" />
          </div>

          <div className="flex justify-end gap-2 sm:gap-3">
            <Button
              type="button"
              className="min-h-12 rounded-2xl border-2 border-green-300 bg-[#50c819] px-3 text-sm font-black text-white shadow-[0_8px_18px_rgba(67,167,22,0.22)] hover:bg-[#48b513] sm:min-h-14 sm:px-5 sm:text-base"
              onClick={() => onScore(visibleQuestions.map((question) => question.id))}
            >
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Check
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-12 rounded-2xl border-2 border-blue-200 bg-blue-100 px-3 text-sm font-black text-blue-800 shadow-[0_8px_18px_rgba(37,99,235,0.14)] hover:bg-blue-200 sm:min-h-14 sm:px-5 sm:text-base"
              onClick={resetActivity}
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              Reset
            </Button>
          </div>
        </footer>
      </div>

      {result ? (
        <ActivityResultModal
          activity={activity}
          learningItems={learningItems}
          answers={answers}
          result={result}
          questionIds={visibleQuestions.map((question) => question.id)}
          primaryActionLabel={result.incorrect === 0 ? "Practice again" : "Try again"}
          onPrimaryAction={resetActivity}
          isListening={isListening}
          onListen={onResultListen}
          highlightedQuestionId={highlightedListenQuestionId}
        />
      ) : null}
    </section>
  );
}

export function DragMatchBoard({
  activity,
  learningItems,
  answers,
  result,
  dragged,
  hintedQuestionId,
  setDragged,
  chooseAnswer
}: {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  result: ActivityScore | null;
  dragged: string;
  hintedQuestionId: string;
  setDragged: (value: string) => void;
  chooseAnswer: (questionId: string, value: string) => void;
}) {
  const uniqueCards = useMemo(() => [...new Set(activity.questions.flatMap((question) => question.options))], [activity.questions]);
  const scored = Boolean(result);
  const holderCount = activity.questions.length;
  const cardCount = uniqueCards.length;

  return (
    <div className="mt-3 grid min-h-0 grid-rows-[minmax(12rem,1fr)_auto] gap-4 overflow-visible">
      <div
        className={cn(
          "mx-auto grid min-h-0 w-full gap-5 px-1 pt-7",
          holderCount === 1 && "max-w-[36rem] grid-cols-1",
          holderCount === 2 && "max-w-[68rem] md:grid-cols-2",
          holderCount === 3 && "max-w-[88rem] md:grid-cols-3",
          holderCount >= 4 && "max-w-[88rem] md:grid-cols-2 xl:grid-cols-4"
        )}
      >
        {activity.questions.map((question) => {
          const answer = answers[question.id];
          const isCorrect = answer === question.answer;

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => dragged && chooseAnswer(question.id, dragged)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dragged && chooseAnswer(question.id, dragged)}
              aria-label={`Place selected card on ${question.prompt}`}
              className={cn(
                "relative flex min-h-[11.5rem] flex-col items-center overflow-visible rounded-[2rem] border-4 border-white bg-white/82 px-4 pb-4 pt-10 text-center shadow-[0_14px_0_rgba(147,197,253,0.22),0_24px_42px_rgba(37,99,235,0.12)] transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100 sm:min-h-[13rem] lg:min-h-[14.5rem]",
                hintedQuestionId === question.id ? "ring-8 ring-amber-100" : "",
                scored && answer && (isCorrect ? "bg-emerald-50/90 ring-8 ring-emerald-100" : "bg-rose-50/90 ring-8 ring-rose-100")
              )}
            >
              <span className="absolute -top-6 left-1/2 max-w-[88%] -translate-x-1/2 rounded-[1.3rem] border-4 border-blue-100 bg-white px-8 py-2 text-xl font-black uppercase leading-none text-[#10285e] shadow-[0_6px_0_rgba(147,197,253,0.28)] sm:text-2xl">
                {question.prompt}
              </span>
              <span className="grid h-full min-h-0 w-full flex-1 place-items-center">
                {answer ? (
                  <DroppedCardPreview value={answer} learningItems={learningItems} />
                ) : (
                  <span className="h-14 w-full max-w-44 rounded-[1.25rem] bg-white/28" aria-hidden="true" />
                )}
              </span>
              {scored && answer ? (
                <span className={cn("absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-white shadow-sm", isCorrect ? "bg-emerald-500" : "bg-rose-500")}>
                  {isCorrect ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <XCircle className="h-5 w-5" aria-hidden="true" />}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 px-1 pb-1">
        <div
          className={cn(
            "mx-auto grid min-h-0 w-full gap-3",
            cardCount === 1 && "max-w-[18rem] grid-cols-1",
            cardCount === 2 && "max-w-[38rem] grid-cols-2",
            cardCount === 3 && "max-w-[58rem] grid-cols-3",
            cardCount >= 4 && "max-w-[88rem] grid-cols-2 sm:grid-cols-4"
          )}
        >
          {uniqueCards.map((card) => (
            <DragChoiceCard
              key={card}
              value={card}
              learningItems={learningItems}
              selected={dragged === card}
              onSelect={() => setDragged(card)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
