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
import { acceptFor, expectedFileName, extensionError, fileNameError, guessFromFileName, labelFromWord, namePart, renameFile } from "@/utils/media-filename";
import { pecsCardManifest } from "@/data/pecs-card-manifest";
import { symbolVocabulary } from "@/data/symbol-vocabulary";
import type { Category } from "@/types";

export type NewCardFiles = Partial<Record<"symbol" | "audio", File>>;
export type NewCardValues = { kind: ContentKind; label: string; categoryId: string; description: string; files: NewCardFiles };

const fileBuckets = { symbol: "symbol-images", audio: "audio-files" } as const;

export function CardFormDialog({
  open,
  initialKind,
  categories,
  knownLabels = [],
  onClose,
  onSubmit
}: {
  open: boolean;
  initialKind: ContentKind;
  categories: Category[];
  /** Labels of the symbols and gestures MakaLearn already has. Only these may fill the label from a file name. */
  knownLabels?: string[];
  onClose: () => void;
  /** Resolves true when the material was saved. */
  onSubmit: (values: NewCardValues) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onClose={saving ? () => undefined : onClose} title="Add material" className="max-w-3xl" hideHeader>
      {open ? <CardForm initialKind={initialKind} categories={categories} knownLabels={knownLabels} saving={saving} setSaving={setSaving} onClose={onClose} onSubmit={onSubmit} /> : null}
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
  knownLabels,
  saving,
  setSaving,
  onClose,
  onSubmit
}: {
  initialKind: ContentKind;
  categories: Category[];
  knownLabels: string[];
  saving: boolean;
  setSaving: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (values: NewCardValues) => Promise<boolean>;
}) {
  const choices = useMemo(() => visibleCategories(categories), [categories]);
  // Symbol and gesture words by file-name form ("thank-you"), so only a real word fills the label: cards
  // MakaLearn has (with their own spelling), then common Makaton / PECS words (`symbol-vocabulary.ts`).
  const labelByWord = useMemo(() => {
    const map = new Map<string, string>();
    [...pecsCardManifest.map((card) => card.label), ...knownLabels].forEach((known) => {
      const word = namePart(known);
      if (word && !map.has(word)) map.set(word, known.trim());
    });
    symbolVocabulary.forEach((known) => {
      const word = namePart(known);
      if (word && !map.has(word)) map.set(word, labelFromWord(word));
    });
    return map;
  }, [knownLabels]);
  const [kind, setKind] = useState<ContentKind>(initialKind);
  const [label, setLabel] = useState("");
  // Starts empty so a blank the file name could not fill is easy to see.
  const [categoryId, setCategoryId] = useState("");
  // True while the label or category came from a file name, so a new or removed file may refill it.
  // Typing or picking by hand turns it off, and the teacher's value is then never overwritten.
  const [autoLabel, setAutoLabel] = useState(false);
  const [autoCategory, setAutoCategory] = useState(false);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<NewCardFiles>({});
  const [error, setError] = useState("");

  const imagePreview = useObjectUrl(files.symbol);
  const tone = kindTone(kind);
  const category = categories.find((candidate) => candidate.id === categoryId);
  const categoryName = fileCategoryName(category);

  /**
   * Fills the label and category from file names (the first file listed wins). A field is only filled when
   * it is blank or was filled from a file before, so replacing or removing a file updates it again.
   */
  function fillFromNames(fileList: File[]) {
    const guesses = fileList.map((file) => guessFromFileName(file.name));
    // The label only fills when the name is a symbol or gesture word (a card MakaLearn has, or a common
    // Makaton / PECS word); random words or letters don't.
    const knownLabel = guesses.map((guess) => (guess.word ? labelByWord.get(guess.word) : undefined)).find(Boolean);
    const match = guesses
      .map((guess) =>
        guess.category
          ? choices.find(
              (candidate) => namePart(candidate.name) === guess.category || namePart(fileCategoryName(candidate)) === guess.category
            )
          : undefined
      )
      .find(Boolean);
    if (!label.trim() || autoLabel) {
      setLabel(knownLabel ?? "");
      setAutoLabel(Boolean(knownLabel));
    }
    if (!categoryId || autoCategory) {
      setCategoryId(match?.id ?? "");
      setAutoCategory(Boolean(match));
    }
  }

  /**
   * Any picture or sound of the right type is taken. Its name fills whatever is blank: `happy_emotions` gives
   * the label and category, `happy` only the label, and a name like IMG_2044 or `asdf_emotions` no label
   * (the label only comes from a known symbol or gesture word). On Save the file is
   * renamed to match the card (word_category), so the stored file always follows the rule.
   */
  function stage(key: keyof NewCardFiles) {
    return (file: File) => {
      const wrongType = extensionError(file, fileBuckets[key]);
      if (wrongType) return Promise.reject(new Error(wrongType));

      const others = (Object.keys(fileBuckets) as Array<keyof NewCardFiles>)
        .filter((other) => other !== key)
        .map((other) => files[other])
        .filter((other): other is File => Boolean(other));
      fillFromNames([file, ...others]);
      setError("");
      setFiles((current) => ({ ...current, [key]: file }));
      return Promise.resolve(file);
    };
  }

  function unstage(key: keyof NewCardFiles) {
    return () => {
      const remaining = (Object.keys(fileBuckets) as Array<keyof NewCardFiles>)
        .filter((other) => other !== key)
        .map((other) => files[other])
        .filter((other): other is File => Boolean(other));
      fillFromNames(remaining);
      setFiles((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !categoryId || !description.trim()) {
      setError("Add a label, category, and description.");
      return;
    }
    // Each file is renamed to match the card (word_category) unless it already does.
    const named: NewCardFiles = {};
    for (const key of Object.keys(fileBuckets) as Array<keyof NewCardFiles>) {
      const file = files[key];
      if (!file) continue;
      const bucket = fileBuckets[key];
      const problem = sizeError(file, bucket) || extensionError(file, bucket);
      if (problem) {
        setError(`${file.name}: ${problem}`);
        return;
      }
      named[key] = fileNameError(file, bucket, label.trim(), categoryName)
        ? renameFile(file, expectedFileName(label.trim(), categoryName), bucket)
        : file;
    }
    setSaving(true);
    const saved = await onSubmit({ kind, label: label.trim(), categoryId, description: description.trim(), files: named });
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
                  setAutoLabel(false);
                  setError("");
                }}
              />
            </div>
            <div>
              <Label htmlFor="card-category">Category</Label>
              <Select id="card-category" className={fieldClass} value={categoryId} onChange={(event) => {
                  setCategoryId(event.target.value);
                  setAutoCategory(false);
                }}>
                <option value="">Pick a category</option>
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
            hint={`Saved as ${example}. PNG, JPG, or WebP, up to ${limitLabel("symbol-images")}`}
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
            hint={`Saved as ${example}. MP3, WAV, or M4A, up to ${limitLabel("audio-files")}`}
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

    </form>
  );
}
