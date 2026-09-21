import type { SentenceRole } from "@/types";

export type PecsSentenceCard = {
  id: string;
  label: string;
  sentenceRole?: SentenceRole;
};

export type PecsConstructionType = "sentence" | "phrase" | "word" | "expression";

export type PecsSentenceValidationResult = {
  isValid: boolean;
  constructionType?: PecsConstructionType;
  patternName?: string;
  generatedSentence: string;
  feedback: string;
  suggestion?: string;
};

const baseVerbSubjectLabels = new Set(["i", "you"]);
const namedPersonLabels = new Set(["mother", "father", "teacher", "friend"]);
const addressedExpressionLabels = new Set([
  "hello",
  "goodbye",
  "good morning",
  "sorry",
  "thank you",
  "please",
  "yes",
  "no"
]);

const expectedBeVerbBySubject: Record<string, "am" | "are" | "is"> = {
  i: "am",
  you: "are",
  mother: "is",
  father: "is",
  teacher: "is",
  friend: "is"
};

const edibleObjectLabels = new Set(["food", "rice", "bread", "banana"]);
const drinkableObjectLabels = new Set(["water", "milk"]);
const consumableObjectLabels = new Set([...edibleObjectLabels, ...drinkableObjectLabels]);
const moreTargetLabels = new Set([...consumableObjectLabels, "rest", "help"]);
const postpositivePleaseLabels = new Set([...consumableObjectLabels, "toilet", "rest", "more"]);
const beComplementLabels = new Set(["hot", "hurt", "finished"]);

