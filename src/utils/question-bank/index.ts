/**
 * MakaLearn's question bank: ready Fill in the blank sentences and Choose the picture questions for the 50
 * built-in cards (`built-in.ts`) and for common Makaton / PECS words a teacher may add as cards
 * (`profiles.ts`). Every question passes the rules in `rules.ts`; questions that break them are dropped.
 */
import { builtInQuestions, retiredBuiltInFill, type BankEntry } from "./built-in";
import { wordProfiles, type WordProfile } from "./profiles";
import { checkFillStyle, checkQuestion, type QuestionKind } from "./rules";

export type { QuestionKind } from "./rules";

function normalize(label: string) {
  return label.trim().toLowerCase().replace(/_/g, " ").replace(/\s+/g, " ");
}

/** Hyphens and spaces count the same ("t-shirt", "t shirt"), so every caller finds the word. */
function lookupKey(label: string) {
  return normalize(label).replace(/-/g, " ");
}

const builtInByKey = new Map(Object.entries(builtInQuestions).map(([label, entry]) => [lookupKey(label), entry]));
const profilesByKey = new Map(Object.entries(wordProfiles).map(([label, entry]) => [lookupKey(label), entry]));

/** Built-in labels and vocabulary words, which may be longer than the easy-word limit. */
const knownWords = new Set(
  [...Object.keys(builtInQuestions), ...Object.keys(wordProfiles)].flatMap((label) => label.split(/[\s-]+/))
);

function profilesOf(label: string): WordProfile[] {
  const entry = profilesByKey.get(lookupKey(label));
  return entry ? ([] as WordProfile[]).concat(entry) : [];
}

function builtInOf(label: string) {
  return builtInByKey.get(lookupKey(label));
}

/** The entry for a label: built-in first, else a vocabulary profile, picking the meaning its category suggests. */
function entryFor(label: string, categoryName?: string): BankEntry | undefined {
  const builtIn = builtInOf(label);
  if (builtIn) return builtIn;
  const profiles = profilesOf(label);
  if (!profiles.length) return undefined;
  const category = normalize(categoryName ?? "");
  return (category && profiles.find((profile) => profile.hint?.some((hint) => category.includes(hint)))) || profiles[0];
}

/** True for the 50 built-in cards. */
export function isBuiltInBankLabel(label: string) {
  return Boolean(builtInOf(label));
}

/** Every bank question of this kind for the label that passes the rules, main one first. [] when unknown. */
export function bankQuestions(kind: QuestionKind, label: string, categoryName?: string) {
  const entry = entryFor(label, categoryName);
  if (!entry) return [];
  return entry[kind].filter((text) => checkQuestion(kind, label, text, knownWords).length === 0);
}

/** True when the text is one of the bank's questions for this label (any meaning, any variant). */
export function isBankQuestion(kind: QuestionKind, label: string, text: string) {
  const wanted = normalize(text);
  const entries = [builtInOf(label), ...profilesOf(label)].filter(Boolean) as BankEntry[];
  return entries.some((entry) => entry[kind].some((question) => normalize(question) === wanted));
}

/** True when the text is a retired built-in Fill sentence for this label (Sep 27 situation style). */
export function isRetiredBankFill(label: string, text: string) {
  const wanted = normalize(text);
  const retired = Object.entries(retiredBuiltInFill).find(([key]) => lookupKey(key) === lookupKey(label))?.[1] ?? [];
  return retired.some((sentence) => normalize(sentence) === wanted);
}

/**
 * The bank groups a label belongs to ("food", "feeling"). Words in the same group can answer each other's
 * questions, so they are never wrong choices for each other.
 */
export function bankGroupsOf(label: string) {
  const builtIn = builtInOf(label);
  return [builtIn?.group, ...profilesOf(label).map((profile) => profile.group)].filter((group): group is string => Boolean(group));
}

/** For tests: every label the bank knows, and the rule checker with the bank's known words. */
export function bankLabels() {
  return { builtIn: Object.keys(builtInQuestions), vocabulary: Object.keys(wordProfiles) };
}

export function checkBankQuestion(kind: QuestionKind, label: string, text: string) {
  return checkQuestion(kind, label, text, knownWords);
}

export { checkFillStyle };

/** Every raw entry for a label, including questions that fail the rules (tests report them). */
export function rawBankEntries(label: string) {
  return [builtInOf(label), ...profilesOf(label)].filter(Boolean) as BankEntry[];
}
