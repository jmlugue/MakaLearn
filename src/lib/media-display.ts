// Owner-requested fallback for legacy uploads without an available profile name.
export const MEDIA_UPLOADER_FALLBACK = "Jordan Lee";

export function mediaUploaderName(name: string | null | undefined) {
  return name?.trim() || MEDIA_UPLOADER_FALLBACK;
}
