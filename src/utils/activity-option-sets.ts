import type { ActivityType, LearningItem } from "@/types";

/** Remove blanks and duplicates while preserving the first occurrence. */
function uniqueOptions(values: string[]) {
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

/** Small deterministic random source so one activity round keeps a stable card order. */
function seededRandom(seed: number) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function shuffleOptions(values: string[], seed: number) {
  const shuffled = [...values];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(seededRandom(seed + index * 97) * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function normalizeLabel(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/**
 * Some prompts admit several technically correct cards. Those cards are poor distractors even when
 * they are different database records. Fill-in-the-blank is intentionally conservative: another card
 * with the same sentence role can also complete the open sentence, so it is kept out of that question.
 */
const relatedAnswersByLabel: Record<string, string[]> = {
  hello: ["good morning"],
  eat: ["food", "rice", "bread", "banana"],
  drink: ["water", "milk"],
  food: ["rice", "bread", "banana"],
  water: ["drink"],
  milk: ["drink"],
  rest: ["sleep"],
  more: ["want"]
};

export function isUnsafeActivityDistractor(
  type: ActivityType,
  answerItem: Pick<LearningItem, "label" | "sentenceRole">,
  candidate: Pick<LearningItem, "label" | "sentenceRole">
) {
  const answerLabel = normalizeLabel(answerItem.label);
  const candidateLabel = normalizeLabel(candidate.label);

  if (answerLabel === candidateLabel) return true;
  if (
    type === "fill-blank" &&
    answerItem.sentenceRole &&
    candidate.sentenceRole === answerItem.sentenceRole
  ) {
    return true;
  }

  if (type !== "choose-correct-symbol" && type !== "simple-quiz") return false;
  return relatedAnswersByLabel[answerLabel]?.includes(candidateLabel) ?? false;
}

/**
 * Build one varied choice set per question. Distractors rotate through the full eligible learning-material
 * library first, while the activity's other answers are only a fallback when the library is too small.
 */
export function buildActivityOptionSets(
  answers: string[],
  fallbackOptions: string[],
  seed: number,
  choiceCount = 3,
  excludedOptionsByQuestion: string[][] = []
) {
  const uniqueAnswers = uniqueOptions(answers);
  const answerPool = shuffleOptions(uniqueAnswers, seed);
  const fallbackPool = shuffleOptions(
    uniqueOptions(fallbackOptions).filter((value) => !uniqueAnswers.includes(value)),
    seed + 401
  );

  return answers.map((answer, questionIndex) => {
    const excludedOptions = new Set(excludedOptionsByQuestion[questionIndex] ?? []);
    const answerIndex = answerPool.indexOf(answer);
    const orderedAnswers = answerIndex < 0
      ? answerPool
      : [...answerPool.slice(answerIndex + 1), ...answerPool.slice(0, answerIndex)];
    const fallbackOffset = fallbackPool.length
      ? (questionIndex * Math.max(choiceCount - 1, 1)) % fallbackPool.length
      : 0;
    const orderedFallbacks = [
      ...fallbackPool.slice(fallbackOffset),
      ...fallbackPool.slice(0, fallbackOffset)
    ];
    const distractors = uniqueOptions([...orderedFallbacks, ...orderedAnswers])
      .filter((value) => value !== answer && !excludedOptions.has(value))
      .slice(0, Math.max(choiceCount - 1, 0));

    return shuffleOptions([answer, ...distractors], seed + (questionIndex + 1) * 211);
  });
}
