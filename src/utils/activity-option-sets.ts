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
  // "Now I am ____." also takes any feeling.
  finished: [...activityMeaningGroups.feelings],
  yes: ["please"],
  // "I need some ____." also takes help, rest, or a drink.
  food: ["help", "rest", ...activityMeaningGroups.drink],
  // "Now I need a ____." also takes a drink.
  rest: [...activityMeaningGroups.drink],
  // "I say ____." also takes a polite word (no thank you).
  no: [...activityMeaningGroups.polite],
  // "It is time to ____." also takes help.
  "wash hands": ["help"]
};

/**
 * Words in a question that point at a meaning group. "What do I want to eat today?" makes every food card a
 * possible answer, so none of them is offered as a wrong choice.
 */
const questionGroupTriggers: Array<{ words: string[]; groups: string[]; labels?: string[] }> = [
  { words: ["hungry", "eat", "eating", "lunch", "snack", "breakfast", "dinner", "tummy", "food"], groups: ["food"] },
  { words: ["thirsty", "drink", "glass", "cup"], groups: ["drink"] },
  // "I feel sorry" also works.
  { words: ["feel", "feels", "feeling"], groups: ["feelings"], labels: ["sorry"] },
  { words: ["say", "says"], groups: ["greetings", "polite", "answers"] },
  { words: ["who"], groups: ["people"] },
  { words: ["tired", "bed", "night"], groups: ["rest"] },
  { words: ["soap", "pee", "wash"], groups: ["hygiene"] }
];

function meaningGroupsOf(label: string) {
  return Object.values(activityMeaningGroups).filter((group) => group.includes(label));
}

function isInAnyMeaningGroup(label: string) {
  return meaningGroupsOf(label).length > 0;
}

function textHasWord(text: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Boolean(escaped) && new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(text);
}

export function isUnsafeActivityDistractor(
  type: ActivityType,
  answerItem: Pick<LearningItem, "label" | "sentenceRole"> & { categoryId?: string },
  candidate: Pick<LearningItem, "label" | "sentenceRole"> & { categoryId?: string }
) {
  const answerLabel = normalizeLabel(answerItem.label);
  const candidateLabel = normalizeLabel(candidate.label);

  if (answerLabel === candidateLabel) return true;
  if (meaningGroupsOf(answerLabel).some((group) => group.includes(candidateLabel))) return true;

  // A card a teacher made has no meaning group, so its category stands in for one: another card from the
  // same category could also be right.
  if (
    answerItem.categoryId &&
    answerItem.categoryId === candidate.categoryId &&
    (!isInAnyMeaningGroup(answerLabel) || !isInAnyMeaningGroup(candidateLabel))
  ) {
    return true;
  }

  if (type === "fill-blank") {
    // Another card with the same sentence role can often complete an open sentence too.
    if (answerItem.sentenceRole && candidate.sentenceRole === answerItem.sentenceRole) return true;
    if (fillBlankAlsoFits[answerLabel]?.includes(candidateLabel)) return true;
  }

  return false;
}

/**
 * True when the question text itself points at the candidate: it names the card, or it has a word such as
 * "hungry" or "feel" that makes the candidate's group a possible answer. These cards are only offered when
 * nothing else is left (`buildActivityOptionSets`).
 */
export function isQuestionRelatedDistractor(
  questionText: string,
  answerItem: Pick<LearningItem, "label">,
  candidate: Pick<LearningItem, "label">
) {
  const text = normalizeLabel(questionText ?? "");
  const answerLabel = normalizeLabel(answerItem.label);
  const candidateLabel = normalizeLabel(candidate.label);
  if (!text || answerLabel === candidateLabel) return false;
  if (textHasWord(text, candidateLabel)) return true;

  const candidateGroups = Object.entries(activityMeaningGroups)
    .filter(([, members]) => members.includes(candidateLabel))
    .map(([name]) => name);
  return questionGroupTriggers.some(
    (trigger) =>
      trigger.words.some((word) => textHasWord(text, word)) &&
      (trigger.groups.some((group) => candidateGroups.includes(group)) || Boolean(trigger.labels?.includes(candidateLabel)))
  );
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
  excludedOptionsByQuestion: string[][] = [],
  /** Options to use only when nothing else is left, such as cards the question text points at. */
  avoidedOptionsByQuestion: string[][] = []
) {
  const uniqueAnswers = uniqueOptions(answers);
  const answerPool = shuffleOptions(uniqueAnswers, seed);
  const fallbackPool = shuffleOptions(
    uniqueOptions(fallbackOptions).filter((value) => !uniqueAnswers.includes(value)),
    seed + 401
  );

  return answers.map((answer, questionIndex) => {
    const excludedOptions = new Set(excludedOptionsByQuestion[questionIndex] ?? []);
    const avoidedOptions = new Set(avoidedOptionsByQuestion[questionIndex] ?? []);
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
    const candidates = uniqueOptions([...orderedFallbacks, ...orderedAnswers]).filter(
      (value) => value !== answer && !excludedOptions.has(value)
    );
    const distractors = [
      ...candidates.filter((value) => !avoidedOptions.has(value)),
      ...candidates.filter((value) => avoidedOptions.has(value))
    ].slice(0, Math.max(choiceCount - 1, 0));

    return shuffleOptions([answer, ...distractors], seed + (questionIndex + 1) * 211);
  });
}
