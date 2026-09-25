"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getDisplayLabel, getQuestionTitle } from "@/features/activities/player/player-utils";
import { StudentPictureCard, StudentResultBadge } from "@/features/activities/player/student-game-parts";
import { studentText } from "@/features/activities/player/student-theme";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

/**
 * Match, Choose the picture, and Fill in the blank in Student mode: one question and its picture cards.
 * One tap answers. After that the right card is green, a wrong pick red, and the rest fade. On a wrong pick the
 * cards shake, the pick is tagged "Not this one", and the right card grows and glows with "This one!" (no pop-up).
 */
export function StudentChoiceBoard({
  activity,
  question,
  options,
  learningItems,
  picked,
  locked,
  eliminated,
  beingRead,
  onPick
}: {
  activity: Activity;
  question: ActivityQuestion;
  options: string[];
  learningItems: LearningItem[];
  picked?: string;
  /** Answered: cards no longer respond. */
  locked: boolean;
  /** Wrong cards taken away by Hint. */
  eliminated: string[];
  beingRead: boolean;
  onPick: (option: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const missed = locked && picked !== question.answer;
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 sm:gap-4">
      <div
        className={cn(
          "mx-auto grid min-h-24 w-full max-w-5xl place-items-center rounded-[2rem] border-4 border-white bg-white/95 px-4 py-3 text-center shadow-[0_10px_0_rgba(147,197,253,0.26),0_22px_40px_rgba(37,99,235,0.12)] transition sm:min-h-28 sm:px-6",
          beingRead && "border-sky-400 ring-8 ring-sky-100"
        )}
      >
        <QuestionText activity={activity} question={question} learningItems={learningItems} filled={locked ? question.answer : undefined} />
      </div>

      <motion.div
        key={`${question.id}-${missed ? "missed" : "open"}`}
        animate={missed && !reduceMotion ? { x: [0, -14, 14, -10, 10, -5, 5, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "mx-auto grid h-full min-h-0 w-full max-w-6xl gap-3 sm:gap-4",
          options.length <= 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-2 grid-rows-2 sm:grid-cols-4 sm:grid-rows-1"
        )}
      >
        {options.map((option) => {
          const isAnswer = option === question.answer;
          const isPicked = option === picked;
          const removed = eliminated.includes(option);
          const tone = locked ? (isAnswer ? "correct" : isPicked ? "wrong" : "faded") : removed ? "removed" : "idle";
          return (
            <div key={`${question.id}-${option}`} className="grid min-h-0 place-items-center [container-type:size]">
              <button
                type="button"
                disabled={locked || removed}
                onClick={() => onPick(option)}
                className="w-[min(100cqw,75cqh,16rem)] rounded-[1.5rem] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-blue-300 disabled:cursor-default"
                aria-label={getDisplayLabel(option, learningItems)}
              >
                <motion.span
                  className="relative block"
                  animate={missed && isAnswer && !reduceMotion ? { scale: [1, 1, 1.1, 1.04, 1.1, 1.06] } : { scale: 1 }}
                  transition={{ duration: 1.4, times: [0, 0.35, 0.55, 0.7, 0.85, 1] }}
                >
                {missed && (isAnswer || isPicked) ? (
                  <span
                    className={cn(
                      "absolute -top-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border-4 border-white px-4 py-1 text-lg font-black text-white shadow-md",
                      isAnswer ? "bg-emerald-500" : "bg-rose-500"
                    )}
                  >
                    {isAnswer ? "This one!" : "Not this one"}
                  </span>
                ) : null}
                <StudentPictureCard
                  value={option}
                  learningItems={learningItems}
                  className={cn(
                    "w-full",
                    tone === "idle" && "hover:-translate-y-1 hover:border-blue-300",
                    tone === "correct" && "border-emerald-500 ring-8 ring-emerald-200",
                    tone === "correct" && missed && "shadow-[0_0_0_10px_rgba(16,185,129,0.25),0_0_40px_rgba(16,185,129,0.55)]",
                    tone === "wrong" && "border-rose-500 ring-8 ring-rose-200",
                    tone === "faded" && "opacity-50",
                    tone === "removed" && "opacity-25 grayscale"
                  )}
                >
                  {tone === "correct" ? <StudentResultBadge tone="correct" /> : null}
                  {tone === "wrong" ? <StudentResultBadge tone="wrong" /> : null}
                </StudentPictureCard>
                </motion.span>
              </button>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

function QuestionText({
  activity,
  question,
  learningItems,
  filled
}: {
  activity: Activity;
  question: ActivityQuestion;
  learningItems: LearningItem[];
  /** After an answer: the right card, whose word fills the gap. */
  filled?: string;
}) {
  if (activity.type === "fill-blank") {
    return <FillBlankSentence prompt={question.prompt} answer={filled ? getDisplayLabel(filled, learningItems) : ""} />;
  }
  return <h1 className={studentText.question}>{getQuestionTitle(activity, question, learningItems) || activity.prompt}</h1>;
}

/**
 * The sentence with its gap. After an answer, the right card's word fills the gap. Most sentences start with
 * a short situation ("My friend took my toy without asking."), shown on its own line so the gap line stays short.
 */
function FillBlankSentence({ prompt, answer }: { prompt: string; answer: string }) {
  const [before, after] = prompt.split("____");
  if (after === undefined) {
    return <h1 className={studentText.question}>{prompt}</h1>;
  }
  const situationEnd = Math.max(before.lastIndexOf(". "), before.lastIndexOf("? "), before.lastIndexOf("! "));
  const situation = situationEnd >= 0 ? before.slice(0, situationEnd + 1).trim() : "";
  const lead = (situationEnd >= 0 ? before.slice(situationEnd + 1) : before).trim();
  return (
    <div className="grid gap-2 sm:gap-3">
      {situation ? <p className={studentText.lead}>{situation}</p> : null}
      <h1 className={cn("flex flex-wrap items-center justify-center gap-x-3 gap-y-2", studentText.question)}>
        {lead ? <span>{lead}</span> : null}
        <span className="inline-grid min-h-12 min-w-32 place-items-center rounded-2xl border-4 border-dashed border-blue-300 bg-[#f8fbff] px-4 text-blue-700 sm:min-h-14 sm:min-w-40">
          {answer}
        </span>
        {after.trim() ? <span>{after.trim()}</span> : null}
      </h1>
    </div>
  );
}
