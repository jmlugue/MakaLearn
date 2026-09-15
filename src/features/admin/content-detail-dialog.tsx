"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, ImageOff, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { insertAuditLog } from "@/lib/audit-logs";
import { deleteLearningItem, updateLearningItemDetails } from "@/lib/supabase/app-data";
import { deleteMediaAssetFromSupabase } from "@/lib/supabase/media";
import { formatDate } from "@/lib/utils";
import type { AppUser, Category, LearningItem, MediaAsset } from "@/types";

export const mediaTypeNames: Record<MediaAsset["type"], string> = {
  "symbol-image": "Symbol image",
  "gesture-media": "Gesture media",
  "audio-file": "Audio",
  "learner-photo": "Learner photo"
};

function nameFor(users: AppUser[], id: string) {
  return users.find((candidate) => candidate.id === id)?.name ?? "MakaLearn user";
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function isAudioUrl(url: string) {
  return /\.(mp3|wav|m4a|ogg|aac)(\?|$)/i.test(url);
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

/** Pop-up for one learning item: view details, edit text fields, delete, or open it in the Content Library. */
export function ItemDetailDialog({
  item,
  users,
  categories,
  onClose,
  onSaved,
  onDeleted
}: {
  item: LearningItem | null;
  users: AppUser[];
  categories: Category[];
  onClose: () => void;
  onSaved: (item: LearningItem) => void;
  onDeleted: (item: LearningItem, deletedMedia: boolean) => void;
}) {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");
  const [tags, setTags] = useState("");
  const [labelError, setLabelError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMedia, setDeleteMedia] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!item) return;
    setEditing(false);
    setLabel(item.label);
    setCategoryId(item.categoryId);
    setDescription(item.description);
    setInstruction(item.instruction);
    setTags(item.tags.join(", "));
    setLabelError("");
    setDeleteMedia(false);
  }, [item]);

  if (!item) return null;
  const current = item;
  const category = categories.find((entry) => entry.id === current.categoryId);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim()) {
      setLabelError("Enter a label.");
      return;
    }
    setSaving(true);
    try {
      const saved = await updateLearningItemDetails({
        ...current,
        label: label.trim(),
        categoryId,
        description: description.trim(),
        instruction: instruction.trim(),
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        updatedAt: new Date().toISOString()
      });
      await insertAuditLog({
        category: "content",
        action: "edit",
        actor: user,
        targetType: "learning-item",
        targetId: saved.id,
        targetTitle: saved.label,
        detail: "Updated learning item text fields."
      }).catch(() => undefined);
      onSaved(saved);
      setEditing(false);
      notify({ title: "Learning item updated", description: saved.label, tone: "success" });
    } catch (error) {
      notify({ title: "Learning item not saved", description: error instanceof Error ? error.message : "Try again.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await deleteLearningItem(current.id, deleteMedia);
      await insertAuditLog({
        category: "content",
        action: "delete",
        actor: user,
        targetType: "learning-item",
        targetId: current.id,
        targetTitle: current.label,
        detail: deleteMedia ? "Deleted a learning item and associated media records." : "Deleted a learning item and kept media records."
      }).catch(() => undefined);
      setConfirmDelete(false);
      onDeleted(current, deleteMedia);
      notify({ title: "Learning item deleted", description: current.label, tone: "success" });
    } catch (error) {
      notify({ title: "Delete failed", description: error instanceof Error ? error.message : "Try again.", tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  const gestureUrl = current.gestureMediaUrl;

  return (
    <>
      <Dialog open={Boolean(item) && !confirmDelete} onClose={saving ? () => undefined : onClose} title={editing ? `Edit ${current.label}` : current.label} className="max-w-2xl">
        {editing ? (
          <form className="space-y-4" onSubmit={save}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="admin-item-label">Label</Label>
                <Input
                  id="admin-item-label"
                  value={label}
                  onChange={(event) => {
                    setLabel(event.target.value);
                    setLabelError("");
                  }}
                  aria-invalid={Boolean(labelError)}
                  aria-describedby={labelError ? "admin-item-label-error" : undefined}
                />
                <FieldError id="admin-item-label-error" message={labelError} />
              </div>
              <div>
                <Label htmlFor="admin-item-category">Category</Label>
                <Select id="admin-item-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  {categories.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="admin-item-description">Description</Label>
              <Textarea id="admin-item-description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20" />
            </div>
            <div>
              <Label htmlFor="admin-item-instruction">Instruction</Label>
              <Textarea id="admin-item-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} className="min-h-20" />
            </div>
            <div>
              <Label htmlFor="admin-item-tags">Tags</Label>
              <Input id="admin-item-tags" value={tags} onChange={(event) => setTags(event.target.value)} aria-describedby="admin-item-tags-hint" />
              <p id="admin-item-tags-hint" className="mt-1 text-xs text-slate-500">
                Separate tags with commas.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-blue-100 bg-[#f8fbff]">
                {current.symbolImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.symbolImageUrl} alt={`${current.label} symbol`} className="h-full w-full object-contain p-4" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-sm font-semibold text-slate-400">
                    <ImageOff className="h-8 w-8" aria-hidden="true" /> No image
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {gestureUrl ? (
                  <div className="overflow-hidden rounded-xl border border-blue-100 bg-[#f8fbff]">
                    {isVideoUrl(gestureUrl) ? (
                      <video src={gestureUrl} controls className="aspect-video w-full bg-slate-900" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={gestureUrl} alt={`${current.label} gesture`} className="aspect-video w-full object-contain p-2" />
                    )}
                  </div>
                ) : null}
                <div className="rounded-xl border border-blue-100 bg-[#f8fbff] p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Audio</p>
                  {current.audioUrl ? (
                    <audio src={current.audioUrl} controls className="w-full" />
                  ) : (
                    <p className="text-sm font-semibold text-slate-400">No audio</p>
                  )}
                </div>
              </div>
            </div>

            <dl className="divide-y divide-slate-100">
              <DetailRow label="Type">
                <Badge className={current.contentType === "pecs" ? "bg-blue-100 text-blue-700" : "bg-sky-100 text-sky-700"}>
                  {current.contentType === "pecs" ? "PECS card" : "Gesture"}
                </Badge>
              </DetailRow>
              <DetailRow label="Category">{category?.name ?? "Uncategorized"}</DetailRow>
              {current.description ? <DetailRow label="Description">{current.description}</DetailRow> : null}
              {current.instruction ? <DetailRow label="Instruction">{current.instruction}</DetailRow> : null}
              <DetailRow label="Tags">{current.tags.length ? current.tags.join(", ") : "None"}</DetailRow>
              <DetailRow label="Created by">{nameFor(users, current.createdBy)}</DetailRow>
              <DetailRow label="Updated">{formatDate(current.updatedAt)}</DetailRow>
            </dl>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
              </Button>
              <div className="flex flex-wrap gap-2">
                <Link href={`/content?item=${current.id}`} className="inline-flex">
                  <Button type="button" variant="secondary" tabIndex={-1}>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open in Content Library
                  </Button>
                </Link>
                <Button type="button" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={deleting ? () => undefined : () => setConfirmDelete(false)}
        title={`Delete ${current.label}?`}
        description="This removes the learning item for everyone. Lessons and activities that use it may be affected."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={remove} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete item"}
            </Button>
          </>
        }
      >
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <input
            type="checkbox"
            checked={deleteMedia}
            onChange={(event) => setDeleteMedia(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-red-600"
          />
          <span>
            <span className="block font-semibold text-ink">Also remove its media records</span>
            <span className="text-slate-500">Images, gesture media, and audio linked to this item.</span>
          </span>
        </label>
      </Dialog>
    </>
  );
}

/** Pop-up for one media file: preview, details, open the original, delete, or jump to its learning item. */
export function MediaDetailDialog({
  asset,
  users,
  items,
  onClose,
  onDeleted,
  onOpenItem
}: {
  asset: MediaAsset | null;
  users: AppUser[];
  items: LearningItem[];
  onClose: () => void;
  onDeleted: (asset: MediaAsset) => void;
  onOpenItem: (item: LearningItem) => void;
}) {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [asset]);

  if (!asset) return null;
  const current = asset;
  const relatedItem = current.relatedItemId ? items.find((entry) => entry.id === current.relatedItemId) : undefined;
  const url = current.publicUrl;

  async function remove() {
    setDeleting(true);
    try {
      await deleteMediaAssetFromSupabase(current);
      await insertAuditLog({
        category: "content",
        action: "delete",
        actor: user,
        targetType: "media",
        targetId: current.id,
        targetTitle: current.title || current.fileName,
        detail: `Deleted ${mediaTypeNames[current.type].toLowerCase()} ${current.fileName}.`
      }).catch(() => undefined);
      setConfirmDelete(false);
      onDeleted(current);
      notify({ title: "Media file deleted", description: current.fileName, tone: "success" });
    } catch (error) {
      notify({ title: "Delete failed", description: error instanceof Error ? error.message : "Try again.", tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={!confirmDelete} onClose={onClose} title={current.title || current.fileName} className="max-w-2xl">
        <div className="space-y-5">
          <div className="grid min-h-48 place-items-center overflow-hidden rounded-xl border border-blue-100 bg-[#f8fbff]">
            {!url ? (
              <p className="py-10 text-sm font-semibold text-slate-400">No preview available</p>
            ) : current.type === "audio-file" || isAudioUrl(url) ? (
              <audio src={url} controls className="m-6 w-[calc(100%-3rem)]" />
            ) : isVideoUrl(url) ? (
              <video src={url} controls className="max-h-80 w-full bg-slate-900" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={current.title} className="max-h-80 w-full object-contain p-4" />
            )}
          </div>

          <dl className="divide-y divide-slate-100">
            <DetailRow label="Type">{mediaTypeNames[current.type]}</DetailRow>
            <DetailRow label="File name">{current.fileName}</DetailRow>
            <DetailRow label="Learning item">
              {relatedItem ? (
                <button type="button" onClick={() => onOpenItem(relatedItem)} className="font-semibold text-blue-700 hover:underline">
                  {relatedItem.label}
                </button>
              ) : (
                "Not linked"
              )}
            </DetailRow>
            <DetailRow label="Uploaded by">{nameFor(users, current.uploadedBy)}</DetailRow>
            <DetailRow label="Uploaded">{formatDate(current.uploadedAt)}</DetailRow>
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
            </Button>
            <div className="flex flex-wrap gap-2">
              {url ? (
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex">
                  <Button type="button" variant="secondary" tabIndex={-1}>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open original
                  </Button>
                </a>
              ) : null}
              {relatedItem ? (
                <Link href={`/content?item=${relatedItem.id}`} className="inline-flex">
                  <Button type="button" tabIndex={-1}>
                    Open in Content Library
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${current.fileName}?`}
        description={
          relatedItem
            ? `The file is removed from storage and from ${relatedItem.label}.`
            : "The file is removed from storage."
        }
        confirmLabel="Delete file"
        tone="danger"
        loading={deleting}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  );
}
