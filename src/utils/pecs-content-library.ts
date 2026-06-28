import {
  normalizePecsLabel,
  pecsCardManifest,
  type PecsCardCategory
} from "@/data/pecs-card-manifest";
import type { Category, LearningItem, MediaAsset } from "@/types";

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
  return `speech:${encodeURIComponent(label)}`;
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
        value.startsWith("https://") ||
        value.startsWith("/") ||
        value.startsWith("blob:"))
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
  const existingIds = new Set(records.map((category) => category.id));
  return [
    ...records,
    ...createPecsManifestCategories().filter((category) => !existingIds.has(category.id))
  ];
}

export function ensurePecsManifestItems(records: LearningItem[]) {
  const itemByLabel = new Map(
    records
      .filter((item) => item.contentType === "pecs")
      .map((item) => [normalizePecsLabel(item.label), item])
  );

  const upgradedRecords = records.map((item) => {
    if (item.contentType !== "pecs") return item;

    const card = pecsCardManifest.find((candidate) => normalizePecsLabel(candidate.label) === normalizePecsLabel(item.label));
    if (!card) return item;

    return {
      ...item,
      description: isGenericPecsDescription(item.description) ? createPecsDescription(card.label, card.category) : item.description,
      symbolImageUrl: isEmbeddableMediaUrl(item.symbolImageUrl) ? item.symbolImageUrl : card.imagePath,
      audioUrl: isEmbeddableMediaUrl(item.audioUrl) ? item.audioUrl : card.audioPath,
      sentenceRole: item.sentenceRole ?? card.sentenceRole,
      tags: uniqueTags([...item.tags, "pecs", "playground", card.category.toLowerCase(), card.sentenceRole])
    };
  });

  const existingLabels = new Set(
    upgradedRecords
      .filter((item) => item.contentType === "pecs")
      .map((item) => normalizePecsLabel(item.label))
  );

  const manifestItems: LearningItem[] = pecsCardManifest
    .filter((card) => !existingLabels.has(normalizePecsLabel(card.label)) && !itemByLabel.has(normalizePecsLabel(card.label)))
    .map((card) => ({
      id: `pecs-${card.filename.replace(/\.png$/i, "").replace(/_/g, "-")}`,
      contentType: "pecs",
      label: card.label,
      categoryId: getPecsCategoryId(card.category),
      description: createPecsDescription(card.label, card.category),
      instruction: "Use this card during teacher-guided PECS/AAC sentence building and classroom routines.",
      symbolImageUrl: card.imagePath,
      audioUrl: card.audioPath,
      sentenceRole: card.sentenceRole,
      tags: uniqueTags(["pecs", "classroom", "playground", card.category.toLowerCase(), card.sentenceRole]),
      createdBy: "user-admin",
      updatedAt: "2026-06-26T00:00:00.000Z"
    }));

  return [...upgradedRecords, ...manifestItems];
}

export function ensurePecsManifestMediaRecords(items: LearningItem[], records: MediaAsset[]) {
  const generatedRecords = items.flatMap((item) => {
    const uploadedAt = item.updatedAt;
    const itemRecords: MediaAsset[] = [];

    if (item.symbolImageUrl && isEmbeddableMediaUrl(item.symbolImageUrl)) {
      itemRecords.push({
        id: `media-${item.id}-symbol`,
        title: `${item.label} PECS card image`,
        type: "symbol-image",
        fileName: item.symbolImageUrl.split("/").filter(Boolean).pop() ?? `${slugify(item.label)}.png`,
        bucket: "symbol-images",
        publicUrl: item.symbolImageUrl,
        uploadedBy: item.createdBy,
        uploadedAt,
        relatedItemId: item.id
      });
    }

    if (item.gestureMediaUrl && isEmbeddableMediaUrl(item.gestureMediaUrl)) {
      itemRecords.push({
        id: `media-${item.id}-gesture`,
        title: `${item.label} gesture media`,
        type: "gesture-media",
        fileName: item.gestureMediaUrl.split("/").filter(Boolean).pop() ?? `${slugify(item.label)}-gesture`,
        bucket: "gesture-media",
        publicUrl: item.gestureMediaUrl,
        uploadedBy: item.createdBy,
        uploadedAt,
        relatedItemId: item.id
      });
    }

    if (item.audioUrl && (isEmbeddableMediaUrl(item.audioUrl) || isSpeechFallbackAudio(item.audioUrl))) {
      const isFallback = isSpeechFallbackAudio(item.audioUrl);
      itemRecords.push({
        id: `media-${item.id}-audio`,
        title: isFallback ? `${item.label} fallback audio cue` : `${item.label} audio cue`,
        type: "audio-file",
        fileName: isFallback ? `${slugify(item.label)}-speech-fallback` : item.audioUrl.split("/").filter(Boolean).pop() ?? `${slugify(item.label)}-audio`,
        bucket: "audio-files",
        publicUrl: item.audioUrl,
        uploadedBy: item.createdBy,
        uploadedAt,
        relatedItemId: item.id
      });
    }

    return itemRecords;
  });

  const byItemAndType = new Map<string, MediaAsset>();
  [...generatedRecords, ...records].forEach((record) => {
    const key = `${record.relatedItemId ?? record.id}:${record.type}`;
    const existing = byItemAndType.get(key);
    if (!existing || record.publicUrl || !existing.publicUrl) {
      byItemAndType.set(key, record);
    }
  });

  return [...byItemAndType.values()].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}
