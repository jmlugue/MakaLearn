import { activityTypeLabels } from "@/utils/activity-labels";
import { createFillBlankPromptForLabel } from "@/utils/fill-blank-prompts";
import { createChooseCorrectSymbolPrompt } from "@/utils/starter-learning-item-prompts";
import type { ActivityType, LearningItem } from "@/types";

export const ACTIVITY_PROMPT_TEMPLATE_VERSION = "activity-prompt-v1";

export type ActivityPromptDraftSource = "cache" | "hugging-face" | "local-fallback" | "rate-limited";
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
  materialHash?: string;
  version?: number;
  rateLimit?: {
    hourlyLimit: number;
    dailyLimit: number;
    remainingHourly: number;
    remainingDaily: number;
    retryAfterSeconds?: number;
  };
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
    "gesture-practice": "Practise each gesture with teacher guidance.",
    "simple-quiz": "Answer each question with teacher guidance."
  };

  return prompts[type];
}

export function canDraftQuestionPrompts(type: ActivityType): type is DraftablePromptActivityType {
  return type === "choose-correct-symbol" || type === "fill-blank";
}

function normalizeMaterialText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function buildActivityPromptMaterialHash(
  type: DraftablePromptActivityType,
  items: LearningItem[],
  templateVersion = ACTIVITY_PROMPT_TEMPLATE_VERSION
) {
  const material = {
    type,
    templateVersion,
    items: items
      .map((item) => ({
        id: item.id,
        label: normalizeMaterialText(item.label),
        description: normalizeMaterialText(item.description),
        instruction: normalizeMaterialText(item.instruction)
      }))
      .sort((left, right) => left.id.localeCompare(right.id))
  };

  return `activity-draft-${hashString(stableStringify(material))}`;
}

export function createLocalFallbackPromptSuggestions(
  type: DraftablePromptActivityType,
  items: LearningItem[]
): ActivityPromptSuggestion[] {
  return items.map((item) => ({
    learningItemId: item.id,
    label: item.label,
    prompt: type === "fill-blank" ? createFillBlankPromptForLabel(item.label) : createChooseCorrectSymbolPrompt(item)
  }));
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
): Pick<ActivityDraftResult, "source" | "note" | "suggestions"> {
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    return {
      source: "local-fallback",
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
        source: "local-fallback",
        note: "AI questions are not available right now. You can type the questions instead.",
        suggestions: []
      };
    }

    return {
      source: "hugging-face",
      note: `${suggestions.length} reusable ${suggestions.length === 1 ? "prompt was" : "prompts were"} drafted and saved.`,
      suggestions
    };
  } catch {
    return {
      source: "local-fallback",
      note: "AI questions are not available right now. You can type the questions instead.",
      suggestions: []
    };
  }
}
