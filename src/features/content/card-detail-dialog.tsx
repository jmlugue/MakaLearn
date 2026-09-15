"use client";

import { ChangeEvent, useEffect, useId, useState } from "react";
import { BookPlus, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { CardImage, MediaPreview, getMediaFileName, type MediaKind } from "@/features/content/content-media";
import { CategoryChip, KindBadge, isFixedGesture, kindMeta } from "@/features/content/content-shared";
import { cn, formatDate } from "@/lib/utils";
import type { Category, LearningItem, MediaAsset } from "@/types";

export type CardTextValues = { label: string; categoryId: string; description: string; tags: string[] };
type UploadConfig = Pick<MediaAsset, "bucket" | "type">;

export function CardDetailDialog({
  item,
  categories,
  creator,
  onClose,
  onSaveText,
  onUpload,
  onGenerateLesson,
  onDelete
}: {
  item: LearningItem | null;
  categories: Category[];
  creator: string;
  onClose: () => void;
  onSaveText: (item: LearningItem, values: CardTextValues) => Promise<boolean>;
  onUpload: (item: LearningItem, file: File, config: UploadConfig) => Promise<void>;
  onGenerateLesson: (item: LearningItem) => void;
  onDelete: (item: LearningItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setEditing(false);
    setError("");
  }, [item?.id]);

  function startEdit() {
    if (!item) return;
    setLabel(item.label);
    setCategoryId(item.categoryId);
    setDescription(item.description);
    setTags(item.tags.join(", "));
    setError("");
    setEditing(true);
  }

  async function save() {
    if (!item) return;
    if (!label.trim() || !categoryId || !description.trim()) {
      setError("Add a label, category, and description.");
      return;
    }
    setSaving(true);
    const saved = await onSaveText(item, {
      label: label.trim(),
      categoryId,
      description: description.trim(),
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean)
    });
    setSaving(false);
    if (saved) setEditing(false);
  }

  const category = categories.find((candidate) => candidate.id === item?.categoryId);
  const canDelete = item ? !isFixedGesture(item) : false;

  return (
    <Dialog
      open={Boolean(item)}
      onClose={saving ? () => undefined : onClose}
      title={item?.label ?? ""}
      className="max-w-4xl"
      footer={
        item ? (
          editing ? (
            <>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </>
          ) : (
            <>
              {canDelete ? (
                <Button type="button" variant="ghost" className="mr-auto text-red-600 hover:bg-red-50" onClick={() => onDelete(item)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={startEdit}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
              <Button type="button" onClick={() => onGenerateLesson(item)}>
                <BookPlus className="h-4 w-4" aria-hidden="true" />
                Generate lesson
              </Button>
            </>
          )
        ) : null
      }
    >
      {item ? (
        <div className="grid gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] shadow-sm">
              <span className={cn("block h-1.5", kindMeta[item.contentType].accent)} aria-hidden="true" />
              <div className="grid aspect-square place-items-center bg-[#f8fbff] p-3">
                <CardImage value={item.symbolImageUrl} label={item.label} className="text-4xl" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <KindBadge kind={item.contentType} />
              {isFixedGesture(item) ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Fixed</span>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              By <span className="font-semibold text-slate-700">{creator}</span> · {formatDate(item.updatedAt)}
            </p>
          </div>

          <div className="min-w-0 space-y-5">
            {editing ? (
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-card-label">Label</Label>
                    <Input id="edit-card-label" value={label} onChange={(event) => setLabel(event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="edit-card-category">Category</Label>
                    <Select id="edit-card-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                      {categories.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-card-description">Description</Label>
                  <Textarea id="edit-card-description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20" />
                </div>
                <div>
                  <Label htmlFor="edit-card-tags">Tags</Label>
                  <Input id="edit-card-tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="food, snack" />
                  <p className="mt-1 text-xs text-slate-500">Separate with commas.</p>
                </div>
                <FieldError message={error} />
              </div>
            ) : (
              <div>
                <CategoryChip category={category} />
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.description}</p>
                {item.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-blue-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Media</p>
              <div className="mt-2 grid gap-3">
                <MediaSlot
                  title={item.contentType === "pecs" ? "Card image" : "Reference image"}
                  kind="image"
                  value={item.symbolImageUrl}
                  label={item.label}
                  accept="image/*"
                  onUpload={(file) => onUpload(item, file, { bucket: "symbol-images", type: "symbol-image" })}
                />
                {item.contentType === "gesture" ? (
                  <MediaSlot
                    title="Gesture video"
                    kind="gesture"
                    value={item.gestureMediaUrl}
                    label={item.label}
                    accept="image/*,video/*"
                    onUpload={(file) => onUpload(item, file, { bucket: "gesture-media", type: "gesture-media" })}
                  />
                ) : null}
                <MediaSlot
                  title="Audio"
                  kind="audio"
                  value={item.audioUrl}
                  label={item.label}
                  accept="audio/*"
                  onUpload={(file) => onUpload(item, file, { bucket: "audio-files", type: "audio-file" })}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function MediaSlot({
  title,
  kind,
  value,
  label,
  accept,
  onUpload
}: {
  title: string;
  kind: MediaKind;
  value?: string;
  label: string;
  accept: string;
  onUpload: (file: File) => Promise<void>;
}) {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStatus("uploading");
    try {
      await onUpload(file);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl border border-blue-100 bg-[#fff] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink">{title}</p>
        <input id={id} type="file" accept={accept} onChange={handleChange} className="sr-only" disabled={status === "uploading"} />
        <label
          htmlFor={id}
          className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
        >
          {status === "uploading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
          {status === "uploading" ? "Uploading..." : value ? "Replace" : "Upload"}
        </label>
      </div>
      {kind === "image" && value ? (
        // The big picture is already on the left, so the image slot stays a small row.
        <div className="flex items-center gap-3 rounded-xl bg-[#f8fbff] p-2">
          <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#fff]">
            <CardImage value={value} label={label} className="text-sm" />
          </span>
          <span className="min-w-0 truncate text-xs text-slate-500">{getMediaFileName(value) ?? "Stored image"}</span>
        </div>
      ) : (
        <MediaPreview value={value} kind={kind} label={label} />
      )}
      {status === "error" ? <p className="mt-2 text-xs text-red-600">Upload failed. Try again.</p> : null}
    </div>
  );
}
