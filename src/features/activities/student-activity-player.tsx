"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Volume2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

type ActivityScore = {
  score: number;
  correct: number;
  incorrect: number;
};

type StudentActivityPlayerProps = {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  result: ActivityScore | null;
  dragged: string;
  setDragged: (value: string) => void;
  chooseAnswer: (questionId: string, value: string) => void;
  onScore: () => void;
  onReset: () => void;
};

const activityBackgrounds = [
  "/makalearn_activity_backgrounds/cheerful_playground_under_a_pastel_sky.png",
  "/makalearn_activity_backgrounds/cheerful_meadow_with_glowing_sky.png",
  "/makalearn_activity_backgrounds/pastel_sky_with_rolling_hills_and_stage.png",
  "/makalearn_activity_backgrounds/soft_pastel_nursery_with_playful_toys.png",
  "/makalearn_activity_backgrounds/dreamy_pastel_park_scene_for_kids.png"
];

function activityUsesImageOptions(type: Activity["type"]) {
  return type === "match-word-symbol" || type === "choose-correct-symbol" || type === "drag-drop-symbol";
}

function isEmbeddableMediaUrl(value?: string) {
  return Boolean(
    value &&
      (value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("/") ||
        value.startsWith("blob:") ||
        value.startsWith("data:"))
  );
}

function getLearningItemForValue(value: string, learningItems: LearningItem[]) {
  return learningItems.find(
    (item) => item.symbolImageUrl === value || item.gestureMediaUrl === value || item.label === value
  );
}

function getRelatedItem(question: ActivityQuestion, learningItems: LearningItem[]) {
  return learningItems.find((item) => item.id === question.learningItemId);
}

function getDisplayLabel(value: string, learningItems: LearningItem[]) {
  const item = getLearningItemForValue(value, learningItems);
  return item?.label ?? value;
}

function getQuestionTitle(activity: Activity, question: ActivityQuestion, learningItems: LearningItem[]) {
  const item = getRelatedItem(question, learningItems);

  if (activity.type === "match-word-symbol") {
    return item?.label ?? question.prompt.replace(/^Word:\s*/i, "").replace(/^Match the word\s+"?(.+?)"?\s+to.*$/i, "$1");
  }

  return question.prompt;
}

function getFirstHintQuestion(activity: Activity, answers: Record<string, string>) {
  return activity.questions.find((question) => !answers[question.id]) ?? activity.questions[0];
}

function getChoiceGridClass(questionCount: number) {
  if (questionCount <= 1) {
    return "grid-cols-1 place-items-center [&>article]:w-full [&>article]:max-w-[62rem]";
  }

  if (questionCount === 2) {
    return "lg:grid-cols-2";
  }

  if (questionCount === 3) {
    return "lg:grid-cols-3";
  }

  if (questionCount === 4) {
    return "md:grid-cols-2";
  }

  return "md:grid-cols-2 xl:grid-cols-3";
}

function getActivityBackground(activityId: string) {
  const index = activityId.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0) % activityBackgrounds.length;
  return activityBackgrounds[index];
}

