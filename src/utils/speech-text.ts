/**
 * Normalizes learning text before it reaches a browser or generated voice.
 * Some speech engines treat title-cased Am as the abbreviation A M.
 */
export function normalizeLearningSpeechText(text: string) {
  return text.replace(/\bam\b/gi, 'am');
}
