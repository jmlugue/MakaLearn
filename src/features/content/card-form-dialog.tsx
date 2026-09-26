"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { FileAudio, Image as ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { CardTile } from "@/features/content/card-tile";
import { PopupTitle, SectionLabel, fieldClass, fileCategoryName, glassBoxClass, kindMeta, kindTone, visibleCategories, type ContentKind } from "@/features/content/content-shared";
import { limitLabel, mediaSizeLimits, sizeError } from "@/utils/media-limits";
import { acceptFor, expectedFileName, extensionError, fileNameError, labelFromWord, namePart, parseFileName } from "@/utils/media-filename";
import { RenameFileDialog } from "@/features/content/rename-file-dialog";
import type { Category } from "@/types";

export type NewCardFiles = Partial<Record<"symbol" | "audio", File>>;
export type NewCardValues = { kind: ContentKind; label: string; categoryId: string; description: string; files: NewCardFiles };

const fileBuckets = { symbol: "symbol-images", audio: "audio-files" } as const;

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
  const choices = useMemo(() => visibleCategories(categories), [categories]);
  const [kind, setKind] = useState<ContentKind>(initialKind);
  const [label, setLabel] = useState("");
  const [categoryId, setCategoryId] = useState(() => choices[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<NewCardFiles>({});
  const [error, setError] = useState("");
  // A picked file whose name is wrong waits here while the rename pop-up is open.
  const [renaming, setRenaming] = useState<{
    file: File;
    key: keyof NewCardFiles;
    askForLabel: boolean;
    resolve: (file: File) => void;
    reject: (error: Error) => void;
  } | null>(null);

  const imagePreview = useObjectUrl(files.symbol);
  const tone = kindTone(kind);
  const category = categories.find((candidate) => candidate.id === categoryId);
  const categoryName = fileCategoryName(category);

  /**
   * Checks a picked file against the name rule. A right name is kept as is; with no label yet it also fills
   * the label and category. A wrong name opens the rename pop-up, and the file is kept once renamed.
   */
  function stage(key: keyof NewCardFiles) {
    return (file: File) => {
      const bucket = fileBuckets[key];
      const wrongType = extensionError(file, bucket);
      if (wrongType) return Promise.reject(new Error(wrongType));

      let nextLabel = label.trim();
      let nextCategory = categoryName;
      const parsed = parseFileName(file.name);
      if (!nextLabel && parsed) {
        const match = choices.find((candidate) => namePart(candidate.name) === parsed.category);
        if (match) {
          nextLabel = labelFromWord(parsed.word);
          nextCategory = match.name;
          setLabel(nextLabel);
          setCategoryId(match.id);
        }
      }
      if (nextLabel && !fileNameError(file, bucket, nextLabel, nextCategory)) {
        setError("");
        setFiles((current) => ({ ...current, [key]: file }));
        return Promise.resolve(file);
      }
      return new Promise<File>((resolve, reject) => setRenaming({ file, key, askForLabel: !nextLabel, resolve, reject }));
    };
  }

  function confirmRename(result: { file: File; label?: string; categoryId?: string }) {
    if (!renaming) return;
    if (result.label) setLabel(result.label);
    if (result.categoryId) setCategoryId(result.categoryId);
    setError("");
    setFiles((current) => ({ ...current, [renaming.key]: result.file }));
    renaming.resolve(result.file);
    setRenaming(null);
  }

  function cancelRename() {
    renaming?.reject(new Error("Not added. Pick the file again to rename it."));
    setRenaming(null);
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
    // Checked again here: the label or category may have changed after a file was picked.
    for (const key of Object.keys(fileBuckets) as Array<keyof NewCardFiles>) {
      const file = files[key];
      if (!file) continue;
      const problem = sizeError(file, fileBuckets[key]) || fileNameError(file, fileBuckets[key], label.trim(), categoryName);
      if (problem) {
        setError(`${file.name}: ${problem}`);
        return;
      }
    }
    setSaving(true);
    const saved = await onSubmit({ kind, label: label.trim(), categoryId, description: description.trim(), files });
    setSaving(false);
    if (saved) onClose();
  }

  const example = expectedFileName(label.trim() || "eat", categoryName || "food");

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_13rem]">
      <div className="space-y-4">
        <PopupTitle title="Add material" />
        <SegmentedControl
          label="Material type"
          value={kind}
          onChange={setKind}
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
                {choices.map((option) => (
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
          <FileUpload
            key="symbol"
            compact
            icon={ImageIcon}
            label={kind === "pecs" ? "Card image" : "Reference image"}
            accept={acceptFor["symbol-images"]}
            hint={`Name it ${example}. PNG, JPG, or WebP, up to ${limitLabel("symbol-images")}`}
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
            accept={acceptFor["audio-files"]}
            hint={`Name it ${example}. MP3, WAV, or M4A, up to ${limitLabel("audio-files")}`}
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
        <div className="sticky top-0 mt-12">
          <SectionLabel className="mb-2">Live preview</SectionLabel>
          <CardTile item={{ label, contentType: kind, symbolImageUrl: imagePreview, audioUrl: files.audio ? "staged" : undefined }} category={category} />
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

      <RenameFileDialog
        file={renaming?.file ?? null}
        bucket={renaming ? fileBuckets[renaming.key] : "symbol-images"}
        label={label.trim()}
        categoryName={categoryName}
        askForLabel={renaming?.askForLabel ? { categories: choices, categoryId, nameFor: fileCategoryName } : undefined}
        onConfirm={confirmRename}
        onCancel={cancelRename}
      />
    </form>
  );
}
