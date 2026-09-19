"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, Lock, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/features/admin/admin-shared";
import { CardImage } from "@/features/content/content-media";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { CategoryPills, PopupTitle, fieldClass, glassBoxClass, kindMeta, kindTone, type ContentKind } from "@/features/content/content-shared";
import { LessonMeta, LessonPreviewBody } from "@/features/content/lesson-preview-dialog";
import type { Category, LearningItem, Lesson } from "@/types";

export type LessonFormMode =
  | { kind: "new" }
  | { kind: "edit"; lesson: Lesson }
  | { kind: "draft"; draft: Omit<Lesson, "id" | "createdBy"> }
  /** "Make a copy" of a lesson the teacher cannot edit. `title` is already unique. */
  | { kind: "copy"; source: Lesson; title: string };

export type LessonFormValues = {
  title: string;
  objective: string;
  /** Not shown in the form any more (lessons are title and goal). Kept so older lessons save unchanged. */
  instructions: string;
  itemIds: string[];
  /** Chosen when the lesson is made. Editing keeps the saved value. */
  isPrivate: boolean;
};

const stepLabels = ["Details", "Materials", "Review"];

function formTitle(mode: LessonFormMode | null) {
  if (mode?.kind === "edit") return "Edit lesson";
  if (mode?.kind === "draft") return "Review generated lesson";
  if (mode?.kind === "copy") return "Make a copy";
  return "New lesson";
}

export function LessonFormDialog({
  mode,
  items,
  categories,
  takenTitles,
  onClose,
  onSave
}: {
  mode: LessonFormMode | null;
  items: LearningItem[];
  categories: Category[];
  /** Names of the other lessons this teacher can see. A new name must not match one. */
  takenTitles: string[];
  onClose: () => void;
  /** Resolves true when saved. */
  onSave: (mode: LessonFormMode, values: LessonFormValues) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);
  const title = formTitle(mode);

  return (
    <Dialog open={Boolean(mode)} onClose={saving ? () => undefined : onClose} title={title} className="max-w-3xl" hideHeader>
      {mode ? (
        <LessonForm
          title={title}
          mode={mode}
          items={items}
          categories={categories}
          takenTitles={takenTitles}
          saving={saving}
          onClose={onClose}
          onSave={async (values) => {
            setSaving(true);
            const saved = await onSave(mode, values);
            setSaving(false);
            if (saved) onClose();
          }}
        />
      ) : null}
    </Dialog>
  );
}

function initialValues(mode: LessonFormMode): LessonFormValues {
  if (mode.kind === "new") {
    return { title: "", objective: "", instructions: "", itemIds: [], isPrivate: false };
  }
  const source = mode.kind === "edit" ? mode.lesson : mode.kind === "copy" ? mode.source : mode.draft;
  return {
    title: mode.kind === "copy" ? mode.title : source.title,
    objective: source.objective,
    instructions: source.instructions,
    itemIds: source.learningItemIds,
    isPrivate: mode.kind === "edit" ? mode.lesson.visibility === "private" : false
  };
}

