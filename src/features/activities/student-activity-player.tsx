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
import { StudentIntroCard } from "@/features/activities/player/student-intro-card";
import {
  type AnswerFeedback,
  AnswerFeedbackPopup,
  type StepState,
  StudentGameFrame,
  StudentTopBar
} from "@/features/activities/player/student-game-parts";
import {
  ENCOURAGE_MS,
  FEEDBACK_MS,
  MAX_TRIES,
  ROUND_SIZE,
  SCORE_DELAY_MS,
  WRONG_MS,
  studentInstruction
} from "@/features/activities/player/student-theme";
import { playCue } from "@/lib/sound-cues";
import type { MakiMood } from "@/features/student-mode/maki";
import { cheerAfterRight, encourageAfterWrong } from "@/features/student-mode/maki-voice";
import type { Activity, LearningItem } from "@/types";

type StudentActivityPlayerProps = {
  activity: Activity;
  learningItems: LearningItem[];
  onHome: () => void;
};

/**
 * Student mode game. Flow: How to play card, then one tap per question (or one drag per card), a big Correct
 * pop-up on a right tap that closes by itself, and the score pop-up at the end. Scores are view only.
 * Every round is a fresh `StudentRound`, so Play again resets everything.
 */
export function StudentActivityPlayer({ activity, learningItems, onHome }: StudentActivityPlayerProps) {
  const [round, setRound] = useState(0);
  return (
    <StudentRound
      key={`${activity.id}-${round}`}
      activity={activity}
      learningItems={learningItems}
      showIntro={round === 0}
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
  /** Choice games: the card that ended the question. Drag and drop: the card in the box (always the right one). */
  const [answers, setAnswers] = useState<Record<string, string>>({});
  /** Right within three tries: counts in the score. */
  const [scored, setScored] = useState<Record<string, boolean>>({});
  /** Right on the first try: fills a star. */
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({});
  /** Wrong guesses so far: per question in the choice games, per card in Drag and drop. */
  const [misses, setMisses] = useState<Record<string, number>>({});
  const [pickShake, setPickShake] = useState<{ option: string; key: number } | null>(null);
  const [makiLine, setMakiLine] = useState("");
  const [eliminated, setEliminated] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [makiMood, setMakiMood] = useState<MakiMood>("happy");
  const makiTimer = useRef<number | null>(null);
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
    if (answers[candidate.id]) return scored[candidate.id] ? "correct" : "wrong";
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
    if (spoken) void speakText(spoken);
    later(() => setFeedback(null), ms);
  }

  /** Maki cheers or encourages for a moment, then goes back to happy. */
  function react(mood: MakiMood, ms: number, line = "") {
    setMakiMood(mood);
    setMakiLine(line);
    if (makiTimer.current) window.clearTimeout(makiTimer.current);
    makiTimer.current = window.setTimeout(() => setMakiMood("happy"), ms);
  }

  function finishRound() {
    later(() => {
      setPhase("done");
      playCue("finish");
    }, SCORE_DELAY_MS);
  }

  /** The card's own audio file, so the word after "Correct" is the same recording as on the PECS card. */
  function cardAudio(value: string) {
    const item = learningItems.find((candidate) => candidate.id === value || candidate.label === value);
    const url = item?.audioUrl?.trim() ?? "";
    return /^(\/|https?:)/.test(url) ? url : undefined;
  }

  /** A wrong guess: the buzz, then Maki shows one of his encouraging faces and says a line. */
  function encourage() {
    const next = encourageAfterWrong();
    react(next.mood, ENCOURAGE_MS, next.line);
  }

  function nextQuestion(wait: number) {
    later(() => {
      if (index + 1 >= questions.length) finishRound();
      else setIndex(index + 1);
    }, wait);
  }

  /**
   * Three guesses per question. Right (on any try): the Correct pop-up, and it counts in the score. Wrong: the buzz
   * and Maki's encouragement, the card shakes and flashes red. The third wrong guess marks the question wrong: the pick
   * turns red and the right card glows green, then the next question comes by itself.
   */
  function pick(option: string) {
    if (!question || answers[question.id] || feedback) return;
    const id = question.id;
    const tries = misses[id] ?? 0;
    setHintFor("");
    if (option === question.answer) {
      setAnswers((current) => ({ ...current, [id]: option }));
      setScored((current) => ({ ...current, [id]: true }));
      setFirstTry((current) => ({ ...current, [id]: tries === 0 }));
      // The chime, then Maki cheers with one of his happy faces and a line, then the card's word.
      const cheer = cheerAfterRight(getDisplayLabel(question.answer, learningItems), cardAudio(question.answer));
      react(cheer.mood, FEEDBACK_MS);
      showFeedback({ tone: "correct", title: "Correct!" }, "", FEEDBACK_MS);
      nextQuestion(FEEDBACK_MS);
      return;
    }
    encourage();
    setMisses((current) => ({ ...current, [id]: tries + 1 }));
    if (tries + 1 >= MAX_TRIES) {
      setAnswers((current) => ({ ...current, [id]: option }));
      setScored((current) => ({ ...current, [id]: false }));
      setFirstTry((current) => ({ ...current, [id]: false }));
      nextQuestion(ENCOURAGE_MS);
      return;
    }
    // The wrong card shakes and flashes red, then can be picked again (owner's choice: never greyed out).
    const key = Date.now();
    setPickShake({ option, key });
    later(() => setPickShake((current) => (current?.key === key ? null : current)), 700);
  }

  /**
   * Drag and drop, three tries per card (owner's choice). Each card remembers its own tries, even if the child moves
   * on to another card and comes back. A right drop stays in its box, marked green, and counts in the score. A wrong
   * one flies back while the box shakes, with the buzz and Maki's encouragement. After a card's third wrong drop it
   * goes to its own box by itself, marked red, and that box counts as wrong.
   */
  function drop(questionId: string, value: string) {
    const target = questions.find((candidate) => candidate.id === questionId);
    if (!target || answers[questionId]) return false;
    const right = value === target.answer;
    const tries = misses[value] ?? 0;
    const place = (boxId: string, card: string, good: boolean) => {
      const nextAnswers = { ...answers, [boxId]: card };
      setAnswers(nextAnswers);
      setScored((current) => ({ ...current, [boxId]: good }));
      setFirstTry((current) => ({ ...current, [boxId]: good && tries === 0 }));
      if (hintFor === boxId) setHintFor("");
      if (questions.every((candidate) => nextAnswers[candidate.id])) finishRound();
    };
    if (right) {
      const cheer = cheerAfterRight(getDisplayLabel(value, learningItems), cardAudio(value));
      react(cheer.mood, FEEDBACK_MS);
      place(questionId, value, true);
    } else {
      setShake({ id: questionId, key: Date.now() });
      encourage();
      setMisses((current) => ({ ...current, [value]: tries + 1 }));
      const home = questions.find((candidate) => candidate.answer === value && !answers[candidate.id]);
      if (tries + 1 >= MAX_TRIES && home) place(home.id, value, false);
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
          type={activity.type}
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
          scored={scored}
          firstTry={firstTry}
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
      maki={phase === "play" ? makiMood : undefined}
      makiLine={makiLine}
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
          missed={questions.filter((candidate) => answers[candidate.id] && !scored[candidate.id]).map((candidate) => candidate.id)}
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
          shake={pickShake}
          onPick={pick}
        />
      ) : null}
    </StudentGameFrame>
  );
}
