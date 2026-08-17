import { activityTypeLabels } from "@/utils/activity-labels";
import type { ActivityType, LearningItem } from "@/types";

export type ActivityDraftSource = "hugging-face" | "local";

export type ActivityDraftResult = {
  title: string;
  instructions: string;
  source: ActivityDraftSource;
  note: string;
};

function getItemSummary(item: LearningItem) {
  const description = item.description.trim();
  const instruction = item.instruction.trim();
  const tags = item.tags.length ? ` Tags: ${item.tags.join(", ")}.` : "";
  const role = item.sentenceRole ? ` Sentence role: ${item.sentenceRole}.` : "";

  return `- ${item.label} (${item.contentType}). ${description || "No description provided."} ${instruction || ""}${role}${tags}`.trim();
}

export function buildLocalActivityDraft(type: ActivityType, items: LearningItem[]): ActivityDraftResult {
  const count = items.length;
  const noun = count === 1 ? "item" : "items";
  const itemNames = items.map((item) => item.label).join(", ");

  const instructions: Record<ActivityType, string> = {
    "match-word-symbol": `Show the ${count} selected ${noun}. Ask the learner to match each word to its picture, then revisit any missed matches.`,
    "choose-correct-symbol": `Read each prompt aloud and ask the learner to choose the correct picture. Give one repeat if needed before moving on.`,
    "fill-blank": `Read each sentence with a pause at the blank. Let the learner choose the missing word, then read the completed sentence together.`,
    "drag-drop-symbol": `Ask the learner to drag each picture to its matching word. On touch screens, tap a picture first and then choose its word.`,
    "gesture-practice": `Model each selected gesture once, then ask the learner to copy it. Mark the attempt after the learner has had enough time to respond.`
  };

  return {
    title: `${activityTypeLabels[type]}: ${itemNames}`,
    instructions: instructions[type],
    source: "local",
    note: "Local draft added. Review the name and directions before saving."
  };
}

export function buildActivityDraftPrompt(type: ActivityType, items: LearningItem[]) {
  return [
    "Create one classroom activity draft for a teacher using the selected MakaLearn learning items.",
    "The learner may use PECS/AAC cards or teacher-guided Makaton-style gesture practice.",
    "Use plain, practical teacher directions. Do not claim the content is official Makaton.",
    "Keep the activity short, supportive, and suitable for early communication practice.",
    "Return only valid JSON with exactly these keys: title, instructions.",
    "The title must be 8 words or fewer.",
    "The instructions must be 1 or 2 concise sentences.",
    "",
    `Activity type: ${activityTypeLabels[type]}`,
    "Selected learning items:",
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

function cleanSingleLine(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

function cleanInstructions(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420)
    .trim();
}

export function parseActivityDraftText(text: string, fallback: ActivityDraftResult): ActivityDraftResult {
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    return {
      ...fallback,
      note: "Local draft used because the model response was not valid JSON."
    };
  }

  try {
    const parsed = JSON.parse(jsonText) as { title?: unknown; instructions?: unknown };
    const title = cleanSingleLine(parsed.title, 80);
    const instructions = cleanInstructions(parsed.instructions);

    if (!title || !instructions) {
      return {
        ...fallback,
        note: "Local draft used because the model response was incomplete."
      };
    }

    return {
      title,
      instructions,
      source: "hugging-face",
      note: "AI draft added. Review the name and directions before saving."
    };
  } catch {
    return {
      ...fallback,
      note: "Local draft used because the model response could not be parsed."
    };
  }
}
