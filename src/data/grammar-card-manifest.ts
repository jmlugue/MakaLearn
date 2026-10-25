import grammarRows from "../../public/pecs/grammar_card_manifest.json";

/** Original educational placeholders, not official Makaton symbols. Grammar
 * cards are separate from the reviewed 50-card MSAV manifest and its roles. */
export const grammarCardManifest = grammarRows as {
  label: string; filename: string;
  kind: "article" | "infinitive" | "conjunction" | "negation";
  example: string;
}[];

export function isGrammarCardLabel(label: string) {
  const normalized = label.trim().toLowerCase();
  return grammarCardManifest.some((card) => card.label.toLowerCase() === normalized);
}

/** These need sentence context: their pictures cannot uniquely identify the
 * word in the current picture-choice games. Never use their printed letters. */
export function needsGrammarActivityContext(label: string) {
  return isGrammarCardLabel(label) || ["am", "is", "are"].includes(label.trim().toLowerCase());
}
