// Never attribute a file to a different account when its profile is unavailable.
export const MEDIA_UPLOADER_FALLBACK = "Unknown uploader";

export function mediaUploaderName(name: string | null | undefined) {
  return name?.trim() || MEDIA_UPLOADER_FALLBACK;
}
