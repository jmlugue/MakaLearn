import { activityUsesSymbolOptions, findPecsLearningItemForActivityValue, getActivityDisplayLabel } from "@/utils/activity-symbol-options";
import { buildActivityOptionSets, isQuestionRelatedDistractor, isUnsafeActivityDistractor } from "@/utils/activity-option-sets";
import { activityInstruction } from "@/features/activities/activity-helpers";
import { normalizeLearningSpeechText } from "@/utils/speech-text";
import type { Activity, ActivityQuestion, LearningItem } from "@/types";

export type ActivityScore = {
  score: number;
  correct: number;
  incorrect: number;
};

export const activityBackgrounds = [
  "/makalearn_activity_backgrounds/cheerful_playground_under_a_pastel_sky.png",
  "/makalearn_activity_backgrounds/cheerful_meadow_with_glowing_sky.png",
  "/makalearn_activity_backgrounds/pastel_sky_with_rolling_hills_and_stage.png",
  "/makalearn_activity_backgrounds/soft_pastel_nursery_with_playful_toys.png",
  "/makalearn_activity_backgrounds/dreamy_pastel_park_scene_for_kids.png"
];

export function activityUsesImageOptions(type: Activity["type"]) {
  return activityUsesSymbolOptions(type);
}

export function getLearningItemForValue(value: string, learningItems: LearningItem[]) {
  return findPecsLearningItemForActivityValue(value, learningItems);
}

export function getRelatedItem(question: ActivityQuestion, learningItems: LearningItem[]) {
  return learningItems.find((item) => item.id === question.learningItemId);
}

export function getDisplayLabel(value: string, learningItems: LearningItem[]) {
  return getActivityDisplayLabel(value, learningItems);
}

export function getQuestionTitle(activity: Activity, question: ActivityQuestion, learningItems: LearningItem[]) {
  const item = getRelatedItem(question, learningItems);

  if (activity.type === "match-word-symbol") {
    return item?.label ?? question.prompt.replace(/^Word:\s*/i, "").replace(/^Match the word\s+"?(.+?)"?\s+to.*$/i, "$1");
  }

  return question.prompt;
}

export function normalizeSpokenText(text: string) {
  return normalizeLearningSpeechText(text)
    .replace(/\bPECS\b/gi, "pecks")
    .replace(/_{2,}/g, "blank")
    .replace(/\s+/g, " ")
    .trim();
}

export function completeSentencePrompt(prompt: string, answer: string) {
  const completed = prompt.includes("____")
    ? prompt.replace(/____/g, answer.toLowerCase())
    : `${prompt} ${answer}`;

  return normalizeSpokenText(completed);
}

/** The word, question, or sentence on screen, without the instruction. */
function getQuestionSpokenContent(activity: Activity, question: ActivityQuestion, learningItems: LearningItem[]) {
  if (activity.type === "match-word-symbol") {
    return normalizeSpokenText(getQuestionTitle(activity, question, learningItems));
  }

  return normalizeSpokenText(question.prompt);
}

/**
 * Listen for one question reads the same instruction the banner shows, then what is on screen, so the audio
 * always matches the words the learner sees. Match's instruction already names the word.
 */
export function getQuestionListenText(activity: Activity, question: ActivityQuestion, learningItems: LearningItem[]) {
  if (activity.type === "match-word-symbol") {
    return normalizeSpokenText(activityInstruction(activity.type, getQuestionTitle(activity, question, learningItems)));
  }

  return normalizeSpokenText(`${activityInstruction(activity.type)} ${getQuestionSpokenContent(activity, question, learningItems)}`);
}

export function getActivityQuestionListenItems(activity: Activity, learningItems: LearningItem[], answers: Record<string, string>) {
  const visibleQuestions = activity.questions.slice(0, 5);
  const unansweredQuestions = visibleQuestions.filter((question) => !answers[question.id]);
  const questionsToRead = unansweredQuestions.length ? unansweredQuestions : visibleQuestions;

  return questionsToRead
    .map((question) => ({ id: question.id, text: getQuestionSpokenContent(activity, question, learningItems) }))
    .filter((item) => item.text);
}

export function getAnsweredQuestionListenText(
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

export function getCorrectResultListenItems(
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

export function getSymbolOptionValue(item: LearningItem) {
  return item.id;
}

export function seededRandom(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

export function shuffleOptions(options: string[], seed: number) {
  const shuffled = [...options];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(seededRandom(seed + index * 97) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

/**
 * Rebuild choices for the current round from the activity's own answers. This also upgrades activities
 * saved before distractors were varied, without requiring the teacher to edit and save them again.
 */
export function getActivityQuestionOptions(
  activity: Activity,
  question: ActivityQuestion,
  learningItems: LearningItem[],
  shuffleSeed: number
) {
  const usesSymbols = activityUsesImageOptions(activity.type);
  const eligibleItems = learningItems.filter((item) => item.contentType === "pecs" && item.symbolImageUrl);
  const optionValueForItem = (item: LearningItem) => usesSymbols ? getSymbolOptionValue(item) : item.label;
  const savedPecsOptions = activity.questions
    .flatMap((candidate) => candidate.options)
    .map((value) => findPecsLearningItemForActivityValue(value, eligibleItems))
    .filter((item): item is LearningItem => Boolean(item?.symbolImageUrl))
    .map(optionValueForItem);
  const libraryOptions = eligibleItems.map(optionValueForItem);
  const answerItems = activity.questions.map(
    (candidateQuestion) =>
      getRelatedItem(candidateQuestion, eligibleItems)
      ?? findPecsLearningItemForActivityValue(candidateQuestion.answer, eligibleItems)
  );
  const semanticExclusions = activity.questions.map((_, index) => {
    const answerItem = answerItems[index];
    if (!answerItem) return [];

    return eligibleItems
      .filter((candidate) => isUnsafeActivityDistractor(activity.type, answerItem, candidate))
      .map(optionValueForItem);
  });
  // Cards the question itself points at ("What do I want to eat?") are only used when nothing else is left.
  const questionAvoids = activity.questions.map((candidateQuestion, index) => {
    const answerItem = answerItems[index];
    if (!answerItem || !questionTextMatters(activity.type)) return [];

    return eligibleItems
      .filter((candidate) => isQuestionRelatedDistractor(candidateQuestion.prompt, answerItem, candidate))
      .map(optionValueForItem);
  });
  const optionSets = buildActivityOptionSets(
    activity.questions.map((candidate) => candidate.answer),
    [...savedPecsOptions, ...libraryOptions],
    shuffleSeed,
    3,
    semanticExclusions,
    questionAvoids
  );
  const questionIndex = activity.questions.findIndex((candidate) => candidate.id === question.id);

  return optionSets[questionIndex] ?? question.options;
}

/** Only these types show a written question; the others show the card's own word. */
function questionTextMatters(type: Activity["type"]) {
  return type === "choose-correct-symbol" || type === "fill-blank";
}

export function getActivityBackground(activityId: string) {
  const index = activityId.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0) % activityBackgrounds.length;
  return activityBackgrounds[index];
}

export function playAudio(url: string) {
  return new Promise<void>((resolve) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

export function speakText(text: string) {
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

export async function speakTextSequence(
  items: Array<{ id: string; text: string }>,
  onActiveItemChange: (id: string) => void
) {
  for (const item of items) {
    onActiveItemChange(item.id);
    await speakText(item.text);
  }

  onActiveItemChange("");
}
