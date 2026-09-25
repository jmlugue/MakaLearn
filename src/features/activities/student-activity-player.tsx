"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getActivityQuestionOptions,
  getActivityQuestionListenItems,
  getCorrectResultListenItems,
  getDisplayLabel,
  getQuestionTitle,
  normalizeSpokenText,
  shuffleOptions,
  speakText,
  speakTextSequence
} from "@/features/activities/player/player-utils";
import { StudentChoiceBoard } from "@/features/activities/player/choose-question";
import { StudentDragBoard } from "@/features/activities/player/drag-drop-question";
import { ActivityResultModal } from "@/features/activities/player/activity-result";
import { StudentIntroCard, isIntroHidden } from "@/features/activities/player/student-intro-card";
import {
  type AnswerFeedback,
  AnswerFeedbackPopup,
  type StepState,
  StudentGameFrame,
  StudentTopBar
} from "@/features/activities/player/student-game-parts";
import {
  DROP_FEEDBACK_MS,
  FEEDBACK_MS,
  ROUND_SIZE,
  SCORE_DELAY_MS,
  WRONG_MS,
  studentInstruction
} from "@/features/activities/player/student-theme";
import type { Activity, LearningItem } from "@/types";

type StudentActivityPlayerProps = {
  activity: Activity;
  learningItems: LearningItem[];
  onHome: () => void;
};

/**
 * Student mode game. Flow: How to play card, then one tap per question (or one drag per card), a big Correct
 * or Not this one pop-up that closes by itself, and the score pop-up at the end. Scores are view only.
 * Every round is a fresh `StudentRound`, so Play again resets everything.
 */
export function StudentActivityPlayer({ activity, learningItems, onHome }: StudentActivityPlayerProps) {
  const [round, setRound] = useState(0);
  return (
    <StudentRound
      key={`${activity.id}-${round}`}
      activity={activity}
      learningItems={learningItems}
      showIntro={round === 0 && !isIntroHidden(activity.id)}
      onPlayAgain={() => setRound((current) => current + 1)}
      onHome={onHome}
    />
  );
}

