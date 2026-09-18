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

function findCanonicalVersion(item: LearningItem, learningItems: LearningItem[]) {
  return learningItems.find(
    (candidate) =>
      candidate.contentType === item.contentType &&
      normalizeLookupValue(candidate.label) === normalizeLookupValue(item.label)
  );
}

export function resolveCanonicalLearningItemId(
  learningItemId: string,
  learningItems: LearningItem[],
  sourceLearningItems: LearningItem[] = learningItems
) {
  if (learningItems.some((item) => item.id === learningItemId)) return learningItemId;

  const sourceItem = sourceLearningItems.find((item) => item.id === learningItemId);
  return sourceItem ? findCanonicalVersion(sourceItem, learningItems)?.id ?? learningItemId : learningItemId;
}

export function resolveActivitySymbolValue(
  value: string,
  learningItems: LearningItem[],
  relatedItem?: LearningItem,
  sourceLearningItems: LearningItem[] = learningItems
) {
  if (relatedItem?.symbolImageUrl) return relatedItem.id;

  const currentItem = findLearningItemForActivityValue(value, learningItems);
  if (currentItem?.symbolImageUrl) return currentItem.id;

  const sourceItem = findLearningItemForActivityValue(value, sourceLearningItems);
  const canonicalItem = sourceItem ? findCanonicalVersion(sourceItem, learningItems) : undefined;
  if (canonicalItem?.symbolImageUrl) return canonicalItem.id;

  return value.trim();
}

export function getActivityDisplayLabel(value: string, learningItems: LearningItem[]) {
  const item = findLearningItemForActivityValue(value, learningItems);
  return item?.label ?? value;
}

function uniqueValues(values: string[]) {
  return values.filter((value, index) => value && values.indexOf(value) === index);
}

export function normalizeActivitySymbolQuestions(
  activity: Activity,
  learningItems: LearningItem[],
  sourceLearningItems: LearningItem[] = learningItems
): Activity {
  const learningItemIds = uniqueValues(
    activity.learningItemIds.map((id) => resolveCanonicalLearningItemId(id, learningItems, sourceLearningItems))
  );
  const questions = activity.questions.map((question) => {
    const learningItemId = resolveCanonicalLearningItemId(question.learningItemId, learningItems, sourceLearningItems);
    return { ...question, learningItemId };
  });

  if (!activityUsesSymbolOptions(activity.type)) return { ...activity, learningItemIds, questions };

  return {
    ...activity,
    learningItemIds,
    questions: questions.map((question) => {
      const relatedItem = learningItems.find((item) => item.id === question.learningItemId);
      const answer = resolveActivitySymbolValue(question.answer, learningItems, relatedItem, sourceLearningItems);
      const options = uniqueValues([
        ...question.options.map((option) => resolveActivitySymbolValue(option, learningItems, undefined, sourceLearningItems)),
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
