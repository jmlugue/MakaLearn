import type { MediaAsset } from "@/types";

/**
 * Upload size caps per bucket. These mirror `file_size_limit` in `supabase/storage.sql`, so a file that
 * passes here is not rejected by Storage afterwards. Change both together.
 */
export const mediaSizeLimits: Record<MediaAsset["bucket"], number> = {
  "symbol-images": 10 * 1024 * 1024,
  "gesture-media": 50 * 1024 * 1024,
  "audio-files": 20 * 1024 * 1024,
  "learner-photos": 10 * 1024 * 1024
};

/** Short size for messages and hints: "820KB", "6.4MB", "50MB". */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)}KB`;
  const mb = kb / 1024;
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)}MB`;
}

export function limitLabel(bucket: MediaAsset["bucket"]) {
  return formatBytes(mediaSizeLimits[bucket]);
}

/** The message to show when a file is too big, or "" when it fits. */
export function sizeError(file: File, bucket: MediaAsset["bucket"]) {
  const limit = mediaSizeLimits[bucket];
  if (file.size <= limit) return "";
  return `This file is ${formatBytes(file.size)}. The limit is ${formatBytes(limit)}.`;
}
