/**
 * Normalizes learning text before it reaches a browser or generated voice.
 * Some speech engines treat title-cased Am as the abbreviation A M.
 */
export function normalizeLearningSpeechText(text: string) {
  // Isolated uppercase I is announced as "capital I" by some browser voices.
  // A speech-only homophone keeps /aɪ/ without changing the visible pronoun or
  // sentence text (and therefore without disturbing word-highlight offsets).
  if (text.trim() === "I") return "eye";
  return text.replace(/\bam\b/gi, 'am');
}
