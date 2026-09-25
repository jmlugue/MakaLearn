// The 7 built-in PECS categories keep one color everywhere: Content (these light tints) and the Student mode
// playground (solid versions of the same hue in `playground-view.tsx`). A saved tint for these categories is
// ignored so they always match. Teacher-made categories keep the color the teacher picked.
import type { Category } from "@/types";

const builtInCategoryTints: Record<string, string> = {
  greetings: "#fef3c7", // yellow (amber)
  emotions: "#fce7f3", // pink
  family: "#ede9fe", // violet
  food: "#ffedd5", // orange
  "classroom commands": "#ccfbf1", // teal
  "daily needs": "#d1fae5", // green
  "safety words": "#fee2e2" // red
};

/** The fixed tint for a built-in category name, or undefined for a teacher-made one. */
export function builtInCategoryColor(name: string) {
  return builtInCategoryTints[name.trim().toLowerCase()];
}

/** Categories with the built-in ones set to their fixed color. */
export function withBuiltInCategoryColors(categories: Category[]) {
  return categories.map((category) => {
    const color = builtInCategoryColor(category.name);
    return color && color !== category.color ? { ...category, color } : category;
  });
}
