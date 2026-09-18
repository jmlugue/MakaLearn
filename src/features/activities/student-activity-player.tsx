"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { type ActivityScore, getQuestionListenText, getActivityQuestionListenItems, getCorrectResultListenItems, getFirstHintQuestion, getChoiceGridClass, getActivityBackground, speakTextSequence } from "@/features/activities/player/player-utils";
import { StudentActivityNavigator, ActivityResetAction, ActivityGameTopBar } from "@/features/activities/player/player-parts";
import { ActivityResultModal } from "@/features/activities/player/activity-result";
import { MatchWordSymbolStudentLayout } from "@/features/activities/player/match-question";
import { ChooseCorrectSymbolStudentLayout } from "@/features/activities/player/choose-question";
import { DragDropSymbolStudentLayout } from "@/features/activities/player/drag-drop-question";
import { GamePromptCard, QuestionChoicePanel } from "@/features/activities/player/choice-list-question";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

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