function getChoiceTheme(option: string) {
  const themes = [
    {
      card: "border-sky-200 bg-gradient-to-br from-white via-sky-50 to-cyan-100 text-blue-950 shadow-[0_16px_0_rgba(14,165,233,0.18),0_24px_42px_rgba(14,165,233,0.18)]",
      selected: "border-sky-500 ring-sky-200",
      correct: "border-emerald-500 bg-gradient-to-br from-white via-emerald-50 to-lime-100 ring-emerald-200",
      wrong: "border-rose-400 bg-gradient-to-br from-white via-rose-50 to-pink-100 ring-rose-200"
    },
    {
      card: "border-amber-200 bg-gradient-to-br from-white via-yellow-50 to-orange-100 text-blue-950 shadow-[0_16px_0_rgba(245,158,11,0.2),0_24px_42px_rgba(245,158,11,0.18)]",
      selected: "border-amber-500 ring-amber-200",
      correct: "border-emerald-500 bg-gradient-to-br from-white via-emerald-50 to-lime-100 ring-emerald-200",
      wrong: "border-rose-400 bg-gradient-to-br from-white via-rose-50 to-pink-100 ring-rose-200"
    },
    {
      card: "border-violet-200 bg-gradient-to-br from-white via-violet-50 to-fuchsia-100 text-blue-950 shadow-[0_16px_0_rgba(139,92,246,0.18),0_24px_42px_rgba(139,92,246,0.16)]",
      selected: "border-violet-500 ring-violet-200",
      correct: "border-emerald-500 bg-gradient-to-br from-white via-emerald-50 to-lime-100 ring-emerald-200",
      wrong: "border-rose-400 bg-gradient-to-br from-white via-rose-50 to-pink-100 ring-rose-200"
    }
  ];
  const index = option.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0) % themes.length;
  return themes[index];
}

