import type { LearningItem } from "@/types";

export function materialLabelKey(label: string) {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

/** PECS and Gesture may share a word. Two materials of the same type may not. */
export function duplicateMaterialMessage(label: string, kind: LearningItem["contentType"], items: Pick<LearningItem, "id" | "contentType" | "label">[], excludeId?: string) {
  const key = materialLabelKey(label);
  return key && items.some((item) => item.id !== excludeId && item.contentType === kind && materialLabelKey(item.label) === key)
    ? `A ${kind === "pecs" ? "PECS card" : "gesture"} named "${label.trim()}" already exists.`
    : "";
}
