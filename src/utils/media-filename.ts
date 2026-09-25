/**
 * Upload file name rule: `<word>_<category>.<ext>`, for example `eat_food.png` or `thank-you_greetings.mp3`.
 * Words with spaces use hyphens. The check is case-insensitive. The extension lists mirror
 * `allowed_mime_types` in `supabase/storage.sql`. No imports, so `scripts/test-media-filename.mjs` can load it.
 */

export type UploadBucket = "symbol-images" | "gesture-media" | "audio-files";

export const allowedExtensions: Record<UploadBucket, string[]> = {
  "symbol-images": ["png", "jpg", "jpeg", "webp", "gif"],
  "gesture-media": ["png", "jpg", "jpeg", "webp", "gif"],
  "audio-files": ["mp3", "wav", "m4a", "aac", "ogg"]
};

/** Value for the file input's `accept`, so the picker only offers files Storage will take. */
export const acceptFor: Record<UploadBucket, string> = {
  "symbol-images": "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif",
  "gesture-media": "image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif",
  "audio-files": "audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg,.mp3,.wav,.m4a,.aac,.ogg"
};

const extensionText: Record<UploadBucket, string> = {
  "symbol-images": "Use a PNG, JPG, WebP, or GIF file.",
  "gesture-media": "Use a PNG, JPG, WebP, or GIF file.",
  "audio-files": "Use an MP3, WAV, M4A, AAC, or OGG file."
};

/** One part of a file name: "Thank you" becomes "thank-you", "Don't" becomes "dont". */
export function namePart(text: string) {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fileExtension(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

export function expectedFileName(label: string, categoryName: string, extension: string) {
  return `${namePart(label) || "word"}_${namePart(categoryName) || "category"}.${extension || "png"}`;
}

/** Splits `eat_food.png` into its parts, or returns null when the name does not follow the rule. */
export function parseFileName(fileName: string) {
  const extension = fileExtension(fileName);
  if (!extension) return null;
  const base = fileName.slice(0, fileName.length - extension.length - 1);
  const parts = base.split("_");
  if (parts.length !== 2) return null;
  const word = namePart(parts[0]);
  const category = namePart(parts[1]);
  if (!word || !category) return null;
  // Only letters, digits, hyphens, and spaces are allowed around the underscore.
  if (!/^[a-z0-9 '’-]+$/i.test(parts[0]) || !/^[a-z0-9 '’-]+$/i.test(parts[1])) return null;
  return { word, category, extension };
}

/** Turns the word part back into a label: "thank-you" becomes "Thank you". */
export function labelFromWord(word: string) {
  const text = word.replace(/-/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

/** "" when the file type is allowed for the bucket, otherwise the message to show. */
export function extensionError(fileName: string, bucket: UploadBucket) {
  return allowedExtensions[bucket].includes(fileExtension(fileName)) ? "" : extensionText[bucket];
}

/**
 * "" when the file may be uploaded for this material, otherwise the message to show.
 * The name must be `<label>_<category>.<ext>` for the material's own label and category.
 */
export function fileNameError(fileName: string, bucket: UploadBucket, label: string, categoryName: string) {
  const wrongType = extensionError(fileName, bucket);
  if (wrongType) return wrongType;
  const expected = expectedFileName(label, categoryName, fileExtension(fileName));
  const parsed = parseFileName(fileName);
  if (!parsed || parsed.word !== namePart(label) || parsed.category !== namePart(categoryName)) {
    return `Rename it to ${expected} (word_category).`;
  }
  return "";
}
