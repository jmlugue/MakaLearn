/**
 * Starter questions for cards a teacher made, which have no built-in sentence. They come from the card's
 * category and never name the card, so the answer is not given away. Wrong choices for these cards leave out
 * the rest of the category (see `isUnsafeActivityDistractor`), so the question still has one right answer.
 * The teacher can rewrite them in the creator.
 */
type CategoryPrompts = { fill: string; choose: string };

const categoryPromptsByName: Record<string, CategoryPrompts> = {
  greetings: {
    fill: "I see my friend at the gate. I smile and say ____.",
    choose: "What can I say when I see my friend?"
  },
  emotions: {
    fill: "Look at my face. Right now I feel ____.",
    choose: "Which picture shows how I feel right now?"
  },
  family: {
    fill: "This person is special to me. This is my ____.",
    choose: "Which picture shows a person I know well?"
  },
  food: {
    fill: "It is snack time. I would like some ____.",
    choose: "What would I like at snack time?"
  },
  "classroom commands": {
    fill: "My teacher gives a direction in class. We ____.",
    choose: "What does my teacher ask us to do in class?"
  },
  "daily needs": {
    fill: "Every day at school, I ask for ____.",
    choose: "What do I ask for during the school day?"
  },
  "safety words": {
    fill: "This word helps keep me safe: ____.",
    choose: "Which picture helps keep me safe?"
  }
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function containsWord(text: string, word: string) {
  const escaped = normalize(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Boolean(escaped) && new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(normalize(text));
}

/** Built-in category ids look like `cat-pecs-classroom-commands`. */
export function builtInCategoryNameFromId(categoryId: string) {
  const match = /^cat-pecs-(.+)$/.exec(categoryId.trim().toLowerCase());
  return match ? match[1].replace(/-/g, " ") : undefined;
}

/**
 * The starter question for a card with no built-in one. `categoryName` is the card's category when known;
 * otherwise a built-in category is read from its id.
 */
export function categoryPromptFor(
  kind: keyof CategoryPrompts,
  item: { label: string; categoryId?: string },
  categoryName?: string
) {
  const name = normalize(categoryName ?? "") || builtInCategoryNameFromId(item.categoryId ?? "") || "";
  const known = categoryPromptsByName[name];
  if (known && !containsWord(known[kind], item.label)) return known[kind];

  // A teacher-made category: name the group, never the card.
  const shownName = (categoryName ?? "").trim();
  if (shownName && !containsWord(shownName, item.label)) {
    return kind === "fill" ? `This card is from ${shownName}. It shows ____.` : `Which picture is from ${shownName}?`;
  }
  return kind === "fill" ? "Look at our new card. It shows ____." : "Which picture is our new card?";
}

/** Every starter question, for tests. */
export function allCategoryPrompts() {
  return Object.entries(categoryPromptsByName).map(([name, prompts]) => ({ name, ...prompts }));
}
