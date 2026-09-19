"use client";

import { useEffect, useRef, useState } from "react";
import { type ActivityScore, getQuestionListenText, getActivityQuestionListenItems, getCorrectResultListenItems, getFirstHintQuestion, speakTextSequence } from "@/features/activities/player/player-utils";
import { StudentActivityNavigator } from "@/features/activities/player/player-parts";
import { MatchWordSymbolStudentLayout } from "@/features/activities/player/match-question";
import { ChooseCorrectSymbolStudentLayout } from "@/features/activities/player/choose-question";
import { DragDropSymbolStudentLayout } from "@/features/activities/player/drag-drop-question";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

/** Pause after the last Check so the green and red cards show before the score pops up. */
const SCORE_DELAY_MS = 1200;

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
  onReset,
  onSelectActivity
}: StudentActivityPlayerProps) {
  const [hintedQuestionId, setHintedQuestionId] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [matchQuestionIndex, setMatchQuestionIndex] = useState(0);
  const [chooseQuestionIndex, setChooseQuestionIndex] = useState(0);
  // Pick, Check, then Next (as in the teacher player). Checked questions are locked and show green or red.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [matchOptionRound, setMatchOptionRound] = useState(0);
  const [resultQuestionIds, setResultQuestionIds] = useState<string[]>([]);
  const [highlightedListenQuestionId, setHighlightedListenQuestionId] = useState("");
  const hintTimer = useRef<number | null>(null);
  const scoreTimer = useRef<number | null>(null);
  const onScoreRef = useRef(onScore);

  useEffect(() => {
    onScoreRef.current = onScore;
  }, [onScore]);

  useEffect(() => {
    setMatchQuestionIndex(0);
    setChooseQuestionIndex(0);
    setHintedQuestionId("");
    setChecked({});
    setMatchOptionRound((current) => current + 1);
    setResultQuestionIds([]);
    setHighlightedListenQuestionId("");
  }, [activity.id]);

  useEffect(() => {
    return () => {
      if (hintTimer.current) {
        window.clearTimeout(hintTimer.current);
      }
      if (scoreTimer.current) {
        window.clearTimeout(scoreTimer.current);
      }
    };
  }, [activity.id]);

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

  /** Picking only marks the card. It never moves on or scores. */
  function pickAnswer(question: ActivityQuestion, option: string) {
    if (checked[question.id]) return;
    chooseAnswer(question.id, option);
  }

  /** Check shows right or wrong. After the last one, the score pops up by itself. */
  function checkQuestion(question: ActivityQuestion) {
    if (!answers[question.id] || checked[question.id]) return;
    const nextChecked = { ...checked, [question.id]: true };
    setChecked(nextChecked);

    const visibleQuestionIds = activity.questions.slice(0, 5).map((visibleQuestion) => visibleQuestion.id);
    if (visibleQuestionIds.every((questionId) => nextChecked[questionId])) {
      if (scoreTimer.current) window.clearTimeout(scoreTimer.current);
      scoreTimer.current = window.setTimeout(() => scoreQuestions(visibleQuestionIds), SCORE_DELAY_MS);
    }
  }

  /** From the score pop-up: a fresh round from question 1. */
  function restartRound() {
    if (scoreTimer.current) window.clearTimeout(scoreTimer.current);
    setChecked({});
    setChooseQuestionIndex(0);
    setMatchQuestionIndex(0);
    setMatchOptionRound((current) => current + 1);
    setResultQuestionIds([]);
    onReset();
  }

  function getResultPrimaryAction() {
    return {
      label: result?.incorrect === 0 ? "Practice again" : "Try again",
      action: activity.type === "drag-drop-symbol" ? onReset : restartRound
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
        onReset={restartRound}
        onBack={() => {
          setMatchQuestionIndex((current) => (current > 0 ? current - 1 : current));
        }}
        onNext={() => {
          const totalSteps = Math.min(activity.questions.length, 5);
          setMatchQuestionIndex((current) => (current + 1 < totalSteps ? current + 1 : current));
        }}
        onChooseAnswer={pickAnswer}
        checkedQuestionIds={checked}
        onCheck={checkQuestion}
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

  // Choose the correct symbol, Fill in the blank, and Choose the word: one question at a time.
  // (Fill in the blank and Choose the word used to show every question at once, and the cards overlapped.)
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
      onReset={restartRound}
      onBack={() => {
        setChooseQuestionIndex((current) => (current > 0 ? current - 1 : current));
      }}
      onNext={() => {
        setChooseQuestionIndex((current) => (current + 1 < totalSteps ? current + 1 : current));
      }}
      onChooseAnswer={pickAnswer}
      checkedQuestionIds={checked}
      onCheck={checkQuestion}
      activityNavigator={activityNavigator}
    />
  );
}
