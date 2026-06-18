import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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
    throw insert.error;
  }

  return mapMediaAssetRow(insert.data);
}