function playAudio(url: string) {
  return new Promise<void>((resolve) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

function speakText(text: string) {
  return new Promise<void>((resolve) => {
    if (!("speechSynthesis" in window)) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export function StudentActivityPlayer({
  activity,
  learningItems,
  answers,
  result,
  dragged,
  setDragged,
  chooseAnswer,
  onScore,
  onReset
}: StudentActivityPlayerProps) {
  const [hintedQuestionId, setHintedQuestionId] = useState("");
  const [isListening, setIsListening] = useState(false);
  const hintTimer = useRef<number | null>(null);
  const backgroundUrl = useMemo(() => getActivityBackground(activity.id), [activity.id]);
  const isDragDropActivity = activity.type === "drag-drop-symbol";

  useEffect(() => {
    return () => {
      if (hintTimer.current) {
        window.clearTimeout(hintTimer.current);
      }
    };
  }, []);

  function showHint() {
    const hintedQuestion = getFirstHintQuestion(activity, answers);
    if (!hintedQuestion) return;

    setHintedQuestionId(hintedQuestion.id);
    if (hintTimer.current) {
      window.clearTimeout(hintTimer.current);
    }
    hintTimer.current = window.setTimeout(() => setHintedQuestionId(""), 1600);
  }

  async function listenToActivity() {
    if (isListening) return;

    setIsListening(true);
    try {
      // Uses browser text-to-speech for the student prompt. Future audio work can
      // prefer teacher-recorded activity instructions when that field exists.
      await speakText(`${activity.title}. ${activity.prompt}`);
    } finally {
      setIsListening(false);
    }
  }

  return (
    <section
      className="relative h-[calc(100vh-1rem)] overflow-hidden rounded-[2rem] border border-white/90 bg-[#cfeeff] shadow-[0_18px_58px_rgba(37,99,235,0.18)]"
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(232,247,255,0.12) 42%, rgba(222,247,210,0.18) 100%), url('${backgroundUrl}')`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0)_28%,rgba(255,255,255,0.1)_100%)]" />
      <div
        className="relative grid h-full grid-rows-[minmax(0,1fr)] gap-2 px-4 pb-24 pt-2 sm:px-5 lg:px-7"
      >
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-5">
          <ActivityGameTopBar
            stacked
            isListening={isListening}
            onHint={showHint}
            onListen={listenToActivity}
          />
        </div>

        <div className="relative z-10 min-h-0">
          <div
            className={cn(
              "mx-auto grid h-full w-full grid-rows-[auto_minmax(0,1fr)] px-1 py-1 sm:px-3",
              isDragDropActivity ? "max-w-[96rem]" : "max-w-[90rem]"
            )}
          >
            <GamePromptCard activity={activity} learningItems={learningItems} />

            {activity.type === "drag-drop-symbol" ? (
              <DragMatchBoard
                activity={activity}
                learningItems={learningItems}
                answers={answers}
                result={result}
                dragged={dragged}
                hintedQuestionId={hintedQuestionId}
                setDragged={setDragged}
                chooseAnswer={chooseAnswer}
              />
            ) : (
              <div className={cn("mt-5 grid min-h-0 gap-4 overflow-visible px-1 sm:px-4", getChoiceGridClass(activity.questions.length))}>
                {activity.questions.map((question, index) => (
                  <QuestionChoicePanel
                    key={question.id}
                    activity={activity}
                    question={question}
                    singleQuestion={activity.questions.length === 1}
                    learningItems={learningItems}
                    selectedAnswer={answers[question.id]}
                    scored={Boolean(result)}
                    hinted={hintedQuestionId === question.id}
                    chooseAnswer={chooseAnswer}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ActivityCornerActions onReset={onReset} onScore={onScore} />
    </section>
  );
}

function ActivityCornerActions({ onReset, onScore }: { onReset: () => void; onScore: () => void }) {
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="absolute bottom-4 left-4 z-20 min-h-16 rounded-[1.45rem] border-4 border-white bg-white/88 px-5 text-xl font-black text-blue-700 shadow-[0_10px_0_rgba(147,197,253,0.5)] sm:left-6 sm:min-w-44"
        onClick={onReset}
      >
        <RotateCcw className="h-7 w-7" aria-hidden="true" />
        Try again
      </Button>
      <Button
        type="button"
        className="absolute bottom-4 right-4 z-20 min-h-16 rounded-[1.45rem] border-4 border-white bg-[#50c819] px-5 text-xl font-black text-white shadow-[0_10px_0_rgba(42,137,19,0.42),0_18px_32px_rgba(67,167,22,0.28)] hover:bg-[#48b513] sm:right-6 sm:min-w-44"
        onClick={onScore}
      >
        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        Check
      </Button>
    </>
  );
}

function ActivityGameTopBar({
  stacked = false,
  isListening,
  onHint,
  onListen
}: {
  stacked?: boolean;
  isListening: boolean;
  onHint: () => void;
  onListen: () => void;
}) {
  return (
    <div className={cn("flex h-full items-center justify-end gap-3", stacked ? "" : "pl-16 sm:pl-20")}>
      <div className={cn("flex justify-end gap-3", stacked ? "flex-col items-stretch" : "")}>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "group min-h-14 rounded-[1.45rem] border-4 border-yellow-200 bg-gradient-to-b from-white to-amber-100 px-4 text-base font-black text-amber-800 shadow-[0_8px_0_rgba(245,158,11,0.22),0_16px_28px_rgba(245,158,11,0.18)] hover:border-amber-300 hover:from-amber-50 hover:to-orange-100 sm:min-h-16 sm:px-6 sm:text-lg",
            stacked ? "w-16 justify-center sm:w-40 sm:justify-start" : ""
          )}
          onClick={onHint}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-400 text-white shadow-[inset_0_-3px_0_rgba(146,64,14,0.22)]">
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Hint</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "group min-h-14 rounded-[1.45rem] border-4 border-sky-200 bg-gradient-to-b from-white to-sky-100 px-4 text-base font-black text-blue-700 shadow-[0_8px_0_rgba(14,165,233,0.2),0_16px_28px_rgba(14,165,233,0.16)] hover:border-sky-300 hover:from-sky-50 hover:to-cyan-100 sm:min-h-16 sm:px-6 sm:text-lg",
            stacked ? "w-16 justify-center sm:w-40 sm:justify-start" : ""
          )}
          onClick={onListen}
          disabled={isListening}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2469ee] text-white shadow-[inset_0_-3px_0_rgba(30,64,175,0.28)]">
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">{isListening ? "Listening" : "Listen"}</span>
        </Button>
      </div>
    </div>
  );
}

function GamePromptCard({ activity, learningItems }: { activity: Activity; learningItems: LearningItem[] }) {
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

function QuestionChoicePanel({
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
              showSymbol={activityUsesImageOptions(activity.type)}
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

function FillBlankPrompt({ prompt, answer }: { prompt: string; answer?: string }) {
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

function LargeAnswerCard({
  option,
  optionIndex,
  learningItems,
  showSymbol,
  selected,
  correct,
  scored,
  onChoose
}: {
  option: string;
  optionIndex: number;
  learningItems: LearningItem[];
  showSymbol: boolean;
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
          ? "relative grid h-[20rem] min-h-0 grid-rows-[minmax(0,1fr)] overflow-hidden rounded-[2rem] border-4 p-3 text-center transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100 sm:h-[22rem] lg:h-[24rem]"
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
        <span className="grid h-full min-h-0 w-full place-items-center overflow-hidden rounded-[1.35rem] bg-white/82 p-2">
          <SymbolOption value={option} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
          <span className="sr-only">{getDisplayLabel(option, learningItems)}</span>
        </span>
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

function DragMatchBoard({
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

function DragChoiceCard({
  value,
  learningItems,
  selected,
  onSelect
}: {
  value: string;
  learningItems: LearningItem[];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onSelect}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "grid h-44 grid-rows-[minmax(0,1fr)_2.75rem] overflow-hidden rounded-[1.5rem] border-4 bg-white/92 text-center shadow-[0_10px_0_rgba(147,197,253,0.22),0_18px_28px_rgba(37,99,235,0.12)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100 sm:h-48",
        selected ? "border-blue-500 ring-8 ring-blue-100" : "border-white hover:border-blue-200"
      )}
    >
      <span className="grid min-h-0 place-items-center overflow-hidden px-3 pt-3">
        <SymbolOption value={value} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
      </span>
      <span className="grid min-h-0 place-items-center border-t border-blue-100 bg-white/92 px-2 text-base font-black uppercase leading-tight text-[#10285e]">
        <span className="line-clamp-2">{getDisplayLabel(value, learningItems)}</span>
      </span>
    </button>
  );
}

function DroppedCardPreview({ value, learningItems }: { value: string; learningItems: LearningItem[] }) {
  return (
    <span className="grid h-full max-h-36 w-full max-w-64 grid-rows-[minmax(0,1fr)_2.25rem] overflow-hidden rounded-[1.25rem] bg-white/88 shadow-[0_8px_18px_rgba(37,99,235,0.12)]">
      <span className="grid min-h-0 place-items-center overflow-hidden px-3 pt-3">
        <SymbolOption value={value} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
      </span>
      <span className="grid min-h-0 place-items-center border-t border-blue-100 bg-white/95 px-2 text-sm font-black uppercase leading-tight text-[#0d255a]">
        <span className="line-clamp-2">{getDisplayLabel(value, learningItems)}</span>
      </span>
    </span>
  );
}

function SymbolOption({
  value,
  learningItems,
  framed = true,
  className
}: {
  value: string;
  learningItems: LearningItem[];
  framed?: boolean;
  className?: string;
}) {
  const item = getLearningItemForValue(value, learningItems);
  const imageValue = item?.symbolImageUrl ?? value;

  if (isEmbeddableMediaUrl(imageValue)) {
    return (
      <span
        className={cn(
          "grid h-20 min-h-0 w-full max-w-full min-w-0 place-items-center sm:h-24",
          framed ? "overflow-hidden rounded-xl border border-slate-200 bg-white" : "overflow-hidden rounded-none bg-transparent",
          className
        )}
      >
        {/* Existing learning item media is rendered as supplied by the content library. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageValue}
          alt={item ? `${item.label} symbol` : "Learning item symbol"}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid h-20 min-h-0 min-w-0 max-w-full place-items-center px-2 text-xl font-black text-blue-700 sm:h-24",
        framed ? "rounded-xl border border-blue-100 bg-[#f8fbff] shadow-inner" : "rounded-none bg-transparent",
        className
      )}
    >
      {imageValue}
      {item ? <span className="sr-only">{item.label} symbol image</span> : null}
    </span>
  );
}
