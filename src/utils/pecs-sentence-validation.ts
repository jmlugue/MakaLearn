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
  { name: "Action Sentence", roles: ["subject", "verb", "object"] },
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

  for (const pattern of validPatterns) {
    if (rolesMatch(roles, pattern.roles)) {
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
