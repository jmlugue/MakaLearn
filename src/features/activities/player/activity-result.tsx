"use client";

import { Home, RotateCcw, Star, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StudentPictureCard, StudentResultBadge } from "@/features/activities/player/student-game-parts";
import { studentButton, studentText } from "@/features/activities/player/student-theme";
import type { Activity, LearningItem } from "@/types";

/**
 * The Student mode score pop-up at the end of a round. View only, nothing is saved. Each card shows the right
 * answer with a tick when the child got it first time, a cross when not. In drag and drop every card ends up
 * right, so a card that needed another try gets an amber turn arrow instead of a cross.
 */
export function ActivityResultModal({
  activity,
  learningItems,
  firstTryRight,
  retries = false,
  questionIds,
  onPlayAgain,
  onHome,
  isListening = false,
  onListen,
  highlightedQuestionId = ""
}: {
  activity: Activity;
  learningItems: LearningItem[];
  /** Question id to whether the first answer was right. */
  firstTryRight: Record<string, boolean>;
  /** Drag and drop: wrong tries are retried until right. */
  retries?: boolean;
  questionIds: string[];
  onPlayAgain: () => void;
  onHome: () => void;
  isListening?: boolean;
  onListen?: () => void;
  highlightedQuestionId?: string;
}) {
  const questions = activity.questions.filter((question) => questionIds.includes(question.id));
  const correct = questions.filter((question) => firstTryRight[question.id]).length;
  const total = questions.length;
  const allRight = total > 0 && correct === total;

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center bg-sky-950/25 px-3 py-6 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-result-title"
        className={cn(
          "activity-result-panel relative max-h-[92dvh] w-full max-w-3xl overflow-hidden rounded-[2rem] border-4 bg-[#fff] p-5 text-center shadow-[0_24px_80px_rgba(37,99,235,0.25)] sm:p-7",
          allRight ? "border-emerald-200" : "border-blue-200"
        )}
      >
        {allRight ? (
          <div className="activity-confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} className="activity-confetti-piece" />
            ))}
          </div>
        ) : null}
        <div className="relative grid max-h-[calc(92dvh-3rem)] justify-items-center gap-4 overflow-y-auto clean-scrollbar">
          <h2 id="activity-result-title" className={cn(studentText.popupTitle, allRight ? "text-emerald-600" : "text-blue-700")}>
            {allRight ? "Great job!" : retries ? "You did it!" : "Good try!"}
          </h2>
          <div className="flex items-center gap-1" aria-hidden="true">
            {questions.map((question, index) => (
              <Star
                key={question.id}
                className={cn("h-9 w-9 sm:h-11 sm:w-11", index < correct ? "fill-yellow-300 text-yellow-400" : "fill-white text-yellow-200")}
              />
            ))}
          </div>
          <p className="text-2xl font-black text-[#10285e] sm:text-3xl">
            {retries ? `${correct} of ${total} right` : `Score ${correct} / ${total}`}
          </p>
          {retries && !allRight ? (
            <p className="-mt-2 inline-flex items-center gap-2 text-lg font-bold text-slate-600">
              <StudentResultBadgeInline /> needed another try
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-3">
            {questions.map((question) => (
              <StudentPictureCard
                key={question.id}
                value={question.answer}
                learningItems={learningItems}
                className={cn(
                  "w-24 sm:w-28",
                  firstTryRight[question.id] ? "border-emerald-400" : retries ? "border-amber-300" : "border-rose-300",
                  highlightedQuestionId === question.id && "ring-8 ring-sky-200"
                )}
              >
                <StudentResultBadge tone={firstTryRight[question.id] ? "correct" : retries ? "retry" : "wrong"} />
              </StudentPictureCard>
            ))}
          </div>
          <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
            {onListen ? (
              <button type="button" className={cn(studentButton.base, studentButton.secondary)} onClick={onListen} disabled={isListening}>
                <Volume2 className="h-6 w-6" aria-hidden="true" />
                {isListening ? "Listening" : "Listen"}
              </button>
            ) : null}
            <button type="button" className={cn(studentButton.base, studentButton.secondary)} onClick={onHome}>
              <Home className="h-6 w-6" aria-hidden="true" />
              All activities
            </button>
            <button type="button" className={cn(studentButton.base, studentButton.primary)} onClick={onPlayAgain} autoFocus>
              <RotateCcw className="h-6 w-6" aria-hidden="true" />
              Play again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The amber turn arrow, inline in the legend line. */
function StudentResultBadgeInline() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-400 text-white" aria-hidden="true">
      <RotateCcw className="h-4 w-4" strokeWidth={3} />
    </span>
  );
}
