import { activityUsesSymbolOptions, findLearningItemForActivityValue, getActivityDisplayLabel } from "@/utils/activity-symbol-options";
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
  return findLearningItemForActivityValue(value, learningItems);
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

export function getQuestionListenText(activity: Activity, question: ActivityQuestion, learningItems: LearningItem[]) {
  if (activity.type === "match-word-symbol") {
    return normalizeSpokenText(getQuestionTitle(activity, question, learningItems));
  }

  return normalizeSpokenText(question.prompt);
}

export function getActivityQuestionListenItems(activity: Activity, learningItems: LearningItem[], answers: Record<string, string>) {
  const visibleQuestions = activity.questions.slice(0, 5);
  const unansweredQuestions = visibleQuestions.filter((question) => !answers[question.id]);
  const questionsToRead = unansweredQuestions.length ? unansweredQuestions : visibleQuestions;

  return questionsToRead
    .map((question) => ({ id: question.id, text: getQuestionListenText(activity, question, learningItems) }))
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

export function getMatchWordOptions(question: ActivityQuestion, learningItems: LearningItem[], shuffleSeed: number) {
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

export function getFirstHintQuestion(activity: Activity, answers: Record<string, string>) {
  return activity.questions.find((question) => !answers[question.id]) ?? activity.questions[0];
}


export function getCompactSymbolGridClass(itemCount: number) {
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

export function getPagedSymbolChoiceGridClass(itemCount: number) {
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

export function getActivityBackground(activityId: string) {
  const index = activityId.split("").reduce((sum, character) => sum + character.charCodeAt(0), 0) % activityBackgrounds.length;
  return activityBackgrounds[index];
}

export function getChoiceTheme(option: string) {
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
