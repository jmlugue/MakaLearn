import {
  normalizePecsLabel,
  pecsCardManifest,
  type PecsCardCategory
} from "@/data/pecs-card-manifest";
import type { Category, LearningItem } from "@/types";
import { normalizeLearningSpeechText } from "@/utils/speech-text";

const categoryColors: Record<PecsCardCategory, string> = {
  Greetings: "#dbeafe",
  Emotions: "#fce7f3",
  Family: "#ede9fe",
  Food: "#dcfce7",
  "Classroom Commands": "#e0f2fe",
  "Daily Needs": "#fef3c7",
  "Safety Words": "#fee2e2"
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function getPecsCategoryId(category: PecsCardCategory) {
  return `cat-pecs-${slugify(category)}`;
}

export function createSpeechFallbackAudioUrl(label: string) {
  return `speech:${encodeURIComponent(normalizeLearningSpeechText(label))}`;
}

export function isSpeechFallbackAudio(value?: string) {
  return Boolean(value?.startsWith("speech:"));
}

export function getSpeechFallbackLabel(value: string) {
  return decodeURIComponent(value.replace(/^speech:/, ""));
}

function isEmbeddableMediaUrl(value?: string) {
  return Boolean(
    value &&
      (value.startsWith("http://") ||
        value.startsWith("https://"))
  );
}

function uniqueTags(tags: string[]) {
  return [...new Set(tags.filter(Boolean))];
}

function createPecsDescription(label: string, category: PecsCardCategory) {
  const lowerLabel = label.toLowerCase();

  if (category === "Greetings") {
    return `Use when greeting someone, saying goodbye, or starting a classroom interaction with "${label}".`;
  }

  if (category === "Emotions") {
    return `Use when the learner needs to express feeling ${lowerLabel} or talk about emotions.`;
  }

  if (category === "Food") {
    return `Use when the learner wants ${lowerLabel}, is choosing food, or is talking about snack and meal routines.`;
  }

  if (category === "Daily Needs") {
    return `Use when the learner needs ${lowerLabel} or wants to communicate an everyday request.`;
  }

  if (category === "Classroom Commands") {
    return `Use when practising the classroom direction "${label}" or following a teacher-guided routine.`;
  }

  if (category === "Safety Words") {
    return `Use when the learner needs to communicate "${label}" during safety, discomfort, or urgent classroom situations.`;
  }

  if (category === "Family") {
    return `Use when the learner is talking about ${lowerLabel} or identifying familiar people.`;
  }

  return `Use when the learner needs to communicate "${label}" in a classroom routine.`;
}

function isGenericPecsDescription(description: string) {
  return /^A (provided )?PECS\/AAC card/i.test(description) || /^A PECS card/i.test(description);
}

export function createPecsManifestCategories(createdBy = "user-admin"): Category[] {
  return pecsCardManifest.reduce<Category[]>((records, card) => {
    const id = getPecsCategoryId(card.category);
    if (records.some((category) => category.id === id)) return records;

    records.push({
      id,
      name: card.category,
      description: `PECS/AAC cards for ${card.category.toLowerCase()} practice.`,
      color: categoryColors[card.category],
      createdBy
    });
    return records;
  }, []);
}

export function ensurePecsManifestCategories(records: Category[]) {
  return records;
}

function getManifestCard(label: string) {
  const normalizedLabel = normalizePecsLabel(label);
  return pecsCardManifest.find((card) => normalizePecsLabel(card.label) === normalizedLabel);
}

function getManifestItemId(filename: string) {
  return `pecs-${filename.replace(/\.[^.]+$/i, "").replace(/_/g, "-")}`;
}

function getPecsItemPreference(item: LearningItem) {
  const card = getManifestCard(item.label);
  let score = 0;

  // A usable image matters most. The canonical manifest ID breaks ties between
  // old seed rows such as item-eat and the current pecs-eat record.
  if (isEmbeddableMediaUrl(item.symbolImageUrl)) score += 100;
  if (card && item.id === getManifestItemId(card.filename)) score += 50;
  if (isEmbeddableMediaUrl(item.audioUrl) || isSpeechFallbackAudio(item.audioUrl)) score += 10;
  if (card && item.categoryId === getPecsCategoryId(card.category)) score += 5;

  return score;
}

function upgradePecsItem(item: LearningItem) {
  if (item.contentType !== "pecs") return item;

  const card = getManifestCard(item.label);
  if (!card) return item;

  return {
    ...item,
    description: isGenericPecsDescription(item.description) ? createPecsDescription(card.label, card.category) : item.description,
    symbolImageUrl: isEmbeddableMediaUrl(item.symbolImageUrl) ? item.symbolImageUrl : undefined,
    audioUrl: isEmbeddableMediaUrl(item.audioUrl) || isSpeechFallbackAudio(item.audioUrl) ? item.audioUrl : undefined,
    sentenceRole: item.sentenceRole ?? card.sentenceRole,
    tags: uniqueTags([...item.tags, "pecs", "playground", card.category.toLowerCase(), card.sentenceRole])
  };
}

export function ensurePecsManifestItems(records: LearningItem[]) {
  const deduplicated: LearningItem[] = [];
  const pecsIndexByLabel = new Map<string, number>();

  for (const sourceItem of records) {
    const item = upgradePecsItem(sourceItem);
    if (item.contentType !== "pecs") {
      deduplicated.push(item);
      continue;
    }

    const labelKey = normalizePecsLabel(item.label);
    const existingIndex = pecsIndexByLabel.get(labelKey);
    if (existingIndex === undefined) {
      pecsIndexByLabel.set(labelKey, deduplicated.length);
      deduplicated.push(item);
      continue;
    }

    if (getPecsItemPreference(item) > getPecsItemPreference(deduplicated[existingIndex])) {
      deduplicated[existingIndex] = item;
    }
  }

  return deduplicated;
}
