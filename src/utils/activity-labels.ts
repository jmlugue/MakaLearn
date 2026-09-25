import type { ActivityType } from "@/types";

/** Full names. Used in AI prompts and anywhere the whole name reads better. */
export const activityTypeLabels: Record<ActivityType, string> = {
  "match-word-symbol": "Match word to symbol",
  "choose-correct-symbol": "Choose correct symbol",
  "fill-blank": "Fill in the blank",
  "drag-drop-symbol": "Drag and drop symbol cards",
  "gesture-practice": "Gesture practice activity",
  "simple-quiz": "Choose the word"
};

/** Short names for badges, filters, and the creator in teacher screens. */
export const activityTypeShortLabels: Record<ActivityType, string> = {
  "match-word-symbol": "Match",
  "choose-correct-symbol": "Choose the picture",
  "fill-blank": "Fill in the blank",
  "drag-drop-symbol": "Drag and drop",
  "gesture-practice": "Gesture practice",
  "simple-quiz": "Choose the word"
};

/** The start of a default name: "Matching activity: Feelings". */
export const activityTypeNamePhrases: Record<ActivityType, string> = {
  "match-word-symbol": "Matching activity",
  "choose-correct-symbol": "Choose the picture activity",
  "fill-blank": "Fill in the blank activity",
  "drag-drop-symbol": "Drag and drop activity",
  "gesture-practice": "Gesture activity",
  "simple-quiz": "Choose the word activity"
};

export function getActivityTypeLabel(type: ActivityType) {
  return activityTypeLabels[type];
}
