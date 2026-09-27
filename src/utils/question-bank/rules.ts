/**
 * The rules every question in MakaLearn's question bank must pass. Written for early primary SPED learners
 * (Kinder to Grade 2 words): short, natural sentences that make the one right answer clear, and nothing unfair
 * or confusing. `scripts/test-question-bank.mjs` runs every bank question through `checkQuestion`.
 * Teacher-typed and AI-drafted questions are not checked here (the owner's decision).
 */

export type QuestionKind = "fill" | "choose";

/** Longer words that young readers know. Card words are always allowed too. */
const easyLongWords = new Set([
  "something", "someone", "everyone", "everything", "everybody", "together", "understand", "birthday",
  "tomorrow", "yesterday", "afternoon", "breakfast", "classroom", "classmate", "grandpa", "grandma"
]);

/** Content that is unfair, unsafe, or confusing for a young learner, or that talks about the app itself. */
const bannedPatterns: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\byears? old\b/i, reason: "Talks about age, which differs per child." },
  // "I say no when I do not like something" is fine; liking a particular thing is not.
  { pattern: /\bi (really )?like\b|\b(don't|do not) like\b(?! something\b)|\bfavou?rite\b|\bwould like\b/i, reason: "Depends on what a child likes." },
  { pattern: /\b(kill|die|dies|dead|blood|gun|weapon|hate|stupid|dumb)\b/i, reason: "Not suitable for young learners." },
  { pattern: /\b(card|cards|pecs|symbol|symbols)\b/i, reason: "Talks about the app instead of real life." }
];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function hasWord(text: string, word: string) {
  const escaped = normalize(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Boolean(escaped) && new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(normalize(text));
}

/** Sentences split on . ? ! outside quotes; a quoted example ("I ___ happy") stays inside its sentence. */
export function sentencesOf(text: string) {
  const withoutQuotes = text.replace(/"[^"]*"/g, (quote) => quote.replace(/[.?!]/g, ""));
  return withoutQuotes
    .split(/[.?!]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function wordsOf(sentence: string) {
  return sentence.split(/\s+/).filter((word) => /[a-z_]/i.test(word));
}

function isEasyWord(word: string, knownWords: Set<string>) {
  return word
    .toLowerCase()
    .split(/[^a-z']+/)
    .filter(Boolean)
    .every((part) => {
      const bare = part.replace(/'s$|'/g, "");
      if (bare.length <= 8 || easyLongWords.has(bare) || knownWords.has(bare)) return true;
      // Plurals of known words ("vegetables") are fine too.
      return knownWords.has(bare.replace(/es$/, "")) || knownWords.has(bare.replace(/s$/, ""));
    });
}

/**
 * The rules a question breaks, or an empty list when it passes. `knownWords` are card words (built-in labels
 * and the vocabulary), which may be longer than 8 letters.
 */
export function checkQuestion(kind: QuestionKind, answer: string, text: string, knownWords: Set<string> = new Set()) {
  const problems: string[] = [];
  const trimmed = text.trim();
  const blanks = (trimmed.match(/_{4,}/g) ?? []).length;
  const sentences = sentencesOf(trimmed);

  // 1. Shape.
  if (kind === "fill" && blanks !== 1) problems.push("Needs exactly one ____.");
  if (kind === "choose" && blanks !== 0) problems.push("A question has no ____.");
  if (kind === "choose" && !trimmed.endsWith("?")) problems.push("A question ends with ?.");
  if (!/[.?!]["']?$/.test(trimmed)) problems.push("Must end with . ? or !.");

  // 2. Never names the answer. "I" is the one exception: natural sentences need it.
  if (normalize(answer) !== "i" && hasWord(trimmed.replace(/_{3,}/g, " "), answer)) {
    problems.push(`Names the answer "${answer}".`);
  }

  // 3. Short, simple sentences.
  if (sentences.length < 1 || sentences.length > 3) problems.push("Use 1 to 3 sentences.");
  sentences.forEach((sentence) => {
    if (wordsOf(sentence).length > 12) problems.push(`Too long: "${sentence}".`);
  });
  const totalWords = sentences.reduce((sum, sentence) => sum + wordsOf(sentence).length, 0);
  if (totalWords > 20) problems.push("More than 20 words in total.");

  // 4. Easy words.
  wordsOf(trimmed.replace(/"/g, " ")).forEach((word) => {
    if (!isEasyWord(word, knownWords)) problems.push(`Hard word: "${word.replace(/[^a-z'-]/gi, "")}".`);
  });

  // 5. Enough to go on.
  if (kind === "choose" && totalWords < 5) problems.push("Too short to give a situation.");

  // 6. Fair for every child.
  bannedPatterns.forEach(({ pattern, reason }) => {
    if (pattern.test(trimmed)) problems.push(reason);
  });

  return problems;
}

/**
 * The Fill in the blank style the owner chose (built-in cards so far): one plain sentence with the blank inside
 * it. No speaker lines ('Mom: "..."'), and no lead-in that ends by restating the answer ("She is my ____.").
 */
export function checkFillStyle(text: string) {
  const problems: string[] = [];
  const trimmed = text.trim();
  if (sentencesOf(trimmed).length !== 1) problems.push("Use one sentence.");
  if (/"|\b[A-Z][a-z]+:/.test(trimmed)) problems.push("No conversations or quotes.");
  if (/(^|[.!?]\s+)(she|he|it|they|this|that) (is|are) (my |a |an |the )?_{4,}[.!?]$/i.test(trimmed)) {
    problems.push("Do not end by restating the answer.");
  }
  return problems;
}
