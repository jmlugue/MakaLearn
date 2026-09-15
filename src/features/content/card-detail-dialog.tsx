"use client";

import { ChangeEvent, ReactNode, useEffect, useId, useState } from "react";
import { BookPlus, Film, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { AudioButton, CardImage, getMediaFileName, isVideoUrl } from "@/features/content/content-media";
import {
  CategoryChip,
  KindBadge,
  PopupTitle,
  SectionLabel,
  glassBoxClass,
  deleteButtonClass,
  fieldClass,
  isFixedGesture,
  kindTone
} from "@/features/content/content-shared";
import { cn, formatDate } from "@/lib/utils";
import type { Category, LearningItem, MediaAsset } from "@/types";

export type CardTextValues = { label: string; categoryId: string; description: string; tags: string[] };
type UploadConfig = Pick<MediaAsset, "bucket" | "type">;

export function CardDetailDialog({
  item,
  categories,
  creator,
  canDelete,
  onClose,
  onSaveText,
  onUpload,
  onGenerateLesson,
  onDelete
}: {
  item: LearningItem | null;
  categories: Category[];
  creator: string;
  /** Teachers can only delete materials they created (admins can delete any). */
  canDelete: boolean;
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
  const tone = item ? kindTone(item.contentType) : kindTone("pecs");

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
    ) : (
      <>
        {canDelete && !isFixedGesture(item) ? (
          <Button type="button" variant="ghost" className={deleteButtonClass} onClick={() => onDelete(item)}>
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
  ) : null;

  const about = item ? (
    <Box title={editing ? "Edit details" : "About"}>
      {editing ? (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-card-label">Label</Label>
              <Input id="edit-card-label" className={fieldClass} value={label} onChange={(event) => setLabel(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-card-category">Category</Label>
              <Select id="edit-card-category" className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
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
            <Textarea
              id="edit-card-description"
              className={cn(fieldClass, "min-h-20")}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-card-tags">Tags</Label>
            <Input id="edit-card-tags" className={fieldClass} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="food, snack" />
            <p className="mt-1 text-xs text-slate-500">Separate with commas.</p>
          </div>
          <FieldError message={error} />
        </div>
      ) : (
        <>
          <p className="text-sm leading-6 text-slate-700">{item.description}</p>
          {item.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </Box>
  ) : null;

  const media = item ? (
    <Box title="Media">
      <div className="divide-y divide-blue-100/70">
        {item.contentType === "gesture" ? (
          <MediaRow
            title="Gesture video"
            fileName={getMediaFileName(item.gestureMediaUrl)}
            empty="No video yet"
            accept="video/*"
            thumb={<Film className={cn("h-5 w-5", tone.text)} aria-hidden="true" />}
            hasValue={Boolean(item.gestureMediaUrl)}
            onUpload={(file) => onUpload(item, file, { bucket: "gesture-media", type: "gesture-media" })}
          />
        ) : null}
        <MediaRow
          title={item.contentType === "pecs" ? "Card image" : "Reference image"}
          fileName={getMediaFileName(item.symbolImageUrl)}
          empty="No image yet"
          accept="image/*"
          thumb={item.symbolImageUrl ? <CardImage value={item.symbolImageUrl} label={item.label} className="text-[10px]" /> : null}
          hasValue={Boolean(item.symbolImageUrl)}
          onUpload={(file) => onUpload(item, file, { bucket: "symbol-images", type: "symbol-image" })}
        />
        <MediaRow
          title="Audio"
          fileName={getMediaFileName(item.audioUrl) ?? (item.audioUrl ? "Browser voice" : undefined)}
          empty="No audio yet"
          accept="audio/*"
          thumb={<AudioButton value={item.audioUrl} label={item.label} className="h-9 w-9" />}
          hasValue={Boolean(item.audioUrl)}
          onUpload={(file) => onUpload(item, file, { bucket: "audio-files", type: "audio-file" })}
        />
      </div>
    </Box>
  ) : null;

  return (
    <Dialog open={Boolean(item)} onClose={saving ? () => undefined : onClose} title={item?.label ?? ""} className="max-w-4xl" footer={footer} hideHeader>
      {item ? (
        item.contentType === "gesture" ? (
          <GestureLayout item={item} category={category} creator={creator} about={about} media={media} onUpload={onUpload} />
        ) : (
          <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="rounded-2xl bg-gradient-to-b from-indigo-100/80 to-indigo-50/60 p-4 ring-1 ring-indigo-100">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-white bg-[#fff] p-3 shadow-sm">
                <CardImage value={item.symbolImageUrl} label={item.label} className="text-4xl" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <AudioButton value={item.audioUrl} label={item.label} className="h-10 w-10" />
                <span className="text-sm font-semibold text-slate-700">{item.audioUrl ? "Play word" : "No audio"}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                By <span className="font-semibold text-slate-700">{creator}</span> · {formatDate(item.updatedAt)}
              </p>
            </div>
            <div className="min-w-0 space-y-4">
              <PopupTitle title={item.label}>
                <KindBadge kind="pecs" />
                <CategoryChip category={category} className="bg-white/80" />
              </PopupTitle>
              {about}
              {media}
            </div>
          </div>
        )
      ) : null}
    </Dialog>
  );
}

function GestureLayout({
  item,
  category,
  creator,
  about,
  media,
  onUpload
}: {
  item: LearningItem;
  category?: Category;
  creator: string;
  about: ReactNode;
  media: ReactNode;
  onUpload: (item: LearningItem, file: File, config: UploadConfig) => Promise<void>;
}) {
  const tone = kindTone("gesture");
  const video = item.gestureMediaUrl;
  const inputId = useId();

  return (
    <div className="space-y-4">
      <PopupTitle title={item.label}>
        <KindBadge kind="gesture" />
        <CategoryChip category={category} className="bg-white/80" />
        {isFixedGesture(item) ? (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sky-800">Fixed</span>
        ) : null}
        <span className="text-xs text-slate-500">
          By <span className="font-semibold text-slate-700">{creator}</span> · {formatDate(item.updatedAt)}
        </span>
      </PopupTitle>
      <div className={cn("overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100/80 to-blue-50/70 p-2 ring-1", tone.border)}>
        {video && isVideoUrl(video) ? (
          <video key={video} controls playsInline src={video} className="aspect-video max-h-80 w-full rounded-xl bg-slate-900 object-contain" aria-label={`${item.label} video`} />
        ) : (
          <div className="grid aspect-video max-h-80 w-full place-items-center rounded-xl border-2 border-dashed border-sky-200 bg-white/80">
            <div className="text-center">
              <Film className="mx-auto h-8 w-8 text-sky-400" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-slate-600">No video yet</p>
              <input
                id={inputId}
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onUpload(item, file, { bucket: "gesture-media", type: "gesture-media" }).catch(() => undefined);
                }}
              />
              <label
                htmlFor={inputId}
                className="mt-3 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload video
              </label>
            </div>
          </div>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {about}
        {media}
      </div>
    </div>
  );
}

function Box({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={cn("p-4", glassBoxClass)}>
      <SectionLabel className="mb-3">{title}</SectionLabel>
      {children}
    </div>
  );
}

function MediaRow({
  title,
  fileName,
  empty,
  accept,
  thumb,
  hasValue,
  onUpload
}: {
  title: string;
  fileName?: string;
  empty: string;
  accept: string;
  thumb: ReactNode;
  hasValue: boolean;
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
    <div className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-50">{thumb}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className={cn("block truncate text-xs", status === "error" ? "text-red-600" : "text-slate-500")}>
          {status === "error" ? "Upload failed. Try again." : hasValue ? fileName ?? "Stored file" : empty}
        </span>
      </span>
      <input id={id} type="file" accept={accept} onChange={handleChange} className="sr-only" disabled={status === "uploading"} />
      <label
        htmlFor={id}
        className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
      >
        {status === "uploading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
        {status === "uploading" ? "Uploading" : hasValue ? "Replace" : "Upload"}
      </label>
    </div>
  );
}
