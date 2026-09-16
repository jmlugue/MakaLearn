"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { FileAudio, Film, Image as ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { cn } from "@/lib/utils";
import { CardTile } from "@/features/content/card-tile";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { GESTURE_CATEGORY_ID, PopupTitle, SectionLabel, fieldClass, glassBoxClass, kindMeta, kindTone, type ContentKind } from "@/features/content/content-shared";
import { limitLabel, mediaSizeLimits, sizeError } from "@/utils/media-limits";
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
  /** Resolves true when the material was saved. */
  onSubmit: (values: NewCardValues) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onClose={saving ? () => undefined : onClose} title="Add material" className="max-w-3xl" hideHeader>
      {open ? <CardForm initialKind={initialKind} categories={categories} saving={saving} setSaving={setSaving} onClose={onClose} onSubmit={onSubmit} /> : null}
    </Dialog>
  );
}

function defaultCategoryFor(kind: ContentKind, categories: Category[]) {
  if (kind === "gesture") return categories.find((category) => category.id === GESTURE_CATEGORY_ID)?.id ?? categories[0]?.id ?? "";
  return categories.find((category) => category.id !== GESTURE_CATEGORY_ID)?.id ?? categories[0]?.id ?? "";
}

function useObjectUrl(file?: File) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
}

function Box({ title, tone, children }: { title: string; tone: string; children: ReactNode }) {
  return (
    <div className={cn("overflow-hidden", glassBoxClass)}>
      <div className={cn("px-4 py-2", tone)}>
        <SectionLabel>{title}</SectionLabel>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
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

  const imagePreview = useObjectUrl(files.symbol);
  const videoPreview = useObjectUrl(files.gesture);
  const tone = kindTone(kind);

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
    if (files.gesture && !files.gesture.type.startsWith("video/")) {
      setError("The gesture video must be a video file.");
      return;
    }
    const oversized =
      (files.gesture && sizeError(files.gesture, "gesture-media")) ||
      (files.symbol && sizeError(files.symbol, "symbol-images")) ||
      (files.audio && sizeError(files.audio, "audio-files"));
    if (oversized) {
      setError(oversized);
      return;
    }
    setSaving(true);
    const saved = await onSubmit({ kind, label: label.trim(), categoryId, description: description.trim(), files });
    setSaving(false);
    if (saved) onClose();
  }

  const category = categories.find((candidate) => candidate.id === categoryId);

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="space-y-4">
        <PopupTitle title="Add material" />
        <UnderlineTabs
          id="add-material-type"
          label="Material type"
          value={kind}
          onChange={changeKind}
          options={(["pecs", "gesture"] as ContentKind[]).map((option) => ({ value: option, label: kindMeta[option].label, icon: kindMeta[option].icon }))}
        />

        <Box title="Details" tone={tone.soft}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="card-label">Label</Label>
              <Input
                id="card-label"
                className={fieldClass}
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
              <Select id="card-category" className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
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
              className={cn(fieldClass, "min-h-20")}
              value={description}
              placeholder="What this helps the learner say."
              onChange={(event) => {
                setDescription(event.target.value);
                setError("");
              }}
            />
          </div>
        </Box>

        <Box title="Media" tone={tone.soft}>
          {kind === "gesture" ? (
            <FileUpload
              key="gesture"
              compact
              icon={Film}
              label="Gesture video"
              accept="video/*"
              hint={`MP4, WebM, or MOV, up to ${limitLabel("gesture-media")}`}
              maxBytes={mediaSizeLimits["gesture-media"]}
              storageNote="Shows how to sign it."
              successMessage="Ready to save."
              onUpload={stage("gesture")}
              onRemove={unstage("gesture")}
            />
          ) : null}
          <FileUpload
            key="symbol"
            compact
            icon={ImageIcon}
            label={kind === "pecs" ? "Card image" : "Reference image"}
            accept="image/*"
            hint={`PNG, JPG, or WebP, up to ${limitLabel("symbol-images")}`}
            maxBytes={mediaSizeLimits["symbol-images"]}
            storageNote="Saved with the material."
            successMessage="Ready to save."
            onUpload={stage("symbol")}
            onRemove={unstage("symbol")}
          />
          <FileUpload
            key="audio"
            compact
            icon={FileAudio}
            label="Audio"
            accept="audio/*"
            hint={`MP3, WAV, or M4A, up to ${limitLabel("audio-files")}`}
            maxBytes={mediaSizeLimits["audio-files"]}
            storageNote="Plays the spoken word."
            successMessage="Ready to save."
            onUpload={stage("audio")}
            onRemove={unstage("audio")}
          />
        </Box>
        <FieldError message={error} />
      </div>

      <div className="hidden md:block">
        <div className={cn("sticky top-0 mt-12 rounded-2xl p-3", tone.soft)}>
          <SectionLabel className="mb-2">Live preview</SectionLabel>
          <CardTile
            item={{ label, contentType: kind, symbolImageUrl: imagePreview, audioUrl: files.audio ? "staged" : undefined }}
            previewVideoUrl={kind === "gesture" ? videoPreview : undefined}
            category={category}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