function normalizeLabel(label: string) {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCaseLabel(label: string) {
  return label.replace(/^./, (character) => character.toUpperCase());
}

function rolesMatch(left: SentenceRole[], right: SentenceRole[]) {
  return left.length === right.length && left.every((role, index) => role === right[index]);
}

function classifySingleCard(card: PecsSentenceCard): PecsConstructionType {
  const label = normalizeLabel(card.label);
  if (card.sentenceRole === "command") return "sentence";
  if (label.includes(" ")) return "phrase";
  if (["greeting", "response", "safety_word"].includes(card.sentenceRole ?? "")) return "expression";
  return "word";
}

function validFeedback(type: PecsConstructionType) {
  return type === "expression" ? "You made an expression." : `You made a ${type}.`;
}

function validResult(
  constructionType: PecsConstructionType,
  patternName: string,
  cards: PecsSentenceCard[]
): PecsSentenceValidationResult {
  return {
    isValid: true,
    constructionType,
    patternName,
    generatedSentence: cards.map((card) => card.label).join(" "),
    feedback: validFeedback(constructionType)
  };
}

function canActAsPredicate(card: PecsSentenceCard, label: string) {
  return (
    (card.sentenceRole === "verb" && label !== "want") ||
    card.sentenceRole === "command" ||
    (card.sentenceRole === "object" && label === "rest")
  );
}

function hasCompatibleActionTarget(
  predicateCard: PecsSentenceCard,
  predicateLabel: string,
  targetCard: PecsSentenceCard,
  targetLabel: string,
  actorLabel?: string
) {
  if (!canActAsPredicate(predicateCard, predicateLabel)) return false;

  if (predicateLabel === "eat") return edibleObjectLabels.has(targetLabel);
  if (predicateLabel === "drink") return drinkableObjectLabels.has(targetLabel);
  if (predicateLabel === "help") {
    return targetCard.sentenceRole === "subject" && targetLabel !== "i" && targetLabel !== actorLabel;
  }

  return false;
}

function isAllowedBeComplement(card: PecsSentenceCard, label: string) {
  return card.sentenceRole === "emotion" || beComplementLabels.has(label);
}

function isAllowedWantTarget(card: PecsSentenceCard, label: string) {
  return card.sentenceRole === "object" || label === "more" || label === "help";
}

function validateCoreConstruction(cards: PecsSentenceCard[]): PecsSentenceValidationResult | undefined {
  const roles = cards.map((card) => card.sentenceRole as SentenceRole);
  const labels = cards.map((card) => normalizeLabel(card.label));

  if (
    cards.length === 2 &&
    addressedExpressionLabels.has(labels[0]) &&
    namedPersonLabels.has(labels[1])
  ) {
    return validResult("expression", "Addressed Expression", cards);
  }

  if (cards.length === 2) {
    const exactExpression = `${labels[0]}|${labels[1]}`;
    if (["yes|please", "yes|thank you", "no|thank you", "no|more", "more|please"].includes(exactExpression)) {
      return validResult("expression", "Common Expression", cards);
    }
  }

  if (
    cards.length === 3 &&
    roles[0] === "subject" &&
    roles[1] === "be_verb" &&
    isAllowedBeComplement(cards[2], labels[2]) &&
    expectedBeVerbBySubject[labels[0]] === labels[1]
  ) {
    return validResult("sentence", "Describing Sentence", cards);
  }

  if (
    cards.length === 3 &&
    roles[0] === "subject" &&
    labels[1] === "want" &&
    baseVerbSubjectLabels.has(labels[0]) &&
    isAllowedWantTarget(cards[2], labels[2])
  ) {
    return validResult("sentence", "Basic Request", cards);
  }

  if (
    cards.length === 3 &&
    roles[0] === "subject" &&
    baseVerbSubjectLabels.has(labels[0]) &&
    hasCompatibleActionTarget(cards[1], labels[1], cards[2], labels[2], labels[0])
  ) {
    return validResult("sentence", "Action Sentence", cards);
  }

  if (
    cards.length === 2 &&
    roles[0] === "subject" &&
    baseVerbSubjectLabels.has(labels[0]) &&
    canActAsPredicate(cards[1], labels[1])
  ) {
    return validResult("sentence", "Intransitive Action", cards);
  }

  if (labels[0] === "please") {
    if (cards.length === 2 && canActAsPredicate(cards[1], labels[1])) {
      return validResult("sentence", "Polite Command", cards);
    }

    if (cards.length === 3 && hasCompatibleActionTarget(cards[1], labels[1], cards[2], labels[2])) {
      return validResult("sentence", "Polite Command", cards);
    }
  }

  if (cards.length === 2 && hasCompatibleActionTarget(cards[0], labels[0], cards[1], labels[1])) {
    return validResult("sentence", "Simple Command", cards);
  }

  if (
    cards.length === 2 &&
    labels[1] === "please" &&
    (canActAsPredicate(cards[0], labels[0]) || postpositivePleaseLabels.has(labels[0]))
  ) {
    const type = canActAsPredicate(cards[0], labels[0]) ? "sentence" : "phrase";
    return validResult(type, "Polite Request", cards);
  }

  if (
    cards.length === 3 &&
    labels[2] === "please" &&
    hasCompatibleActionTarget(cards[0], labels[0], cards[1], labels[1])
  ) {
    return validResult("sentence", "Polite Command", cards);
  }

  if (cards.length === 2 && labels[0] === "more" && moreTargetLabels.has(labels[1])) {
    return validResult("phrase", "Quantity Phrase", cards);
  }

  if (cards.length === 2 && labels[0] === "hot" && consumableObjectLabels.has(labels[1])) {
    return validResult("phrase", "Describing Phrase", cards);
  }

  return undefined;
}

function validateCombinedConstruction(cards: PecsSentenceCard[]) {
  const coreResult = validateCoreConstruction(cards);
  if (coreResult) return coreResult;

  const labels = cards.map((card) => normalizeLabel(card.label));
  const beginsWithGreeting = cards[0]?.sentenceRole === "greeting";
  const greetedPersonLength = beginsWithGreeting && namedPersonLabels.has(labels[1]) ? 2 : 1;

  if (beginsWithGreeting && cards.length - greetedPersonLength >= 2) {
    const followingResult = validateCoreConstruction(cards.slice(greetedPersonLength));
    if (followingResult?.constructionType === "sentence") {
      return validResult("sentence", "Greeting with Sentence", cards);
    }
  }

  if (namedPersonLabels.has(labels[0]) && cards.length >= 3) {
    const followingResult = validateCoreConstruction(cards.slice(1));
    if (followingResult?.constructionType === "sentence") {
      return validResult("sentence", "Addressed Sentence", cards);
    }
  }

  return undefined;
}

function invalidFeedback(cards: PecsSentenceCard[]) {
  const roles = cards.map((card) => card.sentenceRole as SentenceRole);
  const labels = cards.map((card) => normalizeLabel(card.label));

  if (
    cards.length === 3 &&
    roles[0] === "subject" &&
    roles[1] === "be_verb" &&
    isAllowedBeComplement(cards[2], labels[2])
  ) {
    const expectedBeVerb = expectedBeVerbBySubject[labels[0]];
    if (expectedBeVerb) return `Use ${titleCaseLabel(expectedBeVerb)} after ${cards[0].label}.`;
  }

  if (labels[1] === "want" && (rolesMatch(roles, ["subject", "verb"]) || cards.length === 3)) {
    if (!baseVerbSubjectLabels.has(labels[0])) return "Try I or You before Want.";
    if (cards.length === 2) return "Add one more card.";
    return "Try a thing, More, or Help after Want.";
  }

  if (
    roles[0] === "subject" &&
    cards[1] &&
    canActAsPredicate(cards[1], labels[1]) &&
    !baseVerbSubjectLabels.has(labels[0])
  ) {
    return `Try I or You before ${cards[1].label}.`;
  }

  const predicateIndex = labels[0] === "please" ? 1 : roles[0] === "subject" ? 1 : 0;
  const targetIndex = predicateIndex + 1;
  if (cards[targetIndex] && labels[predicateIndex] === "eat" && !edibleObjectLabels.has(labels[targetIndex])) {
    return "Try a food card after Eat.";
  }
  if (cards[targetIndex] && labels[predicateIndex] === "drink" && !drinkableObjectLabels.has(labels[targetIndex])) {
    return "Try Water or Milk after Drink.";
  }
  if (cards[targetIndex] && labels[predicateIndex] === "help" && cards[targetIndex].sentenceRole !== "subject") {
    return "Try a person card after Help.";
  }

  if (rolesMatch(roles, ["polite_word", "command"]) && labels[0] !== "please") {
    return "Use Please before a command.";
  }

  return "Try again.";
}

// Rule-based PECS/AAC arrangement validation. Each multi-card pattern checks
// both order and meaning so a matching role alone cannot make nonsense valid.
export function validatePecsSentence(
  cards: PecsSentenceCard[],
  approvedCardIds: Set<string>
): PecsSentenceValidationResult {
  const generatedSentence = cards.map((card) => card.label).join(" ");

  if (!cards.length) {
    return { isValid: false, generatedSentence, feedback: "Add a card first." };
  }

  if (cards.length > 5) {
    return { isValid: false, generatedSentence, feedback: "Use fewer cards." };
  }

  if (cards.some((card) => !approvedCardIds.has(card.id))) {
    return { isValid: false, generatedSentence, feedback: "Use a card from the library." };
  }

  if (cards.length === 1) {
    const constructionType = classifySingleCard(cards[0]);
    return validResult(constructionType, "Single Card", cards);
  }

  if (cards.some((card) => !card.sentenceRole)) {
    return { isValid: false, generatedSentence, feedback: "Try another card." };
  }

  const validConstruction = validateCombinedConstruction(cards);
  if (validConstruction) return validConstruction;

  return {
    isValid: false,
    generatedSentence,
    feedback: invalidFeedback(cards)
  };
}
