import { activityTypeLabels } from "@/utils/activity-labels";
import type { ActivityType, LearningItem } from "@/types";

export type ActivityPromptDraftSource = "hugging-face" | "local";
export type DraftablePromptActivityType = Extract<ActivityType, "choose-correct-symbol" | "fill-blank">;

export type ActivityPromptSuggestion = {
  learningItemId: string;
  label: string;
  prompt: string;
};

export type ActivityDraftResult = {
  source: ActivityPromptDraftSource;
  note: string;
  suggestions: ActivityPromptSuggestion[];
};

function getItemSummary(item: LearningItem) {
  const description = item.description.trim();
  const instruction = item.instruction.trim();
  const tags = item.tags.length ? ` Tags: ${item.tags.join(", ")}.` : "";

  return `- id: ${item.id}; label: ${item.label}; description: ${description || "No description provided."}; instruction: ${instruction || "None."}${tags}`;
}

export function buildActivityTitle(type: ActivityType, items: Pick<LearningItem, "label">[]) {
  const itemNames = items.map((item) => item.label).join(", ");
  return `${activityTypeLabels[type]}: ${itemNames}`.slice(0, 90).trim();
}

export function buildDefaultActivityPrompt(type: ActivityType) {
  const prompts: Record<ActivityType, string> = {
    "match-word-symbol": "Match each word to its PECS card.",
    "choose-correct-symbol": "Choose the PECS card that answers each prompt.",
    "fill-blank": "Complete each sentence with the missing PECS word.",
    "drag-drop-symbol": "Drag each PECS card to its matching word.",
    "gesture-practice": "Practise each gesture with teacher guidance."
  };

  return prompts[type];
}

export function canDraftQuestionPrompts(type: ActivityType): type is DraftablePromptActivityType {
  return type === "choose-correct-symbol" || type === "fill-blank";
}

export function buildPromptDraftRequest(
  type: DraftablePromptActivityType,
  items: LearningItem[]
) {
  const promptInstruction =
    type === "fill-blank"
      ? "Create one simple fill-in-the-blank sentence for each item. Each prompt must contain exactly one ____ blank and the answer must be the item label."
      : "Create one short teacher question for each item. The learner should answer by choosing the matching PECS card.";

  return [
    "Create reusable classroom question prompts for MakaLearn PECS/AAC learning items.",
    "Use plain English for SPED classroom support. Do not claim the content is official Makaton.",
    "Keep each prompt short, concrete, and suitable for early communication practice.",
    promptInstruction,
    "Return only valid JSON with exactly this shape:",
    '{"prompts":[{"learningItemId":"item id","prompt":"question text"}]}',
    "",
    `Activity type: ${activityTypeLabels[type]}`,
    "Learning items needing prompts:",
    items.map(getItemSummary).join("\n")
  ].join("\n");
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);

  return "";
}

function cleanPrompt(value: unknown, type: DraftablePromptActivityType) {
  if (typeof value !== "string") return "";

  const prompt = value.replace(/\s+/g, " ").trim().slice(0, 180).trim();
  if (!prompt) return "";
  if (type === "fill-blank" && !prompt.includes("____")) return "";

  return prompt;
}

export function parsePromptDraftText(
  text: string,
  type: DraftablePromptActivityType,
  requestedItems: LearningItem[]
): ActivityDraftResult {
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    return {
      source: "local",
      note: "AI questions are not available right now. You can type the questions instead.",
      suggestions: []
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as { prompts?: Array<{ learningItemId?: unknown; prompt?: unknown }> };
    const requestedById = new Map(requestedItems.map((item) => [item.id, item]));
    const suggestions = Array.isArray(parsed.prompts)
      ? parsed.prompts.flatMap((entry) => {
          if (typeof entry.learningItemId !== "string") return [];
          const item = requestedById.get(entry.learningItemId);
          if (!item) return [];
          const prompt = cleanPrompt(entry.prompt, type);
          return prompt ? [{ learningItemId: item.id, label: item.label, prompt }] : [];
        })
      : [];

    if (!suggestions.length) {
      return {
        source: "local",
        note: "AI questions are not available right now. You can type the questions instead.",
        suggestions: []
      };
    }

    return {
      source: "hugging-face",
      note: `${suggestions.length} reusable ${suggestions.length === 1 ? "prompt was" : "prompts were"} drafted and saved for this browser.`,
      suggestions
    };
  } catch {
    return {
      source: "local",
      note: "AI questions are not available right now. You can type the questions instead.",
      suggestions: []
    };
  }
}
