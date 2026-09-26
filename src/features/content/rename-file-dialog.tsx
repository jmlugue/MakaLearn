"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FileAudio, FilePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select } from "@/components/ui/form";
import { PopupTitle, fieldClass } from "@/features/content/content-shared";
import { baseName, expectedFileName, extensionForFile, fileNameError, renameFile, type UploadBucket } from "@/utils/media-filename";
import type { Category } from "@/types";

/** Lets the teacher pick a card's label and category inside the pop-up, when Add material has none yet. */
export type RenameLabelChoice = {
  categories: Category[];
  categoryId: string;
  /** The category name used in file names (the hidden gestures category is "gestures"). */
  nameFor: (category?: Category) => string;
};

export type RenameResult = { file: File; label?: string; categoryId?: string };

/**
 * Shown when a picked file is not named `<word>_<category>` for its card. The box starts with the right
 * name, so most teachers only press "Use this name". The name must still match the card (the advisor's
 * rule); the file's contents and type never change.
 */
export function RenameFileDialog({
  file,
  bucket,
  label,
  categoryName,
  askForLabel,
  onConfirm,
  onCancel
}: {
  file: File | null;
  bucket: UploadBucket;
  /** The card's label, or "" when Add material has none yet (then `askForLabel` is given). */
  label: string;
  categoryName: string;
  askForLabel?: RenameLabelChoice;
  onConfirm: (result: RenameResult) => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={Boolean(file)} onClose={onCancel} title="Rename the file" className="max-w-md" hideHeader>
      {file ? (
        <RenameForm
          key={`${file.name}-${file.lastModified}`}
          file={file}
          bucket={bucket}
          label={label}
          categoryName={categoryName}
          askForLabel={askForLabel}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ) : null}
    </Dialog>
  );
}

function RenameForm({
  file,
  bucket,
  label,
  categoryName,
  askForLabel,
  onConfirm,
  onCancel
}: {
  file: File;
  bucket: UploadBucket;
  label: string;
  categoryName: string;
  askForLabel?: RenameLabelChoice;
  onConfirm: (result: RenameResult) => void;
  onCancel: () => void;
}) {
  const [cardLabel, setCardLabel] = useState(label);
  const [categoryId, setCategoryId] = useState(askForLabel?.categoryId ?? "");
  const chosenCategory = askForLabel?.categories.find((category) => category.id === categoryId);
  const cardCategory = askForLabel ? askForLabel.nameFor(chosenCategory) : categoryName;
  const expected = cardLabel.trim() ? expectedFileName(cardLabel.trim(), cardCategory) : "";
  const [name, setName] = useState(expected);
  const [touched, setTouched] = useState(false);

  // Until the teacher edits the name, it follows the label and category they pick.
  useEffect(() => {
    if (!touched) setName(expected);
  }, [expected, touched]);

  const extension = extensionForFile(file, bucket);
  const preview = useMemo(() => (bucket === "audio-files" ? undefined : URL.createObjectURL(file)), [bucket, file]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const base = baseName(name);
  const problem = !cardLabel.trim()
    ? "Type the label first."
    : !base
      ? `Name it ${expected}.`
      : fileNameError({ name: `${base}.${extension}`, type: file.type }, bucket, cardLabel.trim(), cardCategory);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The pop-up is portalled, but React still bubbles submit to a form around it (Add material).
    event.stopPropagation();
    if (problem) return;
    onConfirm({
      file: renameFile(file, base, bucket),
      ...(askForLabel ? { label: cardLabel.trim(), categoryId } : {})
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PopupTitle title="Rename the file" />
      <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-50 text-blue-700">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-contain" />
          ) : (
            <FileAudio className="h-6 w-6" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink" title={file.name}>
            {file.name}
          </span>
          <span className="block text-xs text-slate-500">Files are named word_category, like the card.</span>
        </span>
      </div>

      {askForLabel ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="rename-label">Label</Label>
            <Input
              id="rename-label"
              className={fieldClass}
              value={cardLabel}
              placeholder="Eat"
              onChange={(event) => setCardLabel(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="rename-category">Category</Label>
            <Select id="rename-category" className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {askForLabel.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : null}

      <div>
        <Label htmlFor="rename-name">File name</Label>
        <div className="flex items-center gap-1.5">
          <Input
            id="rename-name"
            className={fieldClass}
            value={name}
            placeholder={expected || "eat_food"}
            onChange={(event) => {
              setName(event.target.value);
              setTouched(true);
            }}
          />
          <span className="shrink-0 text-sm text-slate-500">.{extension}</span>
        </div>
        <FieldError message={cardLabel.trim() || touched ? problem : ""} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={Boolean(problem)}>
          <FilePen className="h-4 w-4" aria-hidden="true" />
          Use this name
        </Button>
      </div>
    </form>
  );
}
