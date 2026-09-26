/**
 * Upload file name rule: the name must be `<word>_<category>`, for example `eat_food` or `thank-you_greetings`.
 * Only the name is checked, not the extension (Windows hides extensions, so `eat_food.png` often turns into
 * `eat_food.png.png`). Words with spaces use hyphens, and the check is case-insensitive. The file type is
 * checked from the file itself (its MIME type), which mirrors `allowed_mime_types` in `supabase/storage.sql`.
 * No imports, so `scripts/test-media-filename.mjs` can load it.
 */

export type UploadBucket = "symbol-images" | "gesture-media" | "audio-files";

export const allowedExtensions: Record<UploadBucket, string[]> = {
  "symbol-images": ["png", "jpg", "jpeg", "webp", "gif"],
  "gesture-media": ["png", "jpg", "jpeg", "webp", "gif"],
  "audio-files": ["mp3", "wav", "m4a", "aac", "ogg"]
};

/** MIME types Storage takes per bucket, the same list as `supabase/storage.sql`. */
export const allowedMimeTypes: Record<UploadBucket, string[]> = {
  "symbol-images": ["image/png", "image/jpeg", "image/webp", "image/gif"],
  "gesture-media": ["image/png", "image/jpeg", "image/webp", "image/gif"],
  "audio-files": ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg"]
};

/** A picked file, or just its name (tests and old callers). */
export type NamedFile = string | { name: string; type?: string };

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

/** The name a file should have, for example `thank-you_greetings`. An extension is added only when given. */
export function expectedFileName(label: string, categoryName: string, extension = "") {
  const base = `${namePart(label) || "word"}_${namePart(categoryName) || "category"}`;
  return extension ? `${base}.${extension}` : base;
}

/** The name before the first dot: `bad_emotions.png.png` gives `bad_emotions`. */
export function baseName(fileName: string) {
  const trimmed = fileName.trim();
  const dot = trimmed.indexOf(".");
  return dot > 0 ? trimmed.slice(0, dot) : trimmed;
}

/** Splits `eat_food` (any extension or none) into its parts, or returns null when it does not follow the rule. */
export function parseFileName(fileName: string) {
  const extension = fileExtension(fileName);
  const parts = baseName(fileName).split("_");
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

/**
 * "" when the file type is allowed for the bucket, otherwise the message to show. The file's own type is
 * used when the browser knows it; the extension is only a fallback.
 */
export function extensionError(file: NamedFile, bucket: UploadBucket) {
  const name = typeof file === "string" ? file : file.name;
  const type = typeof file === "string" ? "" : (file.type ?? "").toLowerCase();
  if (type) return allowedMimeTypes[bucket].includes(type) ? "" : extensionText[bucket];
  return allowedExtensions[bucket].includes(fileExtension(name)) ? "" : extensionText[bucket];
}

/**
 * "" when the file may be uploaded for this material, otherwise the message to show.
 * The name must be `<label>_<category>` for the material's own label and category; the extension is ignored.
 */
export function fileNameError(file: NamedFile, bucket: UploadBucket, label: string, categoryName: string) {
  const wrongType = extensionError(file, bucket);
  if (wrongType) return wrongType;
  const fileName = typeof file === "string" ? file : file.name;
  const expected = expectedFileName(label, categoryName);
  const parsed = parseFileName(fileName);
  if (!parsed || parsed.word !== namePart(label) || parsed.category !== namePart(categoryName)) {
    return `Rename it to ${expected} (word_category).`;
  }
  return "";
}
