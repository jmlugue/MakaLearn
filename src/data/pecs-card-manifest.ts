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

// The manifest keeps category and sentence-role metadata aligned with the
// learning media migration. Runtime media URLs come from Supabase rows.
export const pecsCardManifest: PecsManifestCard[] = (manifestRows as ManifestRow[]).map((row) => ({
  filename: row.filename,
  label: row.label,
  category: row.category,
  sentenceRole: row.sentence_role
}));

export function normalizePecsLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}
