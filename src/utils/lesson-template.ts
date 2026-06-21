import type { ActivityType, LearningItem, Lesson } from "@/types";

export function createLessonDraftFromItem(item: LearningItem): Omit<Lesson, "id" | "createdBy"> {
  return {
    title: `${item.label} guided practice`,
    objective: `Practice the demo word "${item.label}" with teacher modeling and learner response.`,
    learningItemIds: [item.id],
    instructions: `Introduce ${item.label}, model the instruction, then run a short activity and review the learner's response.`,
    activityType: "choose-correct-symbol" satisfies ActivityType,
    estimatedDuration: 10,
    notes: "Review and adapt this draft before saving it to the shared lesson list.",
    source: "auto-generated",
    visibility: "shared"
  };
}
