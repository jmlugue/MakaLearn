/**
 * Questions for cards a teacher made, which have no built-in sentence. A category mixes things (Toilet),
 * actions (Sleep), and words (More, Am), and a teacher's card does not record which it is, so no single
 * sentence fits every card:
 * - Fill in the blank starts empty. The creator asks the teacher to write it or use Draft with AI.
 * - Choose the picture asks "Which picture is from Daily Needs?", which fits any card. Wrong choices leave
 *   out the rest of the category (see `isUnsafeActivityDistractor`), so it still has one right answer.
 * Neither ever names the card.
 */

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function containsWord(text: string, word: string) {
  const escaped = normalize(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Boolean(escaped) && new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(normalize(text));
}

/** Built-in category ids look like `cat-pecs-daily-needs`, which gives "Daily Needs". */
export function builtInCategoryNameFromId(categoryId: string) {
  const match = /^cat-pecs-(.+)$/.exec(categoryId.trim().toLowerCase());
  if (!match) return undefined;
  return match[1]
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * The starting question for a card with no built-in one: "" for Fill in the blank (the teacher writes it),
 * or a Choose question that names the category. `categoryName` is used when known; otherwise a built-in
 * category is read from the card's id.
 */
export function categoryPromptFor(
  kind: "fill" | "choose",
  item: { label: string; categoryId?: string },
  categoryName?: string
) {
  if (kind === "fill") return "";
  const name = (categoryName ?? "").trim() || builtInCategoryNameFromId(item.categoryId ?? "") || "";
  if (name && !containsWord(name, item.label)) return `Which picture is from ${name}?`;
  return "Which picture is our new card?";
}
