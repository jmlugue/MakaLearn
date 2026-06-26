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
      feedback: "Drag PECS cards into the sentence box first.",
      suggestion: "Start with one card, such as Hello, Yes, or I."
    };
  }

  if (cards.length > 5) {
    return {
      isValid: false,
      generatedSentence,
      feedback: "This sentence is too long. Try using fewer cards.",
      suggestion: "Use up to five PECS cards."
    };
  }

  if (cards.some((card) => !approvedCardIds.has(card.id))) {
    return {
      isValid: false,
      generatedSentence,
      feedback: "Use cards from the approved PECS card library.",
      suggestion: "Remove any card that is not shown in the Playground library."
    };
  }

  if (cards.some((card) => !card.sentenceRole)) {
    return {
      isValid: false,
      generatedSentence,
      feedback: "Some cards need a sentence role before they can be checked.",
      suggestion: "Choose cards that have role information in the PECS manifest."
    };
  }

  const roles = cards.map((card) => card.sentenceRole as SentenceRole);
  const labels = cards.map((card) => normalizeLabel(card.label));

  if (rolesMatch(roles, ["subject", "verb", "object"]) && labels[1] === "want") {
    return {
      isValid: true,
      patternName: "Basic Request",
      generatedSentence,
      feedback: "Good job! This sentence is correct."
    };
  }

  if (rolesMatch(roles, ["subject", "verb"]) && labels[1] === "want") {
    return {
      isValid: false,
      generatedSentence,
      feedback: "Almost correct. Add something you want, like water or food.",
      suggestion: "Try I + want + water."
    };
  }

  for (const pattern of validPatterns) {
    if (rolesMatch(roles, pattern.roles)) {
      return {
        isValid: true,
        patternName: pattern.name,
        generatedSentence,
        feedback: "Good job! This sentence is correct."
      };
    }
  }

  const hasSentenceVerb = roles.includes("verb") || roles.includes("be_verb");
  return {
    isValid: false,
    generatedSentence,
    feedback: "Try again. Check the order of the PECS cards.",
    suggestion: hasSentenceVerb && roles[0] !== "subject" ? "Try starting with who is speaking, like I." : "Try a supported pattern, such as I want water or Please sit."
  };
}