function StudentRound({
  activity,
  learningItems,
  showIntro,
  onPlayAgain,
  onHome
}: {
  activity: Activity;
  learningItems: LearningItem[];
  showIntro: boolean;
  onPlayAgain: () => void;
  onHome: () => void;
}) {
  const isDrag = activity.type === "drag-drop-symbol";
  const questions = useMemo(() => activity.questions.slice(0, ROUND_SIZE), [activity.questions]);
  const instruction = studentInstruction(activity.type);

  const [seed] = useState(() => Math.random());
  const [phase, setPhase] = useState<"intro" | "play" | "done">(showIntro ? "intro" : "play");
  const [index, setIndex] = useState(0);
  /** Choice games: the card picked. Drag and drop: the card placed (always the right one). */
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [firstTryRight, setFirstTryRight] = useState<Record<string, boolean>>({});
  const [eliminated, setEliminated] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [hintFor, setHintFor] = useState("");
  const [shake, setShake] = useState<{ id: string; key: number } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [readingId, setReadingId] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function later(action: () => void, ms: number) {
    timers.current.push(window.setTimeout(action, ms));
  }

  const question = questions[Math.min(index, Math.max(questions.length - 1, 0))];
  const options = useMemo(
    () => (question && !isDrag ? getActivityQuestionOptions(activity, question, learningItems, seed) : []),
    [activity, isDrag, learningItems, question, seed]
  );
  const trayCards = useMemo(() => {
    const cards = questions.map((candidate) => candidate.answer).filter((value, position, all) => all.indexOf(value) === position);
    return shuffleOptions(cards, seed).filter((card) => !Object.values(answers).includes(card));
  }, [answers, questions, seed]);

  // Drag and drop: Hint works on the first empty box and dims cards that do not belong there.
  const dragTarget = isDrag ? questions.find((candidate) => !answers[candidate.id]) : undefined;
  const hintQuestionId = isDrag ? dragTarget?.id ?? "" : question?.id ?? "";
  const removed = eliminated[hintQuestionId] ?? [];
  const cardsLeft = (isDrag ? trayCards : options).filter((card) => !removed.includes(card)).length;
  const hintOpen = phase === "play" && Boolean(hintQuestionId) && !feedback && (isDrag || !answers[hintQuestionId]);
  const hintState = !hintOpen ? "off" : cardsLeft > 2 ? "ready" : "used";
  const hintLeft = hintState === "ready";

  const steps: StepState[] = questions.map((candidate, position) => {
    // Drag and drop: a placed card is always right, so its circle is green even after a retry.
    if (answers[candidate.id]) return isDrag || firstTryRight[candidate.id] ? "correct" : "wrong";
    if (!isDrag && position === index) return "current";
    return "todo";
  });

  async function speak(items: Array<{ id: string; text: string }>) {
    if (isListening || !items.length) return;
    setIsListening(true);
    try {
      await speakTextSequence(items, setReadingId);
    } finally {
      setReadingId("");
      setIsListening(false);
    }
  }

  function listenToInstruction() {
    void speak([{ id: "", text: normalizeSpokenText(instruction) }]);
  }

  function listen() {
    if (isDrag) {
      void speak([
        { id: "", text: normalizeSpokenText(instruction) },
        ...getActivityQuestionListenItems(activity, learningItems, answers)
      ]);
      return;
    }
    if (question) {
      const text = normalizeSpokenText(`${instruction} ${getQuestionTitle(activity, question, learningItems)}`);
      void speak([{ id: question.id, text }]);
    }
  }

  // The How to play card reads itself once.
  useEffect(() => {
    if (phase === "intro") void speakText(normalizeSpokenText(instruction));
    // Only when the card first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showFeedback(next: Omit<AnswerFeedback, "key">, spoken: string, ms: number) {
    setFeedback({ ...next, key: Date.now() });
    void speakText(spoken);
    later(() => setFeedback(null), ms);
  }

  function finishRound() {
    later(() => setPhase("done"), SCORE_DELAY_MS);
  }

  /**
   * One tap answers. Right: the Correct pop-up. Wrong: no pop-up, the cards shake and the right card grows
   * and glows green. Then the next question comes by itself.
   */
  function pick(option: string) {
    if (!question || answers[question.id] || feedback) return;
    const right = option === question.answer;
    const word = getDisplayLabel(question.answer, learningItems);
    const wait = right ? FEEDBACK_MS : WRONG_MS;
    setAnswers((current) => ({ ...current, [question.id]: option }));
    setFirstTryRight((current) => ({ ...current, [question.id]: right }));
    setHintFor("");
    if (right) showFeedback({ tone: "correct", title: "Correct!" }, `Correct! ${word}.`, FEEDBACK_MS);
    else void speakText(`Not this one. It is ${word}.`);
    later(() => {
      if (index + 1 >= questions.length) finishRound();
      else setIndex(index + 1);
    }, wait);
  }

  /** Drag and drop: a right card stays, a wrong one goes back. Only the first drop on a box counts. */
  function drop(questionId: string, value: string) {
    const target = questions.find((candidate) => candidate.id === questionId);
    if (!target || answers[questionId]) return false;
    const right = value === target.answer;
    setFirstTryRight((current) => (questionId in current ? current : { ...current, [questionId]: right }));
    if (right) {
      const nextAnswers = { ...answers, [questionId]: value };
      setAnswers(nextAnswers);
      if (hintFor === questionId) setHintFor("");
      showFeedback({ tone: "correct", title: "Correct!" }, "Correct!", DROP_FEEDBACK_MS);
      if (questions.every((candidate) => nextAnswers[candidate.id])) later(finishRound, DROP_FEEDBACK_MS);
    } else {
      // No pop-up: the box shakes and the card flies back.
      setShake({ id: questionId, key: Date.now() });
      void speakText("Try again.");
    }
    return right;
  }

  /** Hint takes away one wrong card and reads the question. It stops at two cards, so the child still chooses. */
  function hint() {
    if (!hintLeft) return;
    const pool = isDrag ? trayCards : options;
    const answer = isDrag ? dragTarget?.answer : question?.answer;
    const candidates = pool.filter((card) => card !== answer && !removed.includes(card));
    if (!candidates.length) return;
    const card = candidates[Math.floor(Math.random() * candidates.length)];
    setEliminated((current) => ({ ...current, [hintQuestionId]: [...(current[hintQuestionId] ?? []), card] }));
    setHintFor(hintQuestionId);
    if (isDrag && dragTarget) {
      void speak([{ id: dragTarget.id, text: normalizeSpokenText(`Find the picture for ${dragTarget.prompt}.`) }]);
    } else {
      listen();
    }
  }

  const resultQuestionIds = questions.map((candidate) => candidate.id);
  const rightAnswers = Object.fromEntries(questions.map((candidate) => [candidate.id, candidate.answer]));

  const overlay = (
    <>
      <AnswerFeedbackPopup feedback={feedback} learningItems={learningItems} passThrough={isDrag} />
      {phase === "intro" ? (
        <StudentIntroCard
          activityId={activity.id}
          type={activity.type}
          title={activity.title}
          instruction={instruction}
          isListening={isListening}
          onListen={listenToInstruction}
          onStart={() => {
            if ("speechSynthesis" in window) window.speechSynthesis.cancel();
            setPhase("play");
          }}
        />
      ) : null}
      {phase === "done" ? (
        <ActivityResultModal
          activity={activity}
          learningItems={learningItems}
          firstTryRight={firstTryRight}
          retries={isDrag}
          questionIds={resultQuestionIds}
          onPlayAgain={onPlayAgain}
          onHome={onHome}
          isListening={isListening}
          onListen={() => void speak(getCorrectResultListenItems(activity, learningItems, rightAnswers, resultQuestionIds))}
          highlightedQuestionId={readingId}
        />
      ) : null}
    </>
  );

  return (
    <StudentGameFrame
      activityId={activity.id}
      instruction={instruction}
      overlay={overlay}
      topBar={
        <StudentTopBar
          steps={steps}
          onHome={onHome}
          onHint={hint}
          hint={hintState}
          onListen={listen}
          isListening={isListening}
        />
      }
    >
      {isDrag ? (
        <StudentDragBoard
          questions={questions}
          learningItems={learningItems}
          placed={answers}
          trayCards={trayCards}
          hintTargetId={hintFor}
          dimmedCards={hintFor ? eliminated[hintFor] ?? [] : []}
          beingReadId={readingId}
          shake={shake}
          onDrop={drop}
        />
      ) : question ? (
        <StudentChoiceBoard
          activity={activity}
          question={question}
          options={options}
          learningItems={learningItems}
          picked={answers[question.id]}
          locked={Boolean(answers[question.id])}
          eliminated={eliminated[question.id] ?? []}
          beingRead={readingId === question.id}
          onPick={pick}
        />
      ) : null}
    </StudentGameFrame>
  );
}
