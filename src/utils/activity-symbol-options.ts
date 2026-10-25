import type { Activity, ActivityQuestion, LearningItem } from "@/types";
import { normalizePecsLabel, pecsCardManifest } from "@/data/pecs-card-manifest";
import { needsGrammarActivityContext } from "@/data/grammar-card-manifest";

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

function getGeneratedPecsFilename(value?: string) {
  const match = value?.match(/(?:^|\/)pecs\/generated[_-]cards\/([^?#/]+\.png)(?:[?#].*)?$/i);
  return match?.[1];
}

/**
 * Returns only artwork that is safe to show as an Activity answer choice. The
 * normal Content Library card is deliberately not a fallback because it can
 * contain the printed answer word.
 */
export function getActivityOptionImageUrl(value: string, item?: LearningItem) {
  // Grammar needs a contextual question type. Current picture-choice games must
  // not reveal letters or use arbitrary pictures to distinguish A/An or Am/Is/Are.
  const filename = value.split(/[/?#]/).filter(Boolean).pop()?.replace(/\.png$/i, "");
  if (needsGrammarActivityContext(item?.label ?? value) ||
    needsGrammarActivityContext(value.replace(/^pecs-/, "")) ||
    (filename && needsGrammarActivityContext(filename))) return undefined;
  if (value.includes("/pecs/generated_cards_no_text/") && isEmbeddableActivityMediaUrl(value)) return value;
  if (isEmbeddableActivityMediaUrl(item?.activityImageUrl)) return item?.activityImageUrl;

  const generatedFilename = getGeneratedPecsFilename(item?.symbolImageUrl ?? value);
  if (generatedFilename) return `/pecs/generated_cards_no_text/${generatedFilename}`;

  if (!item) {
    const manifestCard = pecsCardManifest.find(
      (card) => normalizePecsLabel(card.label) === normalizePecsLabel(value)
    );
    if (manifestCard) return `/pecs/generated_cards_no_text/${manifestCard.filename}`;
  }

  return undefined;
}

export function hasActivityOptionImage(item: LearningItem) {
  return Boolean(getActivityOptionImageUrl(item.id, item));
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
      item.activityImageUrl === trimmed ||
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

/** Activity choices are picture-exchange cards. Prefer the PECS record when a
 * label is shared by both a PECS card and a gesture learning material. */
export function findPecsLearningItemForActivityValue(value: string, learningItems: LearningItem[]) {
  return findLearningItemForActivityValue(
    value,
    learningItems.filter((item) => item.contentType === "pecs")
  );
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
  const relatedPecsItem = relatedItem?.contentType === "pecs"
    ? relatedItem
    : relatedItem
      ? findPecsLearningItemForActivityValue(relatedItem.label, learningItems)
      : undefined;
  if (relatedPecsItem && hasActivityOptionImage(relatedPecsItem)) return relatedPecsItem.id;

  const currentItem = findPecsLearningItemForActivityValue(value, learningItems);
  if (currentItem && hasActivityOptionImage(currentItem)) return currentItem.id;

  const sourceItem = findPecsLearningItemForActivityValue(value, sourceLearningItems);
  const canonicalItem = sourceItem ? findCanonicalVersion(sourceItem, learningItems) : undefined;
  if (canonicalItem && hasActivityOptionImage(canonicalItem)) return canonicalItem.id;

  return value.trim();
}

export function getActivityDisplayLabel(value: string, learningItems: LearningItem[]) {
  const item = findPecsLearningItemForActivityValue(value, learningItems)
    ?? findLearningItemForActivityValue(value, learningItems);
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
  ).filter((id) => {
    const item = learningItems.find((candidate) => candidate.id === id);
    return !item || !needsGrammarActivityContext(item.label);
  });
  const questions = activity.questions.map((question) => {
    const learningItemId = resolveCanonicalLearningItemId(question.learningItemId, learningItems, sourceLearningItems);
    return { ...question, learningItemId };
  }).filter((question) => {
    // Old saved activities can still name function-word cards. Exclude the
    // question consistently before either teacher or Student scoring begins.
    const item = learningItems.find((candidate) => candidate.id === question.learningItemId)
      ?? findPecsLearningItemForActivityValue(question.answer, sourceLearningItems);
    return !needsGrammarActivityContext(item?.label ?? question.answer.replace(/^pecs-/, ""));
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
