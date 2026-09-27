// "No category": for a material a teacher has not sorted yet. It is an ordinary category row with a fixed id, made
// the first time someone saves a material with it (teachers may create categories, so no database change is
// needed). It is grey, always listed last, and cannot be edited or deleted. Its materials are not treated as
// related to each other when activities pick wrong choices.
import type { Category } from "@/types";

export const NO_CATEGORY_ID = "cat-no-category";

export function isNoCategory(id?: string) {
  return id === NO_CATEGORY_ID;
}

export function noCategory(createdBy: string): Category {
  return {
    id: NO_CATEGORY_ID,
    name: "No category",
    description: "Materials waiting for a category. Edit a material to pick one.",
    color: "#e2e8f0",
    createdBy
  };
}

/** The list with "No category" added (if it is not saved yet) and moved to the end. */
export function withNoCategory(categories: Category[], createdBy: string) {
  const saved = categories.find((category) => isNoCategory(category.id));
  const others = categories.filter((category) => !isNoCategory(category.id));
  return [...others, saved ? { ...saved, color: "#e2e8f0" } : noCategory(createdBy)];
}
