"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { getActivityTypeLabel } from "@/utils/activity-labels";
import { SearchInput } from "@/features/admin/admin-shared";
import { CardImage } from "@/features/content/content-media";
import { CategoryChips, kindMeta, splitSteps, type ContentKind } from "@/features/content/content-shared";
import { SourceBadge } from "@/features/content/lesson-card";
import { LessonPreviewBody } from "@/features/content/lesson-preview-dialog";
import type { ActivityType, Category, LearningItem, Lesson } from "@/types";

export type LessonFormMode =
  | { kind: "new" }
  | { kind: "edit"; lesson: Lesson }
  | { kind: "draft"; draft: Omit<Lesson, "id" | "createdBy"> };

export type LessonFormValues = {
  title: string;
  objective: string;
  steps: string[];
  itemIds: string[];
  activityType: ActivityType;
};

export const pecsActivityTypes: ActivityType[] = ["match-word-symbol", "choose-correct-symbol", "fill-blank", "drag-drop-symbol"];

const defaultSteps = ["Show each card.", "Model the word and sign.", "Practise together.", "Review the learner's answers."];
const stepLabels = ["Details", "Cards", "Review"];

export function LessonFormDialog({
  mode,
  items,
  categories,
  onClose,
  onSave
}: {
  mode: LessonFormMode | null;
  items: LearningItem[];
  categories: Category[];
  onClose: () => void;
  /** Resolves true when saved. */
  onSave: (mode: LessonFormMode, values: LessonFormValues) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);
  const title = mode?.kind === "edit" ? "Edit lesson" : mode?.kind === "draft" ? "Review generated lesson" : "New lesson";

  return (
    <Dialog open={Boolean(mode)} onClose={saving ? () => undefined : onClose} title={title} className="max-w-3xl">
      {mode ? (
        <LessonForm
          // Remount per opening so every lesson starts from its own values.
          key={mode.kind === "edit" ? mode.lesson.id : mode.kind === "draft" ? `draft-${mode.draft.title}` : "new"}
          mode={mode}
          items={items}
          categories={categories}
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
    return { title: "", objective: "", steps: defaultSteps, itemIds: [], activityType: "choose-correct-symbol" };
  }
  const source = mode.kind === "edit" ? mode.lesson : mode.draft;
  return {
    title: source.title,
    objective: source.objective,
    steps: splitSteps(source.instructions).length ? splitSteps(source.instructions) : [""],
    itemIds: source.learningItemIds,
    activityType: source.activityType === "gesture-practice" ? "choose-correct-symbol" : source.activityType
  };
}

function LessonForm({
  mode,
  items,
  categories,
  saving,
  onClose,
  onSave
}: {
  mode: LessonFormMode;
  items: LearningItem[];
  categories: Category[];
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
  const hasPecs = selectedItems.some((item) => item.contentType === "pecs");
  const cleanSteps = values.steps.map((line) => line.trim()).filter(Boolean);

  function update(patch: Partial<LessonFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setError("");
  }

  function validate(target: number) {
    if (target >= 1 && (!values.title.trim() || !values.objective.trim() || !cleanSteps.length)) {
      setStep(0);
      setError("Add a title, a goal, and at least one step.");
      return false;
    }
    if (target >= 2 && !selectedItems.length) {
      setStep(1);
      setError("Pick at least one card.");
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
    onSave({ ...values, title: values.title.trim(), objective: values.objective.trim(), steps: cleanSteps });
  }

  return (
    <div>
      <Stepper step={step} onStep={goTo} />

      <div className="mt-5 min-h-[22rem]">
        {step === 0 ? <DetailsStep values={values} update={update} /> : null}
        {step === 1 ? <CardsStep items={items} categories={categories} selectedIds={values.itemIds} onChange={(itemIds) => update({ itemIds })} /> : null}
        {step === 2 ? (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={mode.kind === "draft" ? "auto-generated" : mode.kind === "edit" ? mode.lesson.source : "manual"} />
              </div>
              <p className="mt-2 text-xl font-bold text-ink">{values.title}</p>
            </div>
            {hasPecs ? (
              <div className="rounded-2xl border border-blue-100 bg-[#fff] p-4">
                <Label htmlFor="lesson-practice">Practice for PECS cards</Label>
                <Select id="lesson-practice" value={values.activityType} onChange={(event) => update({ activityType: event.target.value as ActivityType })}>
                  {pecsActivityTypes.map((type) => (
                    <option key={type} value={type}>
                      {getActivityTypeLabel(type)}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-slate-500">
                  {mode.kind === "edit" ? "Changes also update the lesson's activity." : "Saving also creates this activity."}
                </p>
              </div>
            ) : null}
            <LessonPreviewBody
              objective={values.objective}
              steps={cleanSteps}
              items={selectedItems}
              activityType={hasPecs ? values.activityType : "gesture-practice"}
            />
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

function DetailsStep({ values, update }: { values: LessonFormValues; update: (patch: Partial<LessonFormValues>) => void }) {
  function setStepText(index: number, text: string) {
    update({ steps: values.steps.map((line, position) => (position === index ? text : line)) });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="lesson-title">Title</Label>
        <Input id="lesson-title" value={values.title} onChange={(event) => update({ title: event.target.value })} placeholder="Snack time requests" />
      </div>
      <div>
        <Label htmlFor="lesson-goal">Goal</Label>
        <Textarea
          id="lesson-goal"
          value={values.objective}
          onChange={(event) => update({ objective: event.target.value })}
          placeholder="What should the learner be able to do?"
          className="min-h-20"
        />
      </div>
      <div>
        <Label>Steps</Label>
        <ol className="mt-1 space-y-2">
          {values.steps.map((line, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{index + 1}</span>
              <Input
                aria-label={`Step ${index + 1}`}
                value={line}
                onChange={(event) => setStepText(index, event.target.value)}
                placeholder="Describe this step"
              />
              <button
                type="button"
                onClick={() => update({ steps: values.steps.filter((_, position) => position !== index) })}
                disabled={values.steps.length <= 1}
                aria-label={`Remove step ${index + 1}`}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        <Button type="button" variant="ghost" size="sm" className="mt-2 text-blue-700" onClick={() => update({ steps: [...values.steps, ""] })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add step
        </Button>
      </div>
    </div>
  );
}

function CardsStep({
  items,
  categories,
  selectedIds,
  onChange
}: {
  items: LearningItem[];
  categories: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [kind, setKind] = useState<ContentKind>(() => {
    const first = items.find((item) => item.id === selectedIds[0]);
    return first?.contentType ?? "pecs";
  });
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");

  const kindItems = items.filter((item) => item.contentType === kind);
  const used = new Set(kindItems.map((item) => item.categoryId));
  const usedCategories = categories.filter((category) => used.has(category.id));
  const query = search.trim().toLowerCase();
  const visible = kindItems.filter(
    (item) => (categoryId === "all" || item.categoryId === categoryId) && (!query || item.label.toLowerCase().includes(query))
  );
  const selectedItems = selectedIds.map((id) => items.find((item) => item.id === id)).filter((item): item is LearningItem => Boolean(item));

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((value) => value !== id) : [...selectedIds, id]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Card type"
          value={kind}
          onChange={(next) => {
            setKind(next);
            setCategoryId("all");
          }}
          options={[
            { value: "pecs", label: kindMeta.pecs.plural },
            { value: "gesture", label: kindMeta.gesture.plural }
          ]}
        />
        <SearchInput label="Search cards" placeholder="Search cards" value={search} onChange={setSearch} />
      </div>
      {usedCategories.length > 1 ? <CategoryChips categories={usedCategories} value={categoryId} onChange={setCategoryId} /> : null}

      <div className="grid max-h-[18rem] grid-cols-3 gap-2 overflow-y-auto rounded-2xl bg-[#f8fbff] p-2 clean-scrollbar sm:grid-cols-4 md:grid-cols-6">
        {visible.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(item.id)}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border-2 bg-[#fff] p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                selected ? "border-blue-600 shadow-sm" : "border-transparent hover:border-blue-200"
              )}
            >
              <span className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-[#f8fbff]">
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
        {!visible.length ? <p className="col-span-full py-8 text-center text-sm text-slate-500">No cards match.</p> : null}
      </div>

      <div className="flex min-h-9 flex-wrap items-center gap-1.5">
        {selectedItems.length ? (
          selectedItems.map((item) => (
            <span key={item.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-blue-700">
              {item.label}
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-label={`Remove ${item.label}`}
                className="grid h-5 w-5 place-items-center rounded-full hover:bg-blue-100"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400">No cards picked yet.</span>
        )}
      </div>
    </div>
  );
}
