import type { ActivityType } from "@/types";

export const activityTypeLabels: Record<ActivityType, string> = {
  "match-word-symbol": "Match word to symbol",
  "choose-correct-symbol": "Choose correct symbol",
  "fill-blank": "Fill in the blank",
  "drag-drop-symbol": "Drag and drop symbol cards",
  "gesture-practice": "Gesture practice activity",
  "simple-quiz": "Simple quiz"
};

export function getActivityTypeLabel(type: ActivityType) {
  return activityTypeLabels[type];
}
