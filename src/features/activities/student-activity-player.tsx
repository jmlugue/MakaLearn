"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Lightbulb,
  Library,
  RotateCcw,
  Star,
  Volume2,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";
import { activityTypeLabels } from "@/utils/activity-labels";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

type ActivityScore = {
  score: number;
  correct: number;
  incorrect: number;
};

type StudentActivityPlayerProps = {
  activity: Activity;
  activities?: Activity[];
  learningItems: LearningItem[];
  answers: Record<string, string>;
  result: ActivityScore | null;
  dragged: string;
  setDragged: (value: string) => void;
  chooseAnswer: (questionId: string, value: string) => void;
  onScore: (questionIds?: string[]) => void;
  onClearResult: () => void;
  onReset: () => void;
  onSelectActivity?: (activityId: string) => void;
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

function normalizeSpokenText(text: string) {
  return text
    .replace(/\bPECS\b/gi, "pecks")
    .replace(/_{2,}/g, "blank")
    .replace(/\s+/g, " ")
    .trim();
}

function completeSentencePrompt(prompt: string, answer: string) {
  const completed = prompt.includes("____")
    ? prompt.replace(/____/g, answer.toLowerCase())
    : `${prompt} ${answer}`;

  return normalizeSpokenText(completed);
}

function getQuestionListenText(activity: Activity, question: ActivityQuestion, learningItems: LearningItem[]) {
  if (activity.type === "match-word-symbol") {
    return normalizeSpokenText(getQuestionTitle(activity, question, learningItems));
  }

  return normalizeSpokenText(question.prompt);
}

function getActivityQuestionListenItems(activity: Activity, learningItems: LearningItem[], answers: Record<string, string>) {
  const visibleQuestions = activity.questions.slice(0, 5);
  const unansweredQuestions = visibleQuestions.filter((question) => !answers[question.id]);
  const questionsToRead = unansweredQuestions.length ? unansweredQuestions : visibleQuestions;

  return questionsToRead
    .map((question) => ({ id: question.id, text: getQuestionListenText(activity, question, learningItems) }))
    .filter((item) => item.text);
}

function getAnsweredQuestionListenText(
  activity: Activity,
  question: ActivityQuestion,
  answers: Record<string, string>,
  learningItems: LearningItem[]
) {
  const answer = getDisplayLabel(answers[question.id] || question.answer, learningItems);

  if (activity.type === "fill-blank") {
    return completeSentencePrompt(question.prompt, answer);
  }

  if (activity.type === "match-word-symbol" || activity.type === "drag-drop-symbol") {
    return normalizeSpokenText(getQuestionTitle(activity, question, learningItems));
  }

  return normalizeSpokenText(`${question.prompt} ${answer}`);
}

function getCorrectResultListenItems(
  activity: Activity,
  learningItems: LearningItem[],
  answers: Record<string, string>,
  questionIds: string[]
) {
  const completedQuestions = questionIds.length
    ? activity.questions.filter((question) => questionIds.includes(question.id))
    : activity.questions.slice(0, 5);

  return completedQuestions
    .map((question) => ({ id: question.id, text: getAnsweredQuestionListenText(activity, question, answers, learningItems) }))
    .filter((item) => item.text);
}

function getSymbolOptionValue(item: LearningItem) {
  return item.symbolImageUrl ?? item.label;
}

function seededRandom(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function shuffleOptions(options: string[], seed: number) {
  const shuffled = [...options];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(seededRandom(seed + index * 97) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function getMatchWordOptions(question: ActivityQuestion, learningItems: LearningItem[], shuffleSeed: number) {
  const libraryOptions = learningItems
    .filter((item) => item.contentType === "pecs" && item.symbolImageUrl)
    .map(getSymbolOptionValue)
    .filter((value) => value && value !== question.answer);
  const fallbackOptions = question.options.filter((value) => value && value !== question.answer);
  const optionPool = [...libraryOptions, ...fallbackOptions].filter(
    (value, index, values) => values.indexOf(value) === index
  );
  const randomizedDistractors = shuffleOptions(optionPool, shuffleSeed);
  const choices = [question.answer, ...randomizedDistractors.slice(0, 4)];

  return shuffleOptions(choices, shuffleSeed + 211);
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

function getCompactSymbolGridClass(itemCount: number) {
  if (itemCount <= 1) {
    return "max-w-[14rem] grid-cols-1";
  }

  if (itemCount === 2) {
    return "max-w-[30rem] grid-cols-2";
  }

  if (itemCount === 3) {
    return "max-w-[44rem] grid-cols-3";
  }

  if (itemCount === 4) {
    return "max-w-[56rem] grid-cols-2 sm:grid-cols-4";
  }

  return "max-w-[70rem] grid-cols-3 sm:grid-cols-5";
}

function getPagedSymbolChoiceGridClass(itemCount: number) {
  if (itemCount <= 1) {
    return "max-w-[18rem] grid-cols-1";
  }

  if (itemCount === 2) {
    return "max-w-[40rem] sm:grid-cols-2";
  }

  if (itemCount === 3) {
    return "max-w-[62rem] sm:grid-cols-3";
  }

  if (itemCount === 4) {
    return "max-w-[76rem] sm:grid-cols-4";
  }

  return "max-w-none sm:grid-cols-5";
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

async function speakTextSequence(
  items: Array<{ id: string; text: string }>,
  onActiveItemChange: (id: string) => void
) {
  for (const item of items) {
    onActiveItemChange(item.id);
    await speakText(item.text);
  }

  onActiveItemChange("");
}

export function StudentActivityPlayer({
  activity,
  activities = [],
  learningItems,
  answers,
  result,
  dragged,
  setDragged,
  chooseAnswer,
  onScore,
  onClearResult,
  onReset,
  onSelectActivity
}: StudentActivityPlayerProps) {
  const [hintedQuestionId, setHintedQuestionId] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [matchQuestionIndex, setMatchQuestionIndex] = useState(0);
  const [chooseQuestionIndex, setChooseQuestionIndex] = useState(0);
  const [matchFeedback, setMatchFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [matchOptionRound, setMatchOptionRound] = useState(0);
  const [resultQuestionIds, setResultQuestionIds] = useState<string[]>([]);
  const [highlightedListenQuestionId, setHighlightedListenQuestionId] = useState("");
  const hintTimer = useRef<number | null>(null);
  const onScoreRef = useRef(onScore);
  const backgroundUrl = useMemo(() => getActivityBackground(activity.id), [activity.id]);

  useEffect(() => {
    onScoreRef.current = onScore;
  }, [onScore]);

  useEffect(() => {
    setMatchQuestionIndex(0);
    setChooseQuestionIndex(0);
    setHintedQuestionId("");
    setMatchFeedback("idle");
    setMatchOptionRound((current) => current + 1);
    setResultQuestionIds([]);
    setHighlightedListenQuestionId("");
  }, [activity.id]);

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

    const items = getActivityQuestionListenItems(activity, learningItems, answers);
    if (!items.length) return;

    setIsListening(true);
    try {
      await speakTextSequence(items, setHighlightedListenQuestionId);
    } finally {
      setHighlightedListenQuestionId("");
      setIsListening(false);
    }
  }

  async function listenToMatchQuestion() {
    if (isListening) return;

    const totalSteps = Math.min(activity.questions.length, 5);
    const question = activity.questions[Math.min(matchQuestionIndex, Math.max(totalSteps - 1, 0))];
    const text = question ? getQuestionListenText(activity, question, learningItems) : "";
    if (!text) return;

    setIsListening(true);
    try {
      await speakTextSequence([{ id: question.id, text }], setHighlightedListenQuestionId);
    } finally {
      setHighlightedListenQuestionId("");
      setIsListening(false);
    }
  }

  async function listenToChooseQuestion() {
    if (isListening) return;

    const totalSteps = Math.min(activity.questions.length, 5);
    const question = activity.questions[Math.min(chooseQuestionIndex, Math.max(totalSteps - 1, 0))];
    const text = question ? getQuestionListenText(activity, question, learningItems) : "";
    if (!text) return;

    setIsListening(true);
    try {
      await speakTextSequence([{ id: question.id, text }], setHighlightedListenQuestionId);
    } finally {
      setHighlightedListenQuestionId("");
      setIsListening(false);
    }
  }

  function scoreQuestions(questionIds: string[]) {
    setResultQuestionIds(questionIds);
    window.setTimeout(() => onScoreRef.current(questionIds), 0);
  }

  function clearResultAndKeepAnswers() {
    setResultQuestionIds([]);
    onClearResult();
  }

  function retryResultQuestions() {
    resultQuestionIds.forEach((questionId) => chooseAnswer(questionId, ""));
    setResultQuestionIds([]);
  }

  function chooseAnswerAndScoreQuestion(questionId: string, value: string) {
    chooseAnswer(questionId, value);
    scoreQuestions([questionId]);
  }

  function choosePagedChoiceAnswer(question: ActivityQuestion, value: string) {
    const totalSteps = Math.min(activity.questions.length, 5);
    const visibleQuestions = activity.questions.slice(0, totalSteps);
    const visibleQuestionIds = visibleQuestions.map((visibleQuestion) => visibleQuestion.id);
    const questionIndex = visibleQuestions.findIndex((visibleQuestion) => visibleQuestion.id === question.id);
    const nextAnswers = { ...answers, [question.id]: value };

    chooseAnswer(question.id, value);

    if (visibleQuestions.every((visibleQuestion) => nextAnswers[visibleQuestion.id])) {
      scoreQuestions(visibleQuestionIds);
      return;
    }

    if (questionIndex >= 0 && questionIndex + 1 < totalSteps) {
      window.setTimeout(() => {
        setChooseQuestionIndex(questionIndex + 1);
      }, 220);
    }
  }

  function chooseMatchAnswer(question: ActivityQuestion, option: string) {
    const nextAnswers = { ...answers, [question.id]: option };
    chooseAnswer(question.id, option);

    if (option !== question.answer) {
      setMatchFeedback("wrong");
      scoreQuestions([question.id]);
      return;
    }

    setMatchFeedback("correct");

    const totalSteps = Math.min(activity.questions.length, 5);
    const visibleQuestionIds = activity.questions.slice(0, totalSteps).map((visibleQuestion) => visibleQuestion.id);
    const allVisibleAnswersCorrect = visibleQuestionIds.length > 0 && activity.questions
      .slice(0, totalSteps)
      .every((visibleQuestion) => nextAnswers[visibleQuestion.id] === visibleQuestion.answer);

    if (allVisibleAnswersCorrect) {
      scoreQuestions(visibleQuestionIds);
      return;
    }

    window.setTimeout(() => {
      if (matchQuestionIndex + 1 < totalSteps) {
        setMatchQuestionIndex(matchQuestionIndex + 1);
        setMatchFeedback("idle");
      }
    }, 280);
  }

  function getResultPrimaryAction() {
    if (activity.type === "match-word-symbol") {
      return {
        label: result?.incorrect === 0 ? "Practice again" : "Try again",
        action: result?.incorrect === 0 ? onReset : retryResultQuestions
      };
    }

    if (activity.type === "drag-drop-symbol") {
      return {
        label: result?.incorrect === 0 ? "Practice again" : "Try again",
        action: onReset
      };
    }

    return {
      label: result?.incorrect === 0 ? "Continue" : "Try again",
      action: result?.incorrect === 0 ? clearResultAndKeepAnswers : retryResultQuestions
    };
  }

  const resultPrimaryAction = getResultPrimaryAction();
  const visibleResultQuestionIds = resultQuestionIds.length
    ? resultQuestionIds
    : activity.questions.slice(0, 5).map((question) => question.id);

  function scoreDragDropQuestions(questionIds?: string[]) {
    scoreQuestions(
      questionIds?.length
        ? questionIds
        : activity.questions.slice(0, 5).map((question) => question.id)
    );
  }

  async function listenToCorrectResult() {
    if (isListening || !result || result.incorrect > 0) return;

    const items = getCorrectResultListenItems(activity, learningItems, answers, visibleResultQuestionIds);
    if (!items.length) return;

    setIsListening(true);
    try {
      await speakTextSequence(items, setHighlightedListenQuestionId);
    } finally {
      setHighlightedListenQuestionId("");
      setIsListening(false);
    }
  }

  const activityNavigator = (
    <StudentActivityNavigator
      activities={activities}
      activeActivityId={activity.id}
      onSelectActivity={onSelectActivity}
    />
  );

  if (activity.type === "match-word-symbol") {
    return (
      <MatchWordSymbolStudentLayout
        activity={activity}
        learningItems={learningItems}
        answers={answers}
        currentQuestionIndex={matchQuestionIndex}
        hintedQuestionId={hintedQuestionId}
        matchFeedback={matchFeedback}
        optionSetVersion={matchOptionRound}
        isListening={isListening}
        highlightedListenQuestionId={highlightedListenQuestionId}
        result={result}
        resultQuestionIds={visibleResultQuestionIds}
        resultPrimaryActionLabel={resultPrimaryAction.label}
        onResultPrimaryAction={resultPrimaryAction.action}
        isResultListening={isListening}
        onResultListen={listenToCorrectResult}
        onHint={() => {
          const totalSteps = Math.min(activity.questions.length, 5);
          const question = activity.questions[Math.min(matchQuestionIndex, Math.max(totalSteps - 1, 0))];
          if (!question) return;

          setHintedQuestionId(question.id);
          if (hintTimer.current) {
            window.clearTimeout(hintTimer.current);
          }
          hintTimer.current = window.setTimeout(() => setHintedQuestionId(""), 1600);
        }}
        onListen={listenToMatchQuestion}
        onReset={() => {
          setMatchQuestionIndex(0);
          setMatchFeedback("idle");
          setMatchOptionRound((current) => current + 1);
          onReset();
        }}
        onBack={() => {
          setMatchFeedback("idle");
          setMatchQuestionIndex((current) => (current > 0 ? current - 1 : current));
        }}
        onNext={() => {
          const totalSteps = Math.min(activity.questions.length, 5);
          setMatchFeedback("idle");
          setMatchQuestionIndex((current) => (current + 1 < totalSteps ? current + 1 : current));
        }}
        onChooseAnswer={chooseMatchAnswer}
        activityNavigator={activityNavigator}
      />
    );
  }

  if (activity.type === "choose-correct-symbol") {
    const totalSteps = Math.min(activity.questions.length, 5);

    return (
      <ChooseCorrectSymbolStudentLayout
        activity={activity}
        learningItems={learningItems}
        answers={answers}
        currentQuestionIndex={chooseQuestionIndex}
        hintedQuestionId={hintedQuestionId}
        isListening={isListening}
        highlightedListenQuestionId={highlightedListenQuestionId}
        result={result}
        resultQuestionIds={visibleResultQuestionIds}
        resultPrimaryActionLabel={resultPrimaryAction.label}
        onResultPrimaryAction={resultPrimaryAction.action}
        isResultListening={isListening}
        onResultListen={listenToCorrectResult}
        onHint={() => {
          const question = activity.questions[Math.min(chooseQuestionIndex, Math.max(totalSteps - 1, 0))];
          if (!question) return;

          setHintedQuestionId(question.id);
          if (hintTimer.current) {
            window.clearTimeout(hintTimer.current);
          }
          hintTimer.current = window.setTimeout(() => setHintedQuestionId(""), 1600);
        }}
        onListen={listenToChooseQuestion}
        onReset={() => {
          setChooseQuestionIndex(0);
          onReset();
        }}
        onBack={() => {
          setChooseQuestionIndex((current) => (current > 0 ? current - 1 : current));
        }}
        onNext={() => {
          setChooseQuestionIndex((current) => (current + 1 < totalSteps ? current + 1 : current));
        }}
        onChooseAnswer={choosePagedChoiceAnswer}
        activityNavigator={activityNavigator}
      />
    );
  }

  if (activity.type === "drag-drop-symbol") {
    return (
      <DragDropSymbolStudentLayout
        activity={activity}
        learningItems={learningItems}
        answers={answers}
        result={result}
        dragged={dragged}
        hintedQuestionId={hintedQuestionId}
        isListening={isListening}
        highlightedListenQuestionId={highlightedListenQuestionId}
        setDragged={setDragged}
        chooseAnswer={chooseAnswer}
        onHint={showHint}
        onListen={listenToActivity}
        onReset={onReset}
        onScore={scoreDragDropQuestions}
        onResultListen={listenToCorrectResult}
        activityNavigator={activityNavigator}
      />
    );
  }

  return (
    <>
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
              activityNavigator={activityNavigator}
            />
          </div>

          <div className="relative z-10 min-h-0">
            <div
              className="mx-auto grid h-full w-full max-w-[90rem] grid-rows-[auto_minmax(0,1fr)] px-1 py-1 sm:px-3"
            >
              <GamePromptCard activity={activity} learningItems={learningItems} />

              <div className={cn("mt-5 grid min-h-0 gap-4 overflow-visible px-1 sm:px-4", getChoiceGridClass(activity.questions.length))}>
                {activity.questions.map((question) => (
                  <QuestionChoicePanel
                    key={question.id}
                    activity={activity}
                    question={question}
                    singleQuestion={activity.questions.length === 1}
                    learningItems={learningItems}
                    selectedAnswer={answers[question.id]}
                    scored={Boolean(result)}
                    hinted={hintedQuestionId === question.id}
                    chooseAnswer={chooseAnswerAndScoreQuestion}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <ActivityResetAction onReset={onReset} />

        {result ? (
          <ActivityResultModal
            activity={activity}
            learningItems={learningItems}
            answers={answers}
            result={result}
            questionIds={visibleResultQuestionIds}
            primaryActionLabel={resultPrimaryAction.label}
            onPrimaryAction={resultPrimaryAction.action}
            isListening={isListening}
            onListen={listenToCorrectResult}
            highlightedQuestionId={highlightedListenQuestionId}
          />
        ) : null}
      </section>
    </>
  );
}

function StudentActivityNavigator({
  activities,
  activeActivityId,
  onSelectActivity
}: {
  activities: Activity[];
  activeActivityId: string;
  onSelectActivity?: (activityId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!onSelectActivity || activities.length <= 1) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        className="group min-h-14 w-16 justify-center rounded-[1.45rem] border-4 border-sky-200 bg-gradient-to-b from-white to-sky-100 px-4 text-base font-black text-blue-700 shadow-[0_14px_28px_rgba(14,165,233,0.18)] hover:border-sky-300 hover:from-sky-50 hover:to-cyan-100 sm:min-h-16 sm:w-40 sm:justify-start sm:px-6 sm:text-lg"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="student-activity-switcher"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2469ee] text-white shadow-[inset_0_-3px_0_rgba(30,64,175,0.28)]">
          <Library className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">Activities</span>
      </Button>

      {open ? (
        <div
          id="student-activity-switcher"
          className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-[1.4rem] border-4 border-white bg-white/95 p-3 shadow-[0_18px_45px_rgba(37,99,235,0.22)] backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center gap-2 px-1 text-sm font-black uppercase text-blue-700">
            <Library className="h-5 w-5" aria-hidden="true" />
            Choose activity
          </div>
          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1 clean-scrollbar">
            {activities.map((candidate) => {
              const active = candidate.id === activeActivityId;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  disabled={active}
                  onClick={() => {
                    setOpen(false);
                    onSelectActivity(candidate.id);
                  }}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3 text-left text-sm font-black leading-5 transition",
                    active
                      ? "border-blue-500 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)]"
                      : "border-blue-100 bg-sky-50 text-[#10285e] hover:border-blue-300 hover:bg-white"
                  )}
                >
                  <span className="line-clamp-2">{candidate.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DragDropSymbolStudentLayout({
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

function ChooseCorrectSymbolStudentLayout({
  activity,
  learningItems,
  answers,
  currentQuestionIndex,
  hintedQuestionId,
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
  activityNavigator
}: {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  currentQuestionIndex: number;
  hintedQuestionId: string;
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
  activityNavigator?: ReactNode;
}) {
  const totalSteps = Math.min(activity.questions.length, 5);
  const safeQuestionIndex = Math.min(currentQuestionIndex, Math.max(totalSteps - 1, 0));
  const currentQuestion = activity.questions[safeQuestionIndex];
  const currentOptions = currentQuestion?.options ?? [];
  const currentStep = safeQuestionIndex + 1;
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canMoveBack = totalSteps > 1 && safeQuestionIndex > 0;
  const canMoveNext = totalSteps > 1 && safeQuestionIndex + 1 < totalSteps;
  const activelyRead = highlightedListenQuestionId === currentQuestion?.id;
  const feedbackText = selectedAnswer
    ? "Nice choice."
    : hintedQuestionId === currentQuestion?.id
      ? "Look for the highlighted picture."
      : "Choose the picture that answers the question.";

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
      <div className="grid h-full min-h-0 grid-rows-[5rem_minmax(0,1fr)_5.5rem] gap-3 rounded-[2rem] border border-white/80 bg-white/28 p-3 shadow-[0_18px_58px_rgba(37,99,235,0.12)] backdrop-blur-[2px] sm:grid-rows-[5.5rem_minmax(0,1fr)_5.75rem] sm:gap-4 sm:p-4">
        <header className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3 pl-16 sm:pl-20">
            <div className="min-w-0 rounded-2xl border border-blue-100 bg-white/90 px-4 py-2 shadow-sm">
              <p className="truncate text-base font-black text-[#10285e] sm:text-lg">{activityTypeLabels[activity.type]}</p>
            </div>
          </div>

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
                hintedQuestionId === currentQuestion?.id && "ring-8 ring-amber-100",
                activelyRead && "border-sky-400 ring-8 ring-sky-100"
              )}
            >
              <h1 className="text-2xl font-black leading-tight text-[#10285e] sm:text-4xl lg:text-5xl">
                {currentQuestion?.prompt ?? activity.prompt}
              </h1>
            </div>
          </div>

          <div className={cn(
            "mx-auto grid min-h-0 w-full grid-cols-1 items-stretch gap-3 sm:gap-3 lg:gap-4",
            getPagedSymbolChoiceGridClass(currentOptions.length)
          )}>
            {currentOptions.map((option) => {
              const selected = selectedAnswer === option;
              const shouldShowHint = hintedQuestionId === currentQuestion?.id && option === currentQuestion?.answer;
              return (
                <button
                  key={`${currentQuestion?.id}-${option}`}
                  type="button"
                  onClick={() => currentQuestion && onChooseAnswer(currentQuestion, option)}
                  aria-pressed={selected}
                  className={cn(
                    "grid h-full min-h-0 overflow-hidden rounded-[1.75rem] border-4 bg-white/92 p-2 text-center shadow-[0_12px_0_rgba(147,197,253,0.22),0_24px_40px_rgba(37,99,235,0.12)] transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100 sm:p-3",
                    shouldShowHint
                      ? "border-amber-400 ring-8 ring-amber-100"
                      : selected
                        ? "border-blue-500 ring-8 ring-blue-100"
                        : "border-white hover:border-blue-200"
                  )}
                >
                  <span className="grid h-full min-h-0 place-items-center overflow-hidden rounded-[1.2rem] bg-white/85 p-1 sm:p-2">
                    <SymbolOption value={option} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
                    <span className="sr-only">{getDisplayLabel(option, learningItems)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </main>

        <footer className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className="min-h-14 rounded-2xl border-2 border-blue-200 bg-white/90 px-4 text-base font-black text-blue-800 shadow-[0_8px_18px_rgba(37,99,235,0.12)] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45 sm:px-6"
            onClick={onBack}
            disabled={!canMoveBack}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Back
          </Button>

          <div className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-white/90 px-4 text-center shadow-sm">
            <BrandLogo markClassName="h-11 w-11 rounded-xl" />
            <p className="text-base font-black text-[#10285e] sm:text-lg">{feedbackText}</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="min-h-14 rounded-2xl border-2 border-blue-200 bg-blue-100 px-4 text-base font-black text-blue-800 shadow-[0_8px_18px_rgba(37,99,235,0.14)] hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-45 sm:px-6"
            onClick={onNext}
            disabled={!canMoveNext}
          >
            Next
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </footer>
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

function MatchWordSymbolStudentLayout({
  activity,
  learningItems,
  answers,
  currentQuestionIndex,
  hintedQuestionId,
  matchFeedback,
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
  activityNavigator
}: {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  currentQuestionIndex: number;
  hintedQuestionId: string;
  matchFeedback: "idle" | "correct" | "wrong";
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
  activityNavigator?: ReactNode;
}) {
  const [optionShuffleSeed, setOptionShuffleSeed] = useState(() => Math.random());
  const totalSteps = Math.min(activity.questions.length, 5);
  const safeQuestionIndex = Math.min(currentQuestionIndex, Math.max(totalSteps - 1, 0));
  const currentQuestion = activity.questions[safeQuestionIndex];
  const currentStep = safeQuestionIndex + 1;
  const canMoveBack = totalSteps > 1 && safeQuestionIndex > 0;
  const canMoveNext = totalSteps > 1 && safeQuestionIndex + 1 < totalSteps;
  const currentWord = currentQuestion ? getQuestionTitle(activity, currentQuestion, learningItems) : "";
  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const options = useMemo(
    () => (currentQuestion ? getMatchWordOptions(currentQuestion, learningItems, optionShuffleSeed) : []),
    [currentQuestion, learningItems, optionShuffleSeed]
  );
  const shouldShowHint = hintedQuestionId === currentQuestion?.id;
  const motivationText = hintedQuestionId === currentQuestion?.id
    ? "Look for the matching picture."
    : matchFeedback === "wrong"
      ? "Try again."
      : matchFeedback === "correct"
      ? "Nice choice."
      : "You can do it!";

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
      <div className="grid h-full min-h-0 grid-rows-[5rem_minmax(0,1fr)_5.5rem] gap-3 rounded-[2rem] border border-white/80 bg-white/28 p-3 shadow-[0_18px_58px_rgba(37,99,235,0.12)] backdrop-blur-[2px] sm:grid-rows-[5.5rem_minmax(0,1fr)_5.75rem] sm:gap-4 sm:p-4">
        <header className="grid min-h-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3 pl-16 sm:pl-20">
            <div className="min-w-0 rounded-2xl border border-blue-100 bg-white/90 px-4 py-2 shadow-sm">
              <p className="truncate text-base font-black text-[#10285e] sm:text-lg">{activityTypeLabels[activity.type]}</p>
            </div>
          </div>

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

          <div className="grid min-h-0 grid-cols-1 items-stretch gap-3 sm:grid-cols-5 sm:gap-3 lg:gap-4">
            {options.map((option) => {
              const selected = selectedAnswer === option;
              return (
                <button
                  key={`${currentQuestion?.id}-${option}`}
                  type="button"
                  onClick={() => currentQuestion && onChooseAnswer(currentQuestion, option)}
                  aria-pressed={selected}
                  className={cn(
                    "grid h-full min-h-0 overflow-hidden rounded-[1.75rem] border-4 bg-white/92 p-2 text-center shadow-[0_12px_0_rgba(147,197,253,0.22),0_24px_40px_rgba(37,99,235,0.12)] transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100 sm:p-3",
                    shouldShowHint && option === currentQuestion?.answer
                      ? "border-amber-400 ring-8 ring-amber-100"
                      : selected
                        ? "border-blue-500 ring-8 ring-blue-100"
                        : "border-white hover:border-blue-200"
                  )}
                >
                  <span className="grid h-full min-h-0 place-items-center overflow-hidden rounded-[1.2rem] bg-white/85 p-1 sm:p-2">
                    <SymbolOption value={option} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
                  </span>
                </button>
              );
            })}
          </div>
        </main>

        <footer className="grid min-h-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className="min-h-14 rounded-2xl border-2 border-blue-200 bg-white/90 px-4 text-base font-black text-blue-800 shadow-[0_8px_18px_rgba(37,99,235,0.12)] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45 sm:px-6"
            onClick={onBack}
            disabled={!canMoveBack}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            Back
          </Button>

          <div className="mx-auto flex min-h-14 w-full max-w-xl items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-white/90 px-4 text-center shadow-sm">
            <BrandLogo markClassName="h-11 w-11 rounded-xl" />
            <p className="text-base font-black text-[#10285e] sm:text-lg">{motivationText}</p>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="min-h-14 rounded-2xl border-2 border-blue-200 bg-blue-100 px-4 text-base font-black text-blue-800 shadow-[0_8px_18px_rgba(37,99,235,0.14)] hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-45 sm:px-6"
            onClick={onNext}
            disabled={!canMoveNext}
          >
            Next
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </footer>
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

function ActivityResultModal({
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

function StepProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const visibleSteps = 5;

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 shadow-sm" aria-label={`Question ${currentStep} of ${totalSteps}`}>
      {Array.from({ length: visibleSteps }, (_, index) => {
        const step = index + 1;
        const active = step === currentStep;
        const available = step <= totalSteps;
        return (
          <div key={step} className="flex items-center gap-2">
            {index > 0 ? <span className={cn("h-0.5 w-6 rounded-full", step <= currentStep ? "bg-blue-500" : "bg-blue-100")} aria-hidden="true" /> : null}
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-black",
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
                  : available
                    ? "border-blue-200 bg-white text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-300"
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
      <span className="sr-only">{currentStep} of {totalSteps}</span>
    </div>
  );
}

function ActivityResetAction({ onReset }: { onReset: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="absolute bottom-4 left-4 z-20 min-h-16 rounded-[1.45rem] border-4 border-white bg-white/88 px-5 text-xl font-black text-blue-700 shadow-[0_10px_0_rgba(147,197,253,0.5)] sm:left-6 sm:min-w-44"
      onClick={onReset}
    >
      <RotateCcw className="h-7 w-7" aria-hidden="true" />
      Try again
    </Button>
  );
}

function ActivityGameTopBar({
  stacked = false,
  isListening,
  onHint,
  onListen,
  activityNavigator
}: {
  stacked?: boolean;
  isListening: boolean;
  onHint: () => void;
  onListen: () => void;
  activityNavigator?: ReactNode;
}) {
  return (
    <div className={cn("flex h-full items-center justify-end gap-3", stacked ? "" : "pl-16 sm:pl-20")}>
      <div className={cn("flex justify-end gap-3", stacked ? "flex-col items-stretch" : "")}>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "group min-h-14 rounded-[1.45rem] border-4 border-yellow-200 bg-gradient-to-b from-white to-amber-100 px-4 text-base font-black text-amber-800 shadow-[0_14px_28px_rgba(245,158,11,0.2)] hover:border-amber-300 hover:from-amber-50 hover:to-orange-100 sm:min-h-16 sm:px-6 sm:text-lg",
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
            "group min-h-14 rounded-[1.45rem] border-4 border-sky-200 bg-gradient-to-b from-white to-sky-100 px-4 text-base font-black text-blue-700 shadow-[0_14px_28px_rgba(14,165,233,0.18)] hover:border-sky-300 hover:from-sky-50 hover:to-cyan-100 sm:min-h-16 sm:px-6 sm:text-lg",
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
        {activityNavigator}
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
  used = false,
  onSelect
}: {
  value: string;
  learningItems: LearningItem[];
  selected: boolean;
  used?: boolean;
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
        "relative mx-auto grid aspect-[3/4] h-auto max-h-full min-h-0 w-full max-w-[11.5rem] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-[1.2rem] border-[3px] bg-white/92 text-center shadow-[0_5px_0_rgba(147,197,253,0.16),0_10px_18px_rgba(37,99,235,0.08)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100",
        selected ? "border-blue-500 ring-8 ring-blue-100" : "border-white hover:border-blue-200",
        used && !selected ? "opacity-75" : ""
      )}
      aria-label={`Select ${getDisplayLabel(value, learningItems)} card`}
    >
      <span className="absolute left-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white shadow-sm sm:h-6 sm:w-6" aria-hidden="true">
        <GripVertical className="h-3 w-3" />
      </span>
      <span className="grid min-h-0 place-items-center overflow-hidden p-1.5">
        <SymbolOption value={value} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
      </span>
    </button>
  );
}

function DroppedCardPreview({
  value,
  learningItems,
  compact = false,
  resultTone = "neutral"
}: {
  value: string;
  learningItems: LearningItem[];
  compact?: boolean;
  resultTone?: "neutral" | "correct" | "wrong";
}) {
  return (
    <span
      className={cn(
        "grid h-full min-h-0 w-full max-w-full overflow-hidden rounded-[1rem] border bg-white/88 shadow-[0_8px_18px_rgba(37,99,235,0.12)]",
        resultTone === "correct" ? "border-emerald-300 ring-4 ring-emerald-100" : "",
        resultTone === "wrong" ? "border-rose-300 ring-4 ring-rose-100" : "",
        resultTone === "neutral" ? "border-transparent" : "",
        compact ? "grid-rows-[minmax(0,1fr)]" : "max-h-36 max-w-64 grid-rows-[minmax(0,1fr)_2.25rem]"
      )}
    >
      <span className={cn("grid min-h-0 place-items-center overflow-hidden", compact ? "p-1" : "px-3 pt-3")}>
        <SymbolOption value={value} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
      </span>
      {compact ? null : (
        <span className="grid min-h-0 place-items-center border-t border-blue-100 bg-white/95 px-2 text-sm font-black uppercase leading-tight text-[#0d255a]">
          <span className="line-clamp-2">{getDisplayLabel(value, learningItems)}</span>
        </span>
      )}
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
