import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sizeError } from "@/utils/media-limits";
import type { MediaAsset } from "@/types";
import type { Database } from "@/types/database";

type MediaAssetRow = Database["public"]["Tables"]["media_assets"]["Row"];

type UploadMediaAssetInput = {
  file: File;
  bucket: MediaAsset["bucket"];
  type: MediaAsset["type"];
  title: string;
  uploadedBy: string;
  relatedItemId?: string;
};

function cleanFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createStoragePath(file: File, relatedItemId?: string) {
  const folder = relatedItemId ?? "unlinked";
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${folder}/${uniqueId}-${cleanFileName(file.name)}`;
}

export function mapMediaAssetRow(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    fileName: row.file_name,
    bucket: row.bucket,
    storagePath: row.storage_path,
    publicUrl: row.public_url ?? undefined,
    uploadedBy: row.uploaded_by,
    uploadedAt: row.uploaded_at,
    relatedItemId: row.related_item_id ?? undefined
  };
}

export async function uploadMediaAssetToSupabase({
  file,
  bucket,
  type,
  title,
  uploadedBy,
  relatedItemId
}: UploadMediaAssetInput) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local.");
  }

  // Checked here as well as in the form, so every caller gets the real reason instead of a storage error.
  const tooBig = sizeError(file, bucket);
  if (tooBig) {
    throw new Error(tooBig);
  }

  const storagePath = createStoragePath(file, relatedItemId);
  const upload = await supabase.storage.from(bucket).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (upload.error) {
    throw upload.error;
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  // Future Supabase Auth: replace the local uploadedBy value with auth.user().id.
  const insert = await supabase
    .from("media_assets")
    .insert({
      title,
      type,
      file_name: file.name,
      bucket,
      storage_path: storagePath,
      public_url: publicUrl,
      uploaded_by: uploadedBy,
      related_item_id: relatedItemId ?? null
    })
    .select()
    .single();

  if (insert.error) {
    // The database row is the source of truth. Remove the uploaded object if recording it failed.
    await supabase.storage.from(bucket).remove([storagePath]);
    throw insert.error;
  }

  return mapMediaAssetRow(insert.data);
}

/**
 * Deletes one media file: the storage object, its media_assets row, and the matching URL on the
 * related learning item (only when that item still points at this file).
 */
export async function deleteMediaAssetFromSupabase(asset: MediaAsset) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  // Delete the database record first. If Storage cleanup later fails, an unreferenced object is safer
  // than a visible database row whose file has already disappeared.
  const { data, error } = await supabase.from("media_assets").delete().eq("id", asset.id).select("id");
  if (error) {
    throw error;
  }
  if (!data?.some((row) => row.id === asset.id)) {
    throw new Error("Only teachers can delete shared media.");
  }

  if (asset.storagePath) {
    const removal = await supabase.storage.from(asset.bucket).remove([asset.storagePath]);
    if (removal.error) {
      // The row is already gone, so keep the app consistent and leave the unreferenced object for cleanup.
      console.error("Media row was deleted, but the storage object could not be removed.", removal.error);
    }
  }

  if (asset.relatedItemId && asset.publicUrl) {
    const updatedAt = new Date().toISOString();
    const items = supabase.from("learning_items");
    if (asset.type === "symbol-image") {
      await items.update({ symbol_image_url: null, updated_at: updatedAt }).eq("id", asset.relatedItemId).eq("symbol_image_url", asset.publicUrl);
    } else if (asset.type === "gesture-media") {
      await items.update({ gesture_media_url: null, updated_at: updatedAt }).eq("id", asset.relatedItemId).eq("gesture_media_url", asset.publicUrl);
    } else {
      await items.update({ audio_url: null, updated_at: updatedAt }).eq("id", asset.relatedItemId).eq("audio_url", asset.publicUrl);
    }
  }
}
