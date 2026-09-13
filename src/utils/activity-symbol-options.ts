import type { Activity, ActivityQuestion, LearningItem } from "@/types";

const legacySymbolAliases: Record<string, string> = {
  hel: "hello",
  hlo: "hello",
  eat: "eat",
  drk: "drink",
  dri: "drink"
};

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function compactLookupValue(value: string) {
  return normalizeLookupValue(value).replace(/[^a-z0-9]/g, "");
}

export function activityUsesSymbolOptions(type: Activity["type"]) {
  return type === "match-word-symbol" || type === "choose-correct-symbol" || type === "drag-drop-symbol";
}

export function isEmbeddableActivityMediaUrl(value?: string) {
  return Boolean(
    value &&
      (value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("/") ||
        value.startsWith("blob:") ||
        value.startsWith("data:"))
  );
}

export function findLearningItemForActivityValue(value: string, learningItems: LearningItem[]) {
  const trimmed = value.trim();
  const normalized = normalizeLookupValue(trimmed);
  const compacted = compactLookupValue(trimmed);
  const alias = legacySymbolAliases[compacted];

  const directMatch = learningItems.find((item) => {
    const itemLabel = normalizeLookupValue(item.label);
    return (
      item.symbolImageUrl === trimmed ||
      item.gestureMediaUrl === trimmed ||
      item.id === trimmed ||
      itemLabel === normalized ||
      compactLookupValue(item.label) === compacted
    );
  });
  if (directMatch) return directMatch;

  if (alias) {
    const aliasMatch = learningItems.find((item) => {
      const itemLabel = normalizeLookupValue(item.label);
      return itemLabel === alias || compactLookupValue(item.label) === alias || item.id.endsWith(`-${alias}`);
    });
    if (aliasMatch) return aliasMatch;
  }

  if (compacted.length >= 3 && compacted.length <= 4) {
    const prefixMatches = learningItems.filter((item) => compactLookupValue(item.label).startsWith(compacted));
    if (prefixMatches.length === 1) return prefixMatches[0];
  }

  return undefined;
}

export function resolveActivitySymbolValue(value: string, learningItems: LearningItem[], relatedItem?: LearningItem) {
  if (isEmbeddableActivityMediaUrl(value)) return value;
  if (relatedItem?.symbolImageUrl) return relatedItem.symbolImageUrl;

  const item = findLearningItemForActivityValue(value, learningItems);
  return item?.symbolImageUrl ?? value.trim();
}

export function getActivityDisplayLabel(value: string, learningItems: LearningItem[]) {
  const item = findLearningItemForActivityValue(value, learningItems);
  return item?.label ?? value;
}

function uniqueValues(values: string[]) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

export function normalizeActivitySymbolQuestions(activity: Activity, learningItems: LearningItem[]): Activity {
  if (!activityUsesSymbolOptions(activity.type)) return activity;

  return {
    ...activity,
    questions: activity.questions.map((question) => {
      const relatedItem = learningItems.find((item) => item.id === question.learningItemId);
      const answer = resolveActivitySymbolValue(question.answer, learningItems, relatedItem);
      const options = uniqueValues([
        ...question.options.map((option) => resolveActivitySymbolValue(option, learningItems)),
        answer
      ]);

      return {
        ...question,
        answer,
        options
      };
    })
  };
}

export function normalizeActivitySymbolAnswer(question: ActivityQuestion, value: string, learningItems: LearningItem[]) {
  const relatedItem = learningItems.find((item) => item.id === question.learningItemId);
  return resolveActivitySymbolValue(value, learningItems, relatedItem);
}
