import { getSavedFillBlankPromptForLabel, isGenericFillBlankPrompt } from "@/utils/fill-blank-prompts";
import { ensurePecsManifestItems } from "@/utils/pecs-content-library";
import {
  getSavedChooseCorrectSymbolPrompt,
  getStarterLearningItemPromptDescription,
  isGenericChooseCorrectSymbolPrompt
} from "@/utils/starter-learning-item-prompts";
import type { Activity, ActivityType, LearningItem } from "@/types";

/** Every activity type, in the order the creator offers them. */
export const activityTypes: ActivityType[] = [
  "match-word-symbol",
  "choose-correct-symbol",
  "fill-blank",
  "drag-drop-symbol",
  "gesture-practice",
  "simple-quiz"
];

export const activityTypeDescriptions: Record<ActivityType, string> = {
  "match-word-symbol": "Match words to pictures.",
  "choose-correct-symbol": "Pick the right picture.",
  "fill-blank": "Choose the missing word.",
  "drag-drop-symbol": "Drag pictures to words.",
  "gesture-practice": "Practise gestures with the teacher.",
  "simple-quiz": "Pick the right word."
};

export const MAX_ACTIVITY_LEARNING_ITEMS = 5;

export type ActivityPromptStore = Record<string, string>;

export function getValidActivityType(value?: string): ActivityType | undefined {
  return activityTypes.includes(value as ActivityType) ? (value as ActivityType) : undefined;
}

export function activityUsesImageOptions(type: ActivityType) {
  return type === "match-word-symbol" || type === "choose-correct-symbol" || type === "drag-drop-symbol";
}

/** The cards a type can use: gestures for gesture practice, PECS (with a picture when needed) otherwise. */
export function canUseItem(type: ActivityType, item: LearningItem) {
  if (type === "gesture-practice") return item.contentType === "gesture";
  if (item.contentType !== "pecs") return false;
  return activityUsesImageOptions(type) ? Boolean(item.symbolImageUrl) : true;
}

export function getPromptStoreKey(type: ActivityType, learningItemId: string) {
  return `${type}:${learningItemId}`;
}

export function getSavedQuestionPrompt(type: ActivityType, item: LearningItem, promptStore: ActivityPromptStore) {
  const savedPrompt = promptStore[getPromptStoreKey(type, item.id)];
  if (savedPrompt) return savedPrompt;
  if (type === "fill-blank") return getSavedFillBlankPromptForLabel(item.label);
  if (type === "choose-correct-symbol") return getSavedChooseCorrectSymbolPrompt(item);
  return undefined;
}

export function validatePromptForActivity(type: ActivityType, item: LearningItem, prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) return "";

  if (type === "fill-blank") {
    if (!trimmed.includes("____")) return "Use ____ to show where the missing word goes.";
    if (isGenericFillBlankPrompt(item.label, trimmed)) return "Write a classroom sentence for this item.";
  }

  if (type === "choose-correct-symbol" && isGenericChooseCorrectSymbolPrompt(item, trimmed)) {
    return "Write a classroom question for this item.";
  }

  return "";
}

export function getActivityTypeDraftText(type: ActivityType) {
  if (type === "gesture-practice") return "Draft with AI is not used for gesture practice.";
  if (type === "match-word-symbol" || type === "drag-drop-symbol") {
    return "This format uses the cards directly, so no AI call is needed.";
  }
  return "Drafts a question for each card that has none.";
}

export function upgradeStarterActivityPrompts(records: Activity[]) {
  return records.map((activity) => {
    if (activity.type !== "choose-correct-symbol" && activity.type !== "fill-blank") {
      return activity;
    }

    return {
      ...activity,
      questions: activity.questions.map((question) => {
        const prompt = activity.type === "fill-blank"
          ? getSavedFillBlankPromptForLabel(question.answer)
          : getStarterLearningItemPromptDescription(question.learningItemId);
        return prompt ? { ...question, prompt } : question;
      })
    };
  });
}

export function getActivityItems(items: LearningItem[]) {
  const normalized = items.map((item) => ({
    ...item,
    contentType: item.contentType ?? (item.tags?.includes("gesture") ? ("gesture" as const) : ("pecs" as const))
  }));

  return ensurePecsManifestItems(normalized).filter(
    (item) => item.contentType === "pecs" || item.contentType === "gesture"
  );
}

/** The activity's cards, in order, skipping any that were deleted. */
export function itemsOfActivity(activity: Activity, itemById: Map<string, LearningItem>) {
  return activity.learningItemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
}

/**
 * Each type's soft accent. Agreed exception to the blue-first palette: used only as a card's top stripe,
 * its type badge, and a light cover tint, never as the main look of a surface.
 */
export const activityTypeTones: Record<ActivityType, { stripe: string; badge: string; soft: string; dot: string }> = {
  "match-word-symbol": { stripe: "bg-blue-300", badge: "bg-blue-100 text-blue-800", soft: "bg-blue-50", dot: "bg-blue-400" },
  "choose-correct-symbol": { stripe: "bg-teal-300", badge: "bg-teal-100 text-teal-800", soft: "bg-teal-50", dot: "bg-teal-400" },
  "fill-blank": { stripe: "bg-yellow-300", badge: "bg-yellow-100 text-yellow-800", soft: "bg-yellow-50", dot: "bg-yellow-400" },
  "drag-drop-symbol": { stripe: "bg-violet-300", badge: "bg-violet-100 text-violet-800", soft: "bg-violet-50", dot: "bg-violet-400" },
  "gesture-practice": { stripe: "bg-sky-300", badge: "bg-sky-100 text-sky-800", soft: "bg-sky-50", dot: "bg-sky-400" },
  "simple-quiz": { stripe: "bg-pink-300", badge: "bg-pink-100 text-pink-800", soft: "bg-pink-50", dot: "bg-pink-400" }
};
