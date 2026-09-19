import type { LearningItem, Lesson } from "@/types";

export function createLessonDraftFromItem(item: LearningItem): Omit<Lesson, "id" | "createdBy"> {
  const activityType = item.contentType === "gesture" ? "gesture-practice" : "choose-correct-symbol";

  return {
    title: `${item.label} guided practice`,
    objective: `Practice "${item.label}" with teacher modeling and learner response.`,
    learningItemIds: [item.id],
    instructions: "",
    activityType,
    estimatedDuration: 10,
    notes: "",
    source: "auto-generated",
    visibility: "shared"
  };
}
