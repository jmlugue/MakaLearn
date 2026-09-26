"use client";

import { ChangeEvent, ReactNode, useEffect, useId, useState } from "react";
import { Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { AudioButton, CardImage, PictureBox, getMediaFileName } from "@/features/content/content-media";
import {
  CategoryChip,
  PopupTitle,
  SectionLabel,
  deleteButtonClass,
  fieldClass,
  fileCategoryName,
  glassBoxClass,
  isFixedGesture,
  isHiddenCategory,
  kindTone,
  visibleCategories
} from "@/features/content/content-shared";
import { cn, formatDate } from "@/lib/utils";
import { limitLabel, sizeError } from "@/utils/media-limits";
import { acceptFor, expectedFileName, extensionError, fileNameError } from "@/utils/media-filename";
import { RenameFileDialog } from "@/features/content/rename-file-dialog";
import type { Category, LearningItem, MediaAsset } from "@/types";

export type CardTextValues = { label: string; categoryId: string; description: string };
type UploadConfig = Pick<MediaAsset, "bucket" | "type">;

export function CardDetailDialog({
  item,
  categories,
  creator,
  canManage,
  onClose,
  onSaveText,
  onUpload,
  onRemoveMedia,
  onDelete
}: {
  item: LearningItem | null;
  categories: Category[];
  creator: string;
  /** Teachers manage shared materials. Admins receive a read-only view. */
  canManage: boolean;
  onClose: () => void;
  onSaveText: (item: LearningItem, values: CardTextValues) => Promise<boolean>;
  onUpload: (item: LearningItem, file: File, config: UploadConfig) => Promise<void>;
  onRemoveMedia: (item: LearningItem, type: MediaAsset["type"]) => void;
  onDelete: (item: LearningItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
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
    const saved = await onSaveText(item, { label: label.trim(), categoryId, description: description.trim() });
    setSaving(false);
    if (saved) setEditing(false);
  }

  const category = categories.find((candidate) => candidate.id === item?.categoryId);
  const tone = kindTone(item?.contentType ?? "pecs");
  const categoryName = fileCategoryName(category);
  // A built-in gesture keeps its hidden category unless the teacher picks a real one.
  const categoryChoices = visibleCategories(categories);

  const footer = item ? (
    editing ? (
      <>
        <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </>
    ) : canManage ? (
      <>
        {!isFixedGesture(item) ? (
          <Button type="button" variant="ghost" className={deleteButtonClass} onClick={() => onDelete(item)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        ) : null}
        <Button type="button" onClick={startEdit}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit
        </Button>
      </>
    ) : null
  ) : null;

  return (
    <Dialog open={Boolean(item)} onClose={saving ? () => undefined : onClose} title={item?.label ?? ""} className="max-w-3xl" footer={footer} hideHeader>
      {item ? (
        <div className="grid gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
          <div className={cn("self-start rounded-2xl border p-3", tone.soft, tone.border)}>
            <PictureBox value={item.symbolImageUrl} label={item.label} className="rounded-xl bg-[#fff]" inset="inset-3" textClassName="text-4xl" />
            <div className="mt-3 flex items-center gap-2">
              <AudioButton value={item.audioUrl} label={item.label} className="h-10 w-10" />
              <span className="text-sm font-semibold text-slate-700">{item.audioUrl ? "Play word" : "No audio"}</span>
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            {editing ? (
              <div className="grid gap-3">
                <PopupTitle title="Edit material" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="edit-card-label">Label</Label>
                    <Input id="edit-card-label" className={fieldClass} value={label} onChange={(event) => setLabel(event.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="edit-card-category">Category</Label>
                    <Select id="edit-card-category" className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                      {isHiddenCategory(categoryId) ? <option value={categoryId}>None</option> : null}
                      {categoryChoices.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="edit-card-description">Description</Label>
                  <Textarea
                    id="edit-card-description"
                    className={cn(fieldClass, "min-h-20")}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <FieldError message={error} />
              </div>
            ) : (
              <div>
                <PopupTitle title={item.label}>
                  <CategoryChip category={category} className="bg-white/80" />
                </PopupTitle>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            )}

            <div className={cn("p-4", glassBoxClass)}>
              <SectionLabel className="mb-3">Files</SectionLabel>
              <div className="divide-y divide-blue-100/70">
                <FileRow
                  title="Picture"
                  fileName={getMediaFileName(item.symbolImageUrl)}
                  empty="No picture yet"
                  bucket="symbol-images"
                  label={item.label}
                  categoryName={categoryName}
                  thumb={item.symbolImageUrl ? <CardImage value={item.symbolImageUrl} label={item.label} className="text-[10px]" /> : null}
                  hasValue={Boolean(item.symbolImageUrl)}
                  canManage={canManage && !editing}
                  onUpload={(file) => onUpload(item, file, { bucket: "symbol-images", type: "symbol-image" })}
                  onRemove={() => onRemoveMedia(item, "symbol-image")}
                />
                <FileRow
                  title="Audio"
                  fileName={getMediaFileName(item.audioUrl) ?? (item.audioUrl ? "Browser voice" : undefined)}
                  empty="No audio yet"
                  bucket="audio-files"
                  label={item.label}
                  categoryName={categoryName}
                  thumb={<AudioButton value={item.audioUrl} label={item.label} className="h-9 w-9" />}
                  hasValue={Boolean(item.audioUrl)}
                  canManage={canManage && !editing}
                  onUpload={(file) => onUpload(item, file, { bucket: "audio-files", type: "audio-file" })}
                  onRemove={() => onRemoveMedia(item, "audio-file")}
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              By <span className="font-semibold text-slate-700">{creator}</span> · {formatDate(item.updatedAt)}
            </p>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function FileRow({
  title,
  fileName,
  empty,
  bucket,
  label,
  categoryName,
  thumb,
  hasValue,
  canManage,
  onUpload,
  onRemove
}: {
  title: string;
  fileName?: string;
  empty: string;
  bucket: "symbol-images" | "audio-files";
  /** The material's label and category, which its file names must follow (word_category). */
  label: string;
  categoryName: string;
  thumb: ReactNode;
  hasValue: boolean;
  canManage: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  // A picked file with the wrong name waits here while the rename pop-up is open.
  const [renaming, setRenaming] = useState<File | null>(null);
  const example = expectedFileName(label, categoryName);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const refused = sizeError(file, bucket) || extensionError(file, bucket);
    if (refused) {
      setStatus("error");
      setError(refused);
      return;
    }
    if (fileNameError(file, bucket, label, categoryName)) {
      setStatus("idle");
      setError("");
      setRenaming(file);
      return;
    }
    await upload(file);
  }

  async function upload(file: File) {
    setStatus("uploading");
    setError("");
    try {
      await onUpload(file);
      setStatus("idle");
    } catch (uploadError) {
      setStatus("error");
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Try again.");
    }
  }

  return (
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-50">{thumb}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className={cn("block text-xs", status === "error" ? "text-red-600" : "truncate text-slate-500")}>
          {status === "error" ? error : hasValue ? fileName ?? "Stored file" : canManage ? `${empty} · name it ${example} · up to ${limitLabel(bucket)}` : empty}
        </span>
      </span>
      {canManage ? (
        <>
          <input id={id} type="file" accept={acceptFor[bucket]} onChange={handleChange} className="sr-only" disabled={status === "uploading"} />
          <label
            htmlFor={id}
            className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
          >
            {status === "uploading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
            {status === "uploading" ? "Uploading" : hasValue ? "Replace" : "Upload"}
          </label>
          {hasValue ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${title.toLowerCase()}`}
              className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          ) : null}
          <RenameFileDialog
            file={renaming}
            bucket={bucket}
            label={label}
            categoryName={categoryName}
            onConfirm={({ file }) => {
              setRenaming(null);
              void upload(file);
            }}
            onCancel={() => setRenaming(null)}
          />
        </>
      ) : null}
    </div>
  );
}
