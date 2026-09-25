import { activityTypeNamePhrases } from "@/utils/activity-labels";
import type { ActivityType, Category, LearningItem } from "@/types";

const MAX_TITLE_LENGTH = 60;

/** The category most of the cards share, when one clearly leads. */
function mainCategoryName(items: Pick<LearningItem, "categoryId">[], categories: Category[]) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    if (item.categoryId) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
  });
  const [top] = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (!top || top[1] * 2 < items.length) return undefined;
  return categories.find((category) => category.id === top[0])?.name;
}

/**
 * Short default name: "Feelings match activity". The topic is the lesson, else the main category of the
 * cards, else the first card.
 */
export function buildDefaultActivityTitle(
  type: ActivityType,
  items: Pick<LearningItem, "label" | "categoryId">[],
  { lessonTitle, categories = [] }: { lessonTitle?: string; categories?: Category[] } = {}
) {
  const topic = lessonTitle?.trim() || mainCategoryName(items, categories) || items[0]?.label || "New";
  const suffix = ` ${activityTypeNamePhrases[type]} activity`;
  const room = MAX_TITLE_LENGTH - suffix.length;
  const shortTopic = topic.length > room ? `${topic.slice(0, room - 1).trimEnd()}…` : topic;
  return `${shortTopic}${suffix}`;
}
