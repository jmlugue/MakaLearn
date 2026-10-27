import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { sizeError } from "@/utils/media-limits";
import { fileNameError } from "@/utils/media-filename";
import type { MediaAsset } from "@/types";
import type { Database } from "@/types/database";
import { mediaPageQuery, type MediaFilters } from "@/lib/supabase/media-library-query";

export async function fetchMediaPage(filters: MediaFilters, page: number): Promise<{ assets: MediaAsset[]; count: number }> {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Media is unavailable.");
  const { data, error, count } = await mediaPageQuery(client, filters, page);
  // A concurrent deletion may remove the last page. Recount through a valid range so the UI can clamp.
  if (error?.code === "PGRST103" && page > 1) {
    const first = await fetchMediaPage(filters, 1);
    return { assets: [] as MediaAsset[], count: first.count };
  }
  if (error) throw error;
  if (!data || count === null) throw new Error("Media is unavailable.");
  return { assets: data.map(mapMediaAssetRow), count };
}

/** Count-only requests keep badges accurate without downloading file records. */
export async function fetchMediaCounts() {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Media is unavailable.");
  const results = await Promise.all([
    client.from("media_assets").select("id", { count: "exact", head: true }),
    client.from("media_assets").select("id", { count: "exact", head: true }).in("type", ["symbol-image", "activity-image"]),
    client.from("media_assets").select("id", { count: "exact", head: true }).eq("type", "audio-file")
  ]);
  for (const result of results) if (result.error || result.count === null) throw new Error("Media counts are unavailable.");
  return { all: results[0].count!, images: results[1].count!, audio: results[2].count! };
}

/** Material details can remove a stored file without downloading the Media library. */
export async function fetchLinkedMedia(itemId: string, type: MediaAsset["type"], url: string) {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error("Media is unavailable.");
  const { data, error } = await client.from("media_assets").select("*").eq("related_item_id", itemId).eq("type", type).eq("public_url", url).order("id").limit(1).maybeSingle();
  if (error) throw error;
  return data ? mapMediaAssetRow(data) : undefined;
}

type MediaAssetRow = Database["public"]["Tables"]["media_assets"]["Row"];

type UploadMediaAssetInput = {
  file: File;
  bucket: MediaAsset["bucket"];
  type: MediaAsset["type"];
  title: string;
  uploadedBy: string;
  relatedItemId?: string;
  /** The material the file belongs to. Its name must then be `<label>_<category>.<ext>`. */
  expectedName?: { label: string; category: string };
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
    relatedItemId: row.related_item_id ?? undefined,
    cleanupPending: row.deletion_pending ?? false
  };
}

// Upload the file to Storage, then save its searchable media record in the database.
export async function uploadMediaAssetToSupabase({
  file,
  bucket,
  type,
  title,
  uploadedBy,
  relatedItemId,
  expectedName
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
  if (expectedName && bucket !== "gesture-media") {
    const wrongName = fileNameError(file, bucket, expectedName.label, expectedName.category);
    if (wrongName) throw new Error(wrongName);
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

  // The calling feature supplies the signed-in user's ID for the media ownership record.
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

  // Keep a retryable record until every step finishes. Check authorization before touching Storage.
  const { data, error } = await supabase.from("media_assets").update({ deletion_pending: true }).eq("id", asset.id).select("id");
  if (error) {
    throw error;
  }
  if (!data?.some((row) => row.id === asset.id)) {
    throw new Error("Only teachers can delete shared media.");
  }

  if (asset.storagePath) {
    const removal = await supabase.storage.from(asset.bucket).remove([asset.storagePath]);
    if (removal.error) {
      throw new Error("The file could not be removed from storage. It stays in Media so you can retry Delete.");
    }
  }

  if (asset.relatedItemId && asset.publicUrl) {
    const updatedAt = new Date().toISOString();
    const column = asset.type === "symbol-image" ? "symbol_image_url" : asset.type === "activity-image" ? "activity_image_url" : asset.type === "gesture-media" ? "gesture_media_url" : "audio_url";
    const patch: Database["public"]["Tables"]["learning_items"]["Update"] = { updated_at: updatedAt };
    patch[column] = null;
    const detached = await supabase.from("learning_items").update(patch)
      .eq("id", asset.relatedItemId).eq(column, asset.publicUrl).select("id");
    if (detached.error) throw new Error("The file was removed, but its material link needs cleanup. Retry Delete in Media.");
    if (!detached.data?.length) {
      // Zero rows is safe only if the material disappeared or now uses a different file.
      const current = await supabase.from("learning_items").select("symbol_image_url,activity_image_url,gesture_media_url,audio_url").eq("id", asset.relatedItemId).maybeSingle();
      if (current.error || current.data?.[column] === asset.publicUrl) throw new Error("The material link could not be cleared. Retry Delete in Media.");
    }
  }
  const removed = await supabase.from("media_assets").delete().eq("id", asset.id).select("id");
  if (removed.error || !removed.data?.length) throw new Error("The file was removed, but its Media entry needs cleanup. Retry Delete.");
}
