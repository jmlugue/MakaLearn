"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileAudio, Film, Image as ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CardTile } from "@/features/content/card-tile";
import { GESTURE_CATEGORY_ID, kindMeta, type ContentKind } from "@/features/content/content-shared";
import type { Category } from "@/types";

export type NewCardFiles = Partial<Record<"symbol" | "gesture" | "audio", File>>;
export type NewCardValues = { kind: ContentKind; label: string; categoryId: string; description: string; files: NewCardFiles };

export function CardFormDialog({
  open,
  initialKind,
  categories,
  onClose,
  onSubmit
}: {
  open: boolean;
  initialKind: ContentKind;
  categories: Category[];
  onClose: () => void;
  /** Resolves true when the card was saved. */
  onSubmit: (values: NewCardValues) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onClose={saving ? () => undefined : onClose} title="Add card" className="max-w-3xl">
      {open ? <CardForm initialKind={initialKind} categories={categories} saving={saving} setSaving={setSaving} onClose={onClose} onSubmit={onSubmit} /> : null}
    </Dialog>
  );
}

function defaultCategoryFor(kind: ContentKind, categories: Category[]) {
  if (kind === "gesture") return categories.find((category) => category.id === GESTURE_CATEGORY_ID)?.id ?? categories[0]?.id ?? "";
  return categories.find((category) => category.id !== GESTURE_CATEGORY_ID)?.id ?? categories[0]?.id ?? "";
}

function CardForm({
  initialKind,
  categories,
  saving,
  setSaving,
  onClose,
  onSubmit
}: {
  initialKind: ContentKind;
  categories: Category[];
  saving: boolean;
  setSaving: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (values: NewCardValues) => Promise<boolean>;
}) {
  const [kind, setKind] = useState<ContentKind>(initialKind);
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState(() => defaultCategoryFor(initialKind, categories));
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<NewCardFiles>({});
  const [error, setError] = useState("");

  const imagePreview = useMemo(() => (files.symbol ? URL.createObjectURL(files.symbol) : undefined), [files.symbol]);
  useEffect(() => () => (imagePreview ? URL.revokeObjectURL(imagePreview) : undefined), [imagePreview]);

  function changeKind(next: ContentKind) {
    setKind(next);
    setCategoryId(defaultCategoryFor(next, categories));
    setFiles((current) => ({ symbol: current.symbol, audio: current.audio }));
  }

  function stage(key: keyof NewCardFiles) {
    return (file: File) => {
      setFiles((current) => ({ ...current, [key]: file }));
      return Promise.resolve();
    };
  }

  function unstage(key: keyof NewCardFiles) {
    return () =>
      setFiles((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !categoryId || !description.trim()) {
      setError("Add a label, category, and description.");
      return;
    }
    setSaving(true);
    const saved = await onSubmit({ kind, label: label.trim(), categoryId, description: description.trim(), files });
    setSaving(false);
    if (saved) onClose();
  }

  const category = categories.find((candidate) => candidate.id === categoryId);

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_12rem]">
      <div className="space-y-4">
        <SegmentedControl
          label="Card type"
          value={kind}
          onChange={changeKind}
          options={[
            { value: "pecs", label: kindMeta.pecs.label },
            { value: "gesture", label: kindMeta.gesture.label }
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="card-label">Label</Label>
            <Input
              id="card-label"
              value={label}
              placeholder={kind === "pecs" ? "Eat" : "Sit down"}
              onChange={(event) => {
                setLabel(event.target.value);
                setError("");
              }}
            />
          </div>
          <div>
            <Label htmlFor="card-category">Category</Label>
            <Select id="card-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="card-description">Description</Label>
          <Textarea
            id="card-description"
            value={description}
            placeholder="What this helps the learner say."
            className="min-h-20"
            onChange={(event) => {
              setDescription(event.target.value);
              setError("");
            }}
          />
        </div>
        <div className="grid gap-2">
          <FileUpload
            compact
            icon={ImageIcon}
            label={kind === "pecs" ? "Card image" : "Reference image"}
            accept="image/*"
            hint="PNG, JPG, or WebP"
            storageNote="Saved with the card."
            successMessage="Ready to save."
            onUpload={stage("symbol")}
            onRemove={unstage("symbol")}
          />
          {kind === "gesture" ? (
            <FileUpload
              compact
              icon={Film}
              label="Gesture video"
              accept="image/*,video/*"
              hint="Short video or image"
              storageNote="Shows how to sign it."
              successMessage="Ready to save."
              onUpload={stage("gesture")}
              onRemove={unstage("gesture")}
            />
          ) : null}
          <FileUpload
            compact
            icon={FileAudio}
            label="Audio"
            accept="audio/*"
            hint="MP3, WAV, or M4A"
            storageNote="Plays the spoken word."
            successMessage="Ready to save."
            onUpload={stage("audio")}
            onRemove={unstage("audio")}
          />
        </div>
        <FieldError message={error} />
      </div>

      <div className="hidden md:block">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Preview</p>
        <CardTile
          item={{
            label,
            contentType: kind,
            symbolImageUrl: imagePreview,
            // Fake video path only drives the play badge on the preview tile.
            gestureMediaUrl: files.gesture?.type.startsWith("video") ? "/preview.mp4" : undefined,
            audioUrl: files.audio ? "staged" : undefined
          }}
          category={category}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {saving ? "Saving..." : "Save card"}
        </Button>
      </div>
    </form>
  );
}
