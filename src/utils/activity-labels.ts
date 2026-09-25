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

/** The type as it reads inside a default name: "Feelings match activity". */
export const activityTypeNamePhrases: Record<ActivityType, string> = {
  "match-word-symbol": "match",
  "choose-correct-symbol": "choose the picture",
  "fill-blank": "fill in",
  "drag-drop-symbol": "drag and drop",
  "gesture-practice": "gesture",
  "simple-quiz": "choose the word"
};

export function getActivityTypeLabel(type: ActivityType) {
  return activityTypeLabels[type];
}
