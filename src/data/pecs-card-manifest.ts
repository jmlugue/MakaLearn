import manifestRows from "../../public/pecs/pecs_arasaac_manifest.json";
import type { SentenceRole } from "@/types";

export type PecsCardCategory =
  | "Greetings"
  | "Emotions"
  | "Family"
  | "Food"
  | "Classroom Commands"
  | "Daily Needs"
  | "Safety Words";

export type PecsManifestCard = {
  filename: string;
  label: string;
  category: PecsCardCategory;
  sentenceRole: SentenceRole;
  imagePath: string;
  audioPath: string;
};

type ManifestRow = {
  filename: string;
  label: string;
  category: PecsCardCategory;
  sentence_role: SentenceRole;
};

export const pecsCardCategories: PecsCardCategory[] = [
  "Greetings",
  "Emotions",
  "Family",
  "Food",
  "Classroom Commands",
  "Daily Needs",
  "Safety Words"
];

// The provided manifest is the frontend source of truth for PECS/AAC category
// and sentence-role metadata until learning_items.sentence_role exists.
export const pecsCardManifest: PecsManifestCard[] = (manifestRows as ManifestRow[]).map((row) => ({
  filename: row.filename,
  label: row.label,
  category: row.category,
  sentenceRole: row.sentence_role,
  imagePath: `/pecs/generated_cards/${row.filename}`,
  audioPath: `/audio/pecs/${row.filename.replace(/\.png$/i, ".wav")}`
}));

export function normalizePecsLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}
