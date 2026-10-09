import type { MsavMaterialProfile, MsavSemanticTrait, SentenceRole } from "@/types";

export type PecsSentenceCard = {
  id: string;
  label: string;
  sentenceRole?: SentenceRole;
  msavProfile?: MsavMaterialProfile;
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

function rolesOf(card: PecsSentenceCard) {
  return card.msavProfile?.roles.length ? card.msavProfile.roles : card.sentenceRole ? [card.sentenceRole] : [];
}

function hasRole(card: PecsSentenceCard, role: SentenceRole) {
  return rolesOf(card).includes(role);
}

function hasTrait(card: PecsSentenceCard, trait: MsavSemanticTrait) {
  return card.msavProfile?.traits.includes(trait) ?? false;
}

function rolesMatch(cards: PecsSentenceCard[], expected: SentenceRole[]) {
  return cards.length === expected.length && cards.every((card, index) => hasRole(card, expected[index]));
}

function isBaseVerbSubject(card: PecsSentenceCard, label: string) {
  return hasTrait(card, "base_subject") || baseVerbSubjectLabels.has(label);
}

function isNamedPerson(card: PecsSentenceCard, label: string) {
  return hasTrait(card, "named_person") || namedPersonLabels.has(label);
}

function expectedBeVerb(card: PecsSentenceCard, label: string) {
  return card.msavProfile?.beVerbForm ?? expectedBeVerbBySubject[label];
}

function isEdible(card: PecsSentenceCard, label: string) {
  return hasTrait(card, "edible") || edibleObjectLabels.has(label);
}

function isDrinkable(card: PecsSentenceCard, label: string) {
  return hasTrait(card, "drinkable") || drinkableObjectLabels.has(label);
}

function isConsumable(card: PecsSentenceCard, label: string) {
  return isEdible(card, label) || isDrinkable(card, label);
}

function classifySingleCard(card: PecsSentenceCard): PecsConstructionType {
  const label = normalizeLabel(card.label);
  if (hasRole(card, "command")) return "sentence";
  // Good morning and Thank you are expressions, even though they are two words.
  if (["greeting", "polite_word", "response", "safety_word"].some((role) => hasRole(card, role as SentenceRole))) return "expression";
  if (label.includes(" ")) return "phrase";
  return "word";
}

/** The playground asks for a phrase or a sentence, so the praise uses only those two words. */
function validFeedback(type: PecsConstructionType) {
  return type === "sentence" ? "You made a sentence." : "You made a phrase.";
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
    (hasRole(card, "verb") && label !== "want") ||
    hasRole(card, "command") ||
    (hasRole(card, "object") && label === "rest")
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

  const predicateKind = predicateCard.msavProfile?.predicateKind ?? predicateLabel;
  if (predicateKind === "eat") return isEdible(targetCard, targetLabel);
  if (predicateKind === "drink") return isDrinkable(targetCard, targetLabel);
  if (predicateKind === "help") {
    return hasRole(targetCard, "subject") && targetLabel !== "i" && targetLabel !== actorLabel;
  }

  return false;
}

function isAllowedBeComplement(card: PecsSentenceCard, label: string) {
  return hasRole(card, "emotion") || hasTrait(card, "be_complement") || beComplementLabels.has(label);
}

function isAllowedWantTarget(card: PecsSentenceCard, label: string) {
  return hasRole(card, "object") || hasTrait(card, "requestable") || label === "more" || label === "help";
}

function validateCoreConstruction(cards: PecsSentenceCard[]): PecsSentenceValidationResult | undefined {
  const labels = cards.map((card) => normalizeLabel(card.label));

  if (
    cards.length === 2 &&
    (hasTrait(cards[0], "addressed_expression") || addressedExpressionLabels.has(labels[0])) &&
    isNamedPerson(cards[1], labels[1])
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
    hasRole(cards[0], "subject") &&
    hasRole(cards[1], "be_verb") &&
    isAllowedBeComplement(cards[2], labels[2]) &&
    expectedBeVerb(cards[0], labels[0]) === labels[1]
  ) {
    return validResult("sentence", "Describing Sentence", cards);
  }

  if (
    cards.length === 3 &&
    hasRole(cards[0], "subject") &&
    labels[1] === "want" &&
    isBaseVerbSubject(cards[0], labels[0]) &&
    isAllowedWantTarget(cards[2], labels[2])
  ) {
    return validResult("sentence", "Basic Request", cards);
  }

  if (
    cards.length === 3 &&
    hasRole(cards[0], "subject") &&
    isBaseVerbSubject(cards[0], labels[0]) &&
    hasCompatibleActionTarget(cards[1], labels[1], cards[2], labels[2], labels[0])
  ) {
    return validResult("sentence", "Action Sentence", cards);
  }

  if (
    cards.length === 2 &&
    hasRole(cards[0], "subject") &&
    isBaseVerbSubject(cards[0], labels[0]) &&
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
    (canActAsPredicate(cards[0], labels[0]) || hasTrait(cards[0], "postpositive_please") || postpositivePleaseLabels.has(labels[0]))
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

  if (cards.length === 2 && labels[0] === "more" && (hasTrait(cards[1], "more_target") || moreTargetLabels.has(labels[1]))) {
    return validResult("phrase", "Quantity Phrase", cards);
  }

  if (
    cards.length === 2 &&
    (labels[0] === "hot" || hasTrait(cards[0], "consumable_description")) &&
    isConsumable(cards[1], labels[1])
  ) {
    return validResult("phrase", "Describing Phrase", cards);
  }

  return undefined;
}

function validateCombinedConstruction(cards: PecsSentenceCard[]) {
  const coreResult = validateCoreConstruction(cards);
  if (coreResult) return coreResult;

  const labels = cards.map((card) => normalizeLabel(card.label));
  const beginsWithGreeting = Boolean(cards[0] && hasRole(cards[0], "greeting"));
  const greetedPersonLength = beginsWithGreeting && cards[1] && isNamedPerson(cards[1], labels[1]) ? 2 : 1;

  if (beginsWithGreeting && cards.length - greetedPersonLength >= 2) {
    const followingResult = validateCoreConstruction(cards.slice(greetedPersonLength));
    if (followingResult?.constructionType === "sentence") {
      return validResult("sentence", "Greeting with Sentence", cards);
    }
  }

  if (cards[0] && isNamedPerson(cards[0], labels[0]) && cards.length >= 3) {
    const followingResult = validateCoreConstruction(cards.slice(1));
    if (followingResult?.constructionType === "sentence") {
      return validResult("sentence", "Addressed Sentence", cards);
    }
  }

  return undefined;
}

function invalidFeedback(cards: PecsSentenceCard[]) {
  const labels = cards.map((card) => normalizeLabel(card.label));

  if (
    cards.length === 3 &&
    hasRole(cards[0], "subject") &&
    hasRole(cards[1], "be_verb") &&
    isAllowedBeComplement(cards[2], labels[2])
  ) {
    const requiredBeVerb = expectedBeVerb(cards[0], labels[0]);
    if (requiredBeVerb) return `Use ${titleCaseLabel(requiredBeVerb)} after ${cards[0].label}.`;
  }

  if (labels[1] === "want" && (rolesMatch(cards, ["subject", "verb"]) || cards.length === 3)) {
    if (!isBaseVerbSubject(cards[0], labels[0])) return "Try I or You before Want.";
    if (cards.length === 2) return "Add one more card.";
    return "Try a thing, More, or Help after Want.";
  }

  if (
    hasRole(cards[0], "subject") &&
    cards[1] &&
    canActAsPredicate(cards[1], labels[1]) &&
    !isBaseVerbSubject(cards[0], labels[0])
  ) {
    return `Try I or You before ${cards[1].label}.`;
  }

  const predicateIndex = labels[0] === "please" ? 1 : hasRole(cards[0], "subject") ? 1 : 0;
  const targetIndex = predicateIndex + 1;
  const predicateKind = cards[predicateIndex]?.msavProfile?.predicateKind ?? labels[predicateIndex];
  if (cards[targetIndex] && predicateKind === "eat" && !isEdible(cards[targetIndex], labels[targetIndex])) {
    return "Try a food card after Eat.";
  }
  if (cards[targetIndex] && predicateKind === "drink" && !isDrinkable(cards[targetIndex], labels[targetIndex])) {
    return "Try a drink card after Drink.";
  }
  if (cards[targetIndex] && predicateKind === "help" && !hasRole(cards[targetIndex], "subject")) {
    return "Try a person card after Help.";
  }

  if (rolesMatch(cards, ["polite_word", "command"]) && labels[0] !== "please") {
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
    // Am, Is, and Are mean nothing on their own.
    if (hasRole(cards[0], "be_verb")) {
      return { isValid: false, generatedSentence, feedback: "Add who it is about, and a word like Happy." };
    }
    const constructionType = classifySingleCard(cards[0]);
    return validResult(constructionType, "Single Card", cards);
  }

  if (cards.some((card) => !rolesOf(card).length)) {
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
