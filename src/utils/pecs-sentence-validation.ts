import type { SentenceRole } from "@/types";

export type PecsSentenceCard = {
  id: string;
  label: string;
  sentenceRole?: SentenceRole;
};

export type PecsSentenceValidationResult = {
  isValid: boolean;
  patternName?: string;
  generatedSentence: string;
  feedback: string;
  suggestion?: string;
};

const validPatterns: Array<{ name: string; roles: SentenceRole[] }> = [
  { name: "Emotion Sentence", roles: ["subject", "be_verb", "emotion"] },
  { name: "Intransitive Action", roles: ["subject", "verb"] },
  { name: "Simple Command", roles: ["command"] },
  { name: "Polite Command", roles: ["polite_word", "command"] },
  { name: "Response", roles: ["response"] },
  { name: "Greeting", roles: ["greeting"] },
  { name: "Safety Expression", roles: ["safety_word"] }
];

function normalizeLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function rolesMatch(left: SentenceRole[], right: SentenceRole[]) {
  return left.length === right.length && left.every((role, index) => role === right[index]);
}

const edibleObjectLabels = new Set(["food", "rice", "bread", "banana"]);
const drinkableObjectLabels = new Set(["water", "milk"]);
const intransitiveCommandLabels = new Set(["sit", "stand", "listen", "look", "wait", "stop", "help", "rest"]);

function getContextualRoles(cards: PecsSentenceCard[], index: number): SentenceRole[] {
  const card = cards[index];
  const role = card.sentenceRole;
  if (!role) return [];

  const label = normalizeLabel(card.label);
  const previousLabel = index > 0 ? normalizeLabel(cards[index - 1].label) : "";
  const roles = new Set<SentenceRole>([role]);

  if (index === 1 && label === "help" && cards[0]?.sentenceRole === "subject") {
    roles.add("verb");
  }

  if (index === 1 && role === "command" && intransitiveCommandLabels.has(label) && cards.length === 2 && cards[0]?.sentenceRole === "subject") {
    roles.add("verb");
  }

  if (index === 1 && role === "object" && label === "rest" && cards.length === 2 && cards[0]?.sentenceRole === "subject") {
    roles.add("verb");
  }

  if (index === 2 && role === "subject" && label !== "i" && previousLabel === "help") {
    roles.add("object");
  }

  return [...roles];
}

function sequenceCanMatch(actualRoles: SentenceRole[][], expectedRoles: SentenceRole[]) {
  return (
    actualRoles.length === expectedRoles.length &&
    actualRoles.every((roles, index) => roles.includes(expectedRoles[index]))
  );
}

function canUseActionObject(cards: PecsSentenceCard[], labels: string[]) {
  if (cards.length !== 3 || cards[0].sentenceRole !== "subject") return false;

  const verb = labels[1];
  const object = labels[2];
  const objectRole = cards[2].sentenceRole;

  if (verb === "help") {
    return objectRole === "subject" && object !== "i";
  }

  if (verb === "eat") {
    return edibleObjectLabels.has(object);
  }

  if (verb === "drink") {
    return drinkableObjectLabels.has(object);
  }

  return false;
}

// Rule-based PECS/Makaton symbol arrangement validation. This is intentionally
// simple and explainable for the MVP; future work can replace or augment it
// with gesture recognition, NLP, or AI feedback after approved data is ready.
export function validatePecsSentence(
  cards: PecsSentenceCard[],
  approvedCardIds: Set<string>
): PecsSentenceValidationResult {
  const generatedSentence = cards.map((card) => card.label).join(" ");

  if (!cards.length) {
    return {
      isValid: false,
      generatedSentence,
      feedback: "Add a card first."
    };
  }

  if (cards.length > 5) {
    return {
      isValid: false,
      generatedSentence,
      feedback: "Use fewer cards."
    };
  }

  if (cards.some((card) => !approvedCardIds.has(card.id))) {
    return {
      isValid: false,
      generatedSentence,
      feedback: "Use a card from the library."
    };
  }

  if (cards.length === 1) {
    return {
      isValid: true,
      patternName: "Single Card",
      generatedSentence,
      feedback: "Good job."
    };
  }

  if (cards.some((card) => !card.sentenceRole)) {
    return {
      isValid: false,
      generatedSentence,
      feedback: "Try another card."
    };
  }

  const roles = cards.map((card) => card.sentenceRole as SentenceRole);
  const contextualRoles = cards.map((_, index) => getContextualRoles(cards, index));
  const labels = cards.map((card) => normalizeLabel(card.label));

  if (rolesMatch(roles, ["subject", "verb", "object"]) && labels[1] === "want") {
    return {
      isValid: true,
      patternName: "Basic Request",
      generatedSentence,
      feedback: "Good job."
    };
  }

  if (rolesMatch(roles, ["subject", "verb"]) && labels[1] === "want") {
    return {
      isValid: false,
      generatedSentence,
      feedback: "Add one more card."
    };
  }

  if (sequenceCanMatch(contextualRoles, ["subject", "verb", "object"]) && canUseActionObject(cards, labels)) {
    return {
      isValid: true,
      patternName: "Action Sentence",
      generatedSentence,
      feedback: "Good job."
    };
  }

  for (const pattern of validPatterns) {
    if (sequenceCanMatch(contextualRoles, pattern.roles)) {
      return {
        isValid: true,
        patternName: pattern.name,
        generatedSentence,
        feedback: "Good job."
      };
    }
  }

  return {
    isValid: false,
    generatedSentence,
    feedback: "Try again."
  };
}
