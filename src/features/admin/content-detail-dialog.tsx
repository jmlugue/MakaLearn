"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ExternalLink, FileText, FileVideo, FolderOpen, Hand, Image as ImageIcon, ImageOff, Layers, Pencil, Tag, Trash2, UserRound, Volume2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { insertAuditLog } from "@/lib/audit-logs";
import { deleteLearningItem, updateLearningItemDetails } from "@/lib/supabase/app-data";
import { deleteMediaAssetFromSupabase } from "@/lib/supabase/media";
import { cn, formatDate } from "@/lib/utils";
import { DetailList, DetailNote, DetailRow } from "@/features/admin/admin-shared";
import type { AppUser, Category, LearningItem, MediaAsset } from "@/types";
import { materialColor } from "@/lib/entity-colors";

export const mediaTypeNames: Record<MediaAsset["type"], string> = {
  "symbol-image": "Symbol image",
  "gesture-media": "Old video",
  "audio-file": "Audio"
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

/** Pop-up header in the Activity log style: colored icon tile, big title, one line under it. */
function PopupHeader({ icon: Icon, tile, title, subtitle }: { icon: LucideIcon; tile: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 pr-10">
      <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", tile)}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-extrabold tracking-[-0.02em] text-ink">{title}</p>
        <p className="truncate text-sm text-slate-500">{subtitle}</p>
      </div>
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
  const canManage = user.role === "teacher";

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

  return (
    <>
      <Dialog open={Boolean(item) && !confirmDelete} onClose={saving ? () => undefined : onClose} title={editing ? `Edit ${current.label}` : current.label} className="max-w-2xl" hideHeader={!editing}>
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
          <div className="space-y-4">
            <PopupHeader
              icon={current.contentType === "pecs" ? ImageIcon : Hand}
              tile={materialColor(current.contentType).icon}
              title={current.label}
              subtitle={`${current.contentType === "pecs" ? "PECS card" : "Gesture"} · ${category?.name ?? "Uncategorized"}`}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-blue-100 bg-[#fff]">
                {current.symbolImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.symbolImageUrl} alt={`${current.label} symbol`} className="h-full w-full object-contain p-4" />
                ) : (
                  <span className="flex flex-col items-center gap-2 text-sm font-semibold text-slate-500">
                    <ImageOff className="h-8 w-8" aria-hidden="true" /> No image
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <DetailList>
                  <DetailRow icon={Tag} label="Type">
                    {current.contentType === "pecs" ? "PECS card" : "Gesture"}
                  </DetailRow>
                  <DetailRow icon={FolderOpen} label="Category">
                    {category?.name ?? "Uncategorized"}
                  </DetailRow>
                  <DetailRow icon={UserRound} label="Made by">
                    {nameFor(users, current.createdBy)}
                  </DetailRow>
                  <DetailRow icon={Clock} label="Updated">
                    {formatDate(current.updatedAt)}
                  </DetailRow>
                </DetailList>
                <div className="rounded-2xl border border-blue-100 bg-[#fff] p-3">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                    <Volume2 className="h-4 w-4 text-blue-500" aria-hidden="true" /> Audio
                  </p>
                  {current.audioUrl ? <audio src={current.audioUrl} controls className="w-full" /> : <p className="text-sm font-semibold text-slate-500">No audio</p>}
                </div>
              </div>
            </div>

            {current.description ? <DetailNote label="Description">{current.description}</DetailNote> : null}
            {current.instruction ? <DetailNote label="Instruction">{current.instruction}</DetailNote> : null}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {canManage ? (
                <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
                </Button>
              ) : <span />}
              <div className="flex flex-wrap gap-2">
                <Link href={`/content?item=${current.id}`} className="inline-flex">
                  <Button type="button" variant="secondary" tabIndex={-1}>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Open in Content Library
                  </Button>
                </Link>
                {canManage ? (
                  <Button type="button" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                  </Button>
                ) : null}
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
  const canManage = user.role === "teacher";

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
      <Dialog open={!confirmDelete} onClose={onClose} title={current.title || current.fileName} className="max-w-2xl" hideHeader>
        <div className="space-y-4">
          <PopupHeader
            icon={current.type === "audio-file" ? Volume2 : current.type === "gesture-media" ? FileVideo : ImageIcon}
            tile="bg-blue-100 text-blue-700"
            title={current.title || current.fileName}
            subtitle={mediaTypeNames[current.type]}
          />

          <div className="grid min-h-48 place-items-center overflow-hidden rounded-2xl border border-blue-100 bg-[#fff]">
            {!url ? (
              <p className="py-10 text-sm font-semibold text-slate-500">No preview available</p>
            ) : current.type === "audio-file" || isAudioUrl(url) ? (
              <audio src={url} controls className="m-6 w-[calc(100%-3rem)]" />
            ) : isVideoUrl(url) ? (
              <p className="py-10 text-sm font-semibold text-slate-500">Old video file. Videos are no longer used.</p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt={current.title} className="max-h-72 w-full object-contain p-4" />
            )}
          </div>

          <DetailList>
            <DetailRow icon={FileText} label="File name">
              {current.fileName}
            </DetailRow>
            <DetailRow icon={Layers} label="Material">
              {relatedItem ? (
                <button type="button" onClick={() => onOpenItem(relatedItem)} className="font-semibold text-blue-700 hover:underline">
                  {relatedItem.label}
                </button>
              ) : (
                "Not linked"
              )}
            </DetailRow>
            <DetailRow icon={UserRound} label="Uploaded by">
              {nameFor(users, current.uploadedBy)}
            </DetailRow>
            <DetailRow icon={Clock} label="Uploaded">
              {formatDate(current.uploadedAt)}
            </DetailRow>
          </DetailList>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {canManage ? (
              <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
              </Button>
            ) : <span />}
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