function LessonForm({
  title,
  mode,
  items,
  categories,
  takenTitles,
  saving,
  onClose,
  onSave
}: {
  title: string;
  mode: LessonFormMode;
  items: LearningItem[];
  categories: Category[];
  takenTitles: string[];
  saving: boolean;
  onClose: () => void;
  onSave: (values: LessonFormValues) => void;
}) {
  const [values, setValues] = useState<LessonFormValues>(() => initialValues(mode));
  // Generated drafts are already filled in, so they open on Review.
  const [step, setStep] = useState(mode.kind === "draft" ? 2 : 0);
  const [error, setError] = useState("");

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const selectedItems = values.itemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
  const taken = useMemo(() => new Set(takenTitles.map((name) => name.trim().toLowerCase())), [takenTitles]);

  function update(patch: Partial<LessonFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setError("");
  }

  function validate(target: number) {
    if (target >= 1 && (!values.title.trim() || !values.objective.trim())) {
      setStep(0);
      setError("Add a title and a goal.");
      return false;
    }
    if (target >= 1 && taken.has(values.title.trim().toLowerCase())) {
      setStep(0);
      setError("A lesson with this name already exists. Pick another name.");
      return false;
    }
    if (target >= 2 && !selectedItems.length) {
      setStep(1);
      setError("Pick at least one material.");
      return false;
    }
    return true;
  }

  function goTo(target: number) {
    if (target > step && !validate(target)) return;
    setError("");
    setStep(target);
  }

  function submit() {
    if (!validate(2)) return;
    onSave({ ...values, title: values.title.trim(), objective: values.objective.trim(), instructions: values.instructions.trim() });
  }

  const source: Lesson["source"] = mode.kind === "draft" ? "auto-generated" : mode.kind === "edit" ? mode.lesson.source : "manual";

  return (
    <div>
      <PopupTitle title={title} className="mb-4" />
      {mode.kind === "copy" ? (
        <p className="-mt-2 mb-4 flex items-start gap-2 rounded-xl bg-blue-50/80 p-2.5 text-xs text-slate-600 ring-1 ring-blue-100">
          <Copy className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Your own copy of {mode.source.title}.</span> The original stays as it is.
          </span>
        </p>
      ) : null}
      <Stepper step={step} onStep={goTo} />

      <div className="mt-5 min-h-[22rem]">
        {step === 0 ? (
          <div className={cn("space-y-4 p-4", glassBoxClass)}>
            <div>
              <Label htmlFor="lesson-title">Title</Label>
              <Input id="lesson-title" className={fieldClass} value={values.title} onChange={(event) => update({ title: event.target.value })} placeholder="Snack time requests" />
            </div>
            <div>
              <Label htmlFor="lesson-goal">Goal</Label>
              <Input
                id="lesson-goal"
                className={fieldClass}
                value={values.objective}
                onChange={(event) => update({ objective: event.target.value })}
                placeholder="What should the learner be able to do?"
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? <MaterialsStep items={items} categories={categories} selectedIds={values.itemIds} onChange={(itemIds) => update({ itemIds })} /> : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-bold text-ink">{values.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{values.objective}</p>
              <div className="mt-2">
                <LessonMeta lesson={{ source }} />
              </div>
            </div>
            <LessonPreviewBody items={selectedItems} />
            <VisibilityControl editing={mode.kind === "edit"} isPrivate={values.isPrivate} onChange={(isPrivate) => update({ isPrivate })} />
          </div>
        ) : null}
      </div>

      <FieldError message={error} />

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        {step === 0 ? (
          <Button type="button" variant="ghost" className="mr-auto" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="ghost" className="mr-auto" onClick={() => goTo(step - 1)} disabled={saving}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </Button>
        )}
        {step === 1 ? <span className="text-sm font-semibold text-slate-500">{selectedItems.length} selected</span> : null}
        {step < 2 ? (
          <Button type="button" onClick={() => goTo(step + 1)}>
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={saving}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {saving ? "Saving..." : mode.kind === "edit" ? "Save changes" : "Save lesson"}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Shared or private is picked when a lesson is made; afterwards it is only shown. */
export function VisibilityControl({ editing, isPrivate, onChange }: { editing: boolean; isPrivate: boolean; onChange: (isPrivate: boolean) => void }) {
  if (editing) {
    const Icon = isPrivate ? Lock : Users;
    return (
      <p className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 text-sm text-slate-600 ring-1 ring-blue-100">
        <Icon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
        <span>
          <span className="font-semibold text-ink">{isPrivate ? "Private to you." : "Shared with teachers."}</span> Set when it was made.
        </span>
      </p>
    );
  }

  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-white/80 p-2.5 ring-1 ring-blue-100">
      <input
        type="checkbox"
        checked={isPrivate}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-blue-200 text-blue-600"
      />
      <span>
        <span className="block text-sm font-semibold text-ink">Private to me</span>
        {isPrivate ? <span className="block text-xs text-slate-500">Only you can see it.</span> : null}
      </span>
    </label>
  );
}

function Stepper({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  return (
    <ol className="flex items-center gap-2">
      {stepLabels.map((label, index) => {
        const done = index < step;
        const current = index === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <button
              type="button"
              onClick={() => onStep(index)}
              aria-current={current ? "step" : undefined}
              className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition",
                  current ? "bg-blue-600 text-white" : done ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn("text-sm font-semibold", current ? "text-ink" : "text-slate-400")}>{label}</span>
            </button>
            {index < stepLabels.length - 1 ? <span className={cn("h-0.5 flex-1 rounded-full", done ? "bg-blue-200" : "bg-slate-100")} /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Card picker with type tabs, category pills, and search. Also used by the activity creator. */
export function MaterialsStep({
  items,
  categories,
  selectedIds,
  onChange,
  kinds = ["pecs", "gesture"],
  max,
  emptyText = "Nothing matches."
}: {
  items: LearningItem[];
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Material types offered. One type hides the tabs. */
  kinds?: ContentKind[];
  /** Most cards that can be picked. */
  max?: number;
  emptyText?: string;
}) {
  const [kind, setKind] = useState<ContentKind>(() => {
    const first = items.find((item) => item.id === selectedIds[0])?.contentType;
    return first && kinds.includes(first) ? first : kinds[0];
  });
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");

  const kindItems = items.filter((item) => item.contentType === kind);
  const used = new Set(kindItems.map((item) => item.categoryId));
  const usedCategories = categories.filter((category) => used.has(category.id));
  const query = search.trim().toLowerCase();
  const visible = kindItems.filter((item) => (categoryId === "all" || item.categoryId === categoryId) && (!query || item.label.toLowerCase().includes(query)));
  const selectedItems = selectedIds.map((id) => items.find((item) => item.id === id)).filter((item): item is LearningItem => Boolean(item));
  const tone = kindTone(kind);

  const full = max !== undefined && selectedIds.length >= max;

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((value) => value !== id));
      return;
    }
    if (full) return;
    onChange([...selectedIds, id]);
  }

  return (
    <div className="space-y-3">
      {kinds.length > 1 ? (
        <UnderlineTabs
          id="lesson-material-type"
          label="Material type"
          value={kind}
          onChange={(option) => {
            setKind(option);
            setCategoryId("all");
          }}
          options={kinds.map((option) => ({ value: option, label: kindMeta[option].plural, icon: kindMeta[option].icon }))}
        />
      ) : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          {usedCategories.length > 1 ? <CategoryPills categories={usedCategories} value={categoryId} onChange={setCategoryId} /> : null}
        </div>
        <SearchInput label="Search materials" placeholder="Search" value={search} onChange={setSearch} />
      </div>

      <div className={cn("grid max-h-[16rem] grid-cols-3 gap-2 overflow-y-auto rounded-2xl p-2 clean-scrollbar sm:grid-cols-4 md:grid-cols-6", tone.soft)}>
        {visible.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              disabled={!selected && full}
              onClick={() => toggle(item.id)}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#fff] p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40",
                selected ? "border-blue-600 shadow-sm" : "border-transparent hover:border-blue-200"
              )}
            >
              <span className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-slate-50">
                <CardImage value={item.symbolImageUrl} label={item.label} className="text-xs" />
              </span>
              <span className="mt-1 truncate text-xs font-semibold text-ink">{item.label}</span>
              {selected ? (
                <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
              ) : null}
            </button>
          );
        })}
        {!visible.length ? <p className="col-span-full py-8 text-center text-sm text-slate-500">{emptyText}</p> : null}
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-1.5">
        {selectedItems.length ? (
          selectedItems.map((item) => (
            <span key={item.id} className={cn("inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-semibold", kindTone(item.contentType).badge)}>
              {item.label}
              <button type="button" onClick={() => toggle(item.id)} aria-label={`Remove ${item.label}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/60">
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">Nothing picked yet.</span>
        )}
      </div>
    </div>
  );
}
