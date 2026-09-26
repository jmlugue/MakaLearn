import {
  createFillBlankPromptForLabel,
  getSavedFillBlankPromptForLabel,
  isBuiltInFillBlankPrompt,
  isGenericFillBlankPrompt
} from "@/utils/fill-blank-prompts";
import { ensurePecsManifestItems } from "@/utils/pecs-content-library";
import {
  createChooseCorrectSymbolPrompt,
  getSavedChooseCorrectSymbolPrompt,
  isBuiltInChooseCorrectSymbolPrompt,
  isGenericChooseCorrectSymbolPrompt
} from "@/utils/starter-learning-item-prompts";
import type { Activity, ActivityType, LearningItem } from "@/types";

/**
 * The activity types teachers can make and see, in the order the creator offers them. Retired types stay in
 * the database enum, and old activities of those types are hidden (`isRetiredActivity`):
 * - "gesture-practice": gestures are practised with the camera on the Gestures page.
 * - "simple-quiz" (Choose the word): it showed a word and asked for its picture, the same task as Match word
 *   to symbol.
 */
export const activityTypes: ActivityType[] = [
  "match-word-symbol",
  "choose-correct-symbol",
  "fill-blank",
  "drag-drop-symbol"
];

export const retiredActivityTypes: ActivityType[] = ["gesture-practice", "simple-quiz"];

export function isRetiredActivity(activity: Pick<Activity, "type">) {
  return retiredActivityTypes.includes(activity.type);
}

/**
 * What the learner has to do, shown in the instruction banner and read by Listen. Match names the word so the
 * learner knows exactly which picture to find.
 */
export function activityInstruction(type: ActivityType, word?: string) {
  if (type === "match-word-symbol") return word ? `Tap the picture for "${word}".` : "Tap the picture for the word.";
  if (type === "fill-blank") return "Tap the picture that finishes the sentence.";
  if (type === "drag-drop-symbol") return "Drag each picture onto its word.";
  return "Tap the picture that answers the question.";
}

export const activityTypeDescriptions: Record<ActivityType, string> = {
  "match-word-symbol": "See a word, tap its picture.",
  "choose-correct-symbol": "Read a question, tap the picture that answers it.",
  "fill-blank": "Read a sentence, tap the picture that finishes it.",
  "drag-drop-symbol": "Drag each picture onto its word.",
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

/** Every active PECS activity displays cards, so only materials with a picture can be selected. */
export function canUseItem(type: ActivityType, item: LearningItem) {
  if (type === "gesture-practice") return item.contentType === "gesture";
  if (item.contentType !== "pecs") return false;
  return Boolean(item.symbolImageUrl);
}

export function getPromptStoreKey(type: ActivityType, learningItemId: string) {
  return `${type}:${learningItemId}`;
}

/**
 * The question a card starts with: the teacher's saved one, the built-in one, or for a card a teacher made,
 * a starter from its category (`categoryName`) that never names the card.
 */
export function getSavedQuestionPrompt(
  type: ActivityType,
  item: LearningItem,
  promptStore: ActivityPromptStore,
  categoryName?: string
) {
  const savedPrompt = promptStore[getPromptStoreKey(type, item.id)];
  // Saving an activity remembers its questions, including built-in ones. An old built-in question is
  // swapped for the current one, so the creator always offers the newest wording; a teacher's own is kept.
  const savedIsBuiltIn =
    savedPrompt &&
    ((type === "fill-blank" && isBuiltInFillBlankPrompt(item.label, savedPrompt)) ||
      (type === "choose-correct-symbol" && isBuiltInChooseCorrectSymbolPrompt(item, savedPrompt)));
  if (savedPrompt && !savedIsBuiltIn) return savedPrompt;
  if (type === "fill-blank") return createFillBlankPromptForLabel(item.label, item, categoryName);
  if (type === "choose-correct-symbol") return createChooseCorrectSymbolPrompt(item, categoryName);
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
        if (activity.type === "fill-blank") {
          // Only built-in or generic sentences are upgraded; a sentence a teacher wrote is kept.
          if (!isBuiltInFillBlankPrompt(question.answer, question.prompt)) return question;
          const prompt = getSavedFillBlankPromptForLabel(question.answer);
          return prompt ? { ...question, prompt } : question;
        }
        // Only built-in or generic questions are upgraded; a question a teacher wrote is kept.
        const card = { id: question.learningItemId, label: "" };
        if (!isBuiltInChooseCorrectSymbolPrompt(card, question.prompt)) return question;
        const prompt = getSavedChooseCorrectSymbolPrompt(card);
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
 * its type badge, and a light cover tint, never as the main look of a surface. Blue and teal are left out
 * so no type looks like Lessons (blue) or Activities (teal). `text` colors the type icon on a white tile.
 */
export const activityTypeTones: Record<ActivityType, { stripe: string; badge: string; soft: string; dot: string; text: string }> = {
  "match-word-symbol": { stripe: "bg-violet-300", badge: "bg-violet-100 text-violet-800", soft: "bg-violet-50", dot: "bg-violet-400", text: "text-violet-700" },
  "choose-correct-symbol": { stripe: "bg-orange-300", badge: "bg-orange-100 text-orange-800", soft: "bg-orange-50", dot: "bg-orange-400", text: "text-orange-700" },
  "fill-blank": { stripe: "bg-yellow-300", badge: "bg-yellow-100 text-yellow-800", soft: "bg-yellow-50", dot: "bg-yellow-400", text: "text-yellow-700" },
  "drag-drop-symbol": { stripe: "bg-pink-300", badge: "bg-pink-100 text-pink-800", soft: "bg-pink-50", dot: "bg-pink-400", text: "text-pink-700" },
  "gesture-practice": { stripe: "bg-sky-300", badge: "bg-sky-100 text-sky-800", soft: "bg-sky-50", dot: "bg-sky-400", text: "text-sky-700" },
  "simple-quiz": { stripe: "bg-lime-300", badge: "bg-lime-100 text-lime-800", soft: "bg-lime-50", dot: "bg-lime-400", text: "text-lime-700" }
};
