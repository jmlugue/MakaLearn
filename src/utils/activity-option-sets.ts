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
 * Meaning groups. Every question must have exactly one right answer, so a wrong option may never share a
 * group with the answer: "Food" and "Rice" both answer "What do we eat?", and "Happy" and "Sad" can both
 * finish "I feel ____." A card can sit in several groups. Cards a teacher adds later are only kept apart
 * by label.
 */
export const activityMeaningGroups: Record<string, string[]> = {
  greetings: ["hello", "goodbye", "good morning"],
  polite: ["thank you", "please", "sorry"],
  feelings: ["happy", "sad", "angry", "scared", "tired", "sick", "hurt", "hot"],
  people: ["i", "you", "mother", "father", "teacher", "friend"],
  food: ["eat", "food", "rice", "bread", "banana", "more", "want"],
  drink: ["drink", "water", "milk", "more", "want"],
  classroom: ["sit", "stand", "listen", "look", "read", "write", "wait", "stop"],
  rest: ["rest", "sleep", "tired", "finished"],
  hygiene: ["toilet", "wash hands"],
  safety: ["danger", "hot", "hurt", "stop", "help"],
  answers: ["yes", "no"],
  done: ["finished", "more", "stop"],
  requests: ["want", "more", "help", "please"],
  be: ["am", "is", "are"]
};

/** Extra cards that could also finish a built-in Fill in the blank sentence, beyond its meaning groups. */
const fillBlankAlsoFits: Record<string, string[]> = {
  finished: ["tired"],
  yes: ["please"]
};

function meaningGroupsOf(label: string) {
  return Object.values(activityMeaningGroups).filter((group) => group.includes(label));
}

export function isUnsafeActivityDistractor(
  type: ActivityType,
  answerItem: Pick<LearningItem, "label" | "sentenceRole">,
  candidate: Pick<LearningItem, "label" | "sentenceRole">
) {
  const answerLabel = normalizeLabel(answerItem.label);
  const candidateLabel = normalizeLabel(candidate.label);

  if (answerLabel === candidateLabel) return true;
  if (meaningGroupsOf(answerLabel).some((group) => group.includes(candidateLabel))) return true;

  if (type === "fill-blank") {
    // Another card with the same sentence role can often complete an open sentence too.
    if (answerItem.sentenceRole && candidate.sentenceRole === answerItem.sentenceRole) return true;
    if (fillBlankAlsoFits[answerLabel]?.includes(candidateLabel)) return true;
  }

  return false;
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
