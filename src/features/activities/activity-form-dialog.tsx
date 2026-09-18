"use client";

import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Hand, Link2, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { cn } from "@/lib/utils";
import { activityTypeLabels } from "@/utils/activity-labels";
import { buildActivityTitle, canDraftQuestionPrompts, type ActivityDraftResult } from "@/utils/activity-ai-draft";
import { ActivitySample } from "@/features/content/activity-sample";
import { CardImage } from "@/features/content/content-media";
import { PopupTitle, SectionLabel, fieldClass, glassBoxClass } from "@/features/content/content-shared";
import { MaterialsStep } from "@/features/content/lesson-form-dialog";
import { GuideTip } from "@/features/guide/guide-tip";
import {
  MAX_ACTIVITY_LEARNING_ITEMS,
  activityTypeDescriptions,
  activityTypeTones,
  activityTypes,
  canUseItem,
  getActivityTypeDraftText,
  getPromptStoreKey,
  getSavedQuestionPrompt,
  validatePromptForActivity,
  type ActivityPromptStore
} from "@/features/activities/activity-helpers";
import type { Activity, ActivityType, Category, LearningItem, Lesson } from "@/types";

export type ActivityFormMode = { kind: "new" } | { kind: "edit"; activity: Activity };

export type ActivityFormValues = {
  title: string;
  type: ActivityType;
  itemIds: string[];
  /** Question text per card, keyed by `getPromptStoreKey(type, itemId)`. */
  promptInputs: Record<string, string>;
  isPrivate: boolean;
};

const stepLabels = ["Type", "Cards", "Review"];

export function ActivityFormDialog({
  mode,
  items,
  categories,
  promptStore,
  lessonOfActivity,
  onPromptStoreChange,
  onClose,
  onSave
}: {
  mode: ActivityFormMode | null;
  items: LearningItem[];
  categories: Category[];
  promptStore: ActivityPromptStore;
  /** The lesson an edited activity belongs to. Its cards are then locked to the lesson's. */
  lessonOfActivity?: Lesson;
  onPromptStoreChange: (patch: ActivityPromptStore) => void;
  onClose: () => void;
  /** Resolves true when saved. */
  onSave: (mode: ActivityFormMode, values: ActivityFormValues) => Promise<boolean>;
}) {
  const [saving, setSaving] = useState(false);
  const title = mode?.kind === "edit" ? "Edit activity" : "Create activity";

  return (
    <Dialog open={Boolean(mode)} onClose={saving ? () => undefined : onClose} title={title} className="max-w-3xl" hideHeader>
      {mode ? (
        <ActivityForm
          key={mode.kind === "edit" ? mode.activity.id : "new"}
          title={title}
          mode={mode}
          items={items}
          categories={categories}
          promptStore={promptStore}
          lessonOfActivity={lessonOfActivity}
          onPromptStoreChange={onPromptStoreChange}
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

function initialValues(mode: ActivityFormMode, cardsLocked: boolean): ActivityFormValues {
  if (mode.kind === "new") {
    return { title: "", type: "match-word-symbol", itemIds: [], promptInputs: {}, isPrivate: false };
  }
  const { activity } = mode;
  return {
    title: activity.title,
    type: activity.type,
    // A lesson's activity keeps every lesson card; the five-card limit is for activities made here.
    itemIds: cardsLocked ? activity.learningItemIds : activity.learningItemIds.slice(0, MAX_ACTIVITY_LEARNING_ITEMS),
    promptInputs: Object.fromEntries(activity.questions.map((question) => [getPromptStoreKey(activity.type, question.learningItemId), question.prompt])),
    isPrivate: activity.visibility === "private"
  };
}

function ActivityForm({
  title,
  mode,
  items,
  categories,
  promptStore,
  lessonOfActivity,
  onPromptStoreChange,
  saving,
  onClose,
  onSave
}: {
  title: string;
  mode: ActivityFormMode;
  items: LearningItem[];
  categories: Category[];
  promptStore: ActivityPromptStore;
  lessonOfActivity?: Lesson;
  onPromptStoreChange: (patch: ActivityPromptStore) => void;
  saving: boolean;
  onClose: () => void;
  onSave: (values: ActivityFormValues) => void;
}) {
  const { notify } = useToast();
  const [values, setValues] = useState<ActivityFormValues>(() => initialValues(mode, Boolean(lessonOfActivity)));
  const [step, setStep] = useState(mode.kind === "edit" ? 2 : 0);
  const [error, setError] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [drafting, setDrafting] = useState(false);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const selectedItems = values.itemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
  const usableItems = useMemo(() => items.filter((item) => canUseItem(values.type, item)), [items, values.type]);
  // A lesson's activity keeps the lesson's cards, so only formats every card can use are offered.
  const cardsLocked = Boolean(lessonOfActivity);
  const offeredTypes = cardsLocked
    ? activityTypes.filter((type) => type !== "gesture-practice" && selectedItems.every((item) => canUseItem(type, item)))
    : activityTypes;
  const draftable = canDraftQuestionPrompts(values.type);
  const isGesture = values.type === "gesture-practice";

  // Demo cards: the picked ones, or a few with pictures so the format can be seen before choosing.
  const demoItems = selectedItems.length
    ? selectedItems.filter((item) => item.contentType === "pecs")
    : items.filter((item) => item.contentType === "pecs" && item.symbolImageUrl).slice(0, 3);

  function update(patch: Partial<ActivityFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setError("");
  }

  /** Keeps typed questions, and fills new cards from the saved prompt library. */
  function withPrompts(type: ActivityType, itemIds: string[], current: Record<string, string>) {
    const next: Record<string, string> = {};
    itemIds.forEach((id) => {
      const key = getPromptStoreKey(type, id);
      const item = itemById.get(id);
      next[key] = current[key] ?? (item ? getSavedQuestionPrompt(type, item, promptStore) : undefined) ?? "";
    });
    return next;
  }

  function setItems(itemIds: string[]) {
    const limited = itemIds.slice(0, MAX_ACTIVITY_LEARNING_ITEMS);
    update({ itemIds: limited, promptInputs: withPrompts(values.type, limited, values.promptInputs) });
  }

  function changeType(type: ActivityType) {
    if (cardsLocked) {
      update({ type, promptInputs: withPrompts(type, values.itemIds, {}) });
      setAiNote("");
      return;
    }
    const kept = values.itemIds.filter((id) => {
      const item = itemById.get(id);
      return item ? canUseItem(type, item) : false;
    });
    update({ type, itemIds: kept, promptInputs: withPrompts(type, kept, {}) });
    setAiNote("");
  }

  function validate(target: number) {
    if (target >= 2) {
      if (!selectedItems.length) {
        setStep(1);
        setError(isGesture ? "Pick at least one gesture." : "Pick at least one card.");
        return false;
      }
      if (selectedItems.some((item) => !canUseItem(values.type, item))) {
        setStep(1);
        setError("Every card in this format needs a picture.");
        return false;
      }
    }
    return true;
  }

  function goTo(target: number) {
    if (target > step && !validate(target)) return;
    if (target === 2 && !values.title.trim() && selectedItems.length) {
      update({ title: buildActivityTitle(values.type, selectedItems) });
    }
    setError("");
    setStep(target);
  }

  function submit() {
    if (!validate(2)) return;
    if (draftable) {
      const invalid = selectedItems.find((item) => {
        const prompt = values.promptInputs[getPromptStoreKey(values.type, item.id)]?.trim() ?? "";
        return !prompt || Boolean(validatePromptForActivity(values.type, item, prompt));
      });
      if (invalid) {
        const prompt = values.promptInputs[getPromptStoreKey(values.type, invalid.id)]?.trim() ?? "";
        setError(`${invalid.label}: ${prompt ? validatePromptForActivity(values.type, invalid, prompt) : "Add a question, or use Draft with AI."}`);
        return;
      }
    }
    const name = values.title.trim() || buildActivityTitle(values.type, selectedItems);
    onSave({ ...values, title: name });
  }

  async function draftWithAi(regenerate: boolean) {
    if (!selectedItems.length) {
      setError("Pick at least one card before drafting.");
      return;
    }
    const missing = regenerate
      ? selectedItems.map((item) => item.id)
      : selectedItems.filter((item) => !values.promptInputs[getPromptStoreKey(values.type, item.id)]?.trim()).map((item) => item.id);
    if (!missing.length) {
      setAiNote("Each card already has a question.");
      return;
    }

    setDrafting(true);
    setAiNote("");
    setError("");
    try {
      const response = await fetch("/api/activity-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType: values.type, learningItems: selectedItems, missingLearningItemIds: missing, regenerate })
      });
      if (!response.ok) throw new Error("Activity draft request failed.");
      const draft = (await response.json()) as ActivityDraftResult;
      if (draft.suggestions.length) {
        const patch = Object.fromEntries(draft.suggestions.map((suggestion) => [getPromptStoreKey(values.type, suggestion.learningItemId), suggestion.prompt]));
        setValues((current) => ({ ...current, promptInputs: { ...current.promptInputs, ...patch } }));
        onPromptStoreChange(patch);
      }
      setAiNote(draft.note || "Draft with AI finished.");
      notify({
        title:
          draft.source === "hugging-face"
            ? "AI prompts ready"
            : draft.source === "cache"
              ? "Saved AI draft used"
              : draft.source === "rate-limited"
                ? "AI limit reached"
                : "Starter prompts added",
        description: draft.note || "Questions were added for the selected cards.",
        tone: draft.source === "hugging-face" || draft.source === "cache" ? "success" : "info"
      });
    } catch {
      setAiNote("Could not draft with AI. Type the questions below.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div>
      <PopupTitle title={title} className="mb-4" />
      {lessonOfActivity ? (
        <p className="-mt-2 mb-4 flex items-start gap-2 rounded-xl bg-blue-50/80 p-2.5 text-xs text-slate-600 ring-1 ring-blue-100">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">Linked to {lessonOfActivity.title}.</span> Its cards come from the lesson.
          </span>
        </p>
      ) : null}
      <Stepper step={step} onStep={goTo} />

      <div className="mt-5 min-h-[22rem]">
        {step === 0 ? (
          <div className="space-y-4">
            <GuideTip id="activities.types" className="block">
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Activity type">
                {offeredTypes.map((type) => {
                  const selected = values.type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => changeType(type)}
                      className={cn(
                        "rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                        selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-blue-100 bg-white/80 hover:border-blue-300"
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", activityTypeTones[type].dot)} aria-hidden="true" />
                        {type === "gesture-practice" ? <Hand className="h-4 w-4 text-sky-600" aria-hidden="true" /> : null}
                        {activityTypeLabels[type]}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">{activityTypeDescriptions[type]}</span>
                    </button>
                  );
                })}
              </div>
            </GuideTip>
            <div className="rounded-2xl bg-gradient-to-br from-blue-100/70 via-blue-50/70 to-sky-50/80 p-4 ring-1 ring-blue-100">
              <SectionLabel className="mb-2">How it plays</SectionLabel>
              {!isGesture && demoItems.length ? (
                <ActivitySample key={`${values.type}-${demoItems.length}`} type={values.type} items={demoItems} pool={items} />
              ) : (
                <p className="text-sm leading-6 text-slate-700">
                  {isGesture
                    ? "The learner copies each gesture. The teacher marks it done or asks for another try."
                    : "Add PECS cards with pictures in Content to see a demo."}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          cardsLocked ? (
            <div className={cn("space-y-3 p-4", glassBoxClass)}>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Lock className="h-4 w-4 text-blue-600" aria-hidden="true" />
                Change cards in the lesson.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {selectedItems.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-xl border border-blue-100 bg-[#fff] p-1.5">
                    <span className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-slate-50">
                      <CardImage value={item.symbolImageUrl} label={item.label} className="text-xs" />
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-ink">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <MaterialsStep
                key={values.type}
                items={usableItems}
                categories={categories}
                selectedIds={values.itemIds}
                onChange={setItems}
                kinds={[isGesture ? "gesture" : "pecs"]}
                max={MAX_ACTIVITY_LEARNING_ITEMS}
                emptyText={isGesture ? "No gestures yet. Add one in Content." : "No cards with pictures match."}
              />
              <p className="text-xs text-slate-500">
                Up to {MAX_ACTIVITY_LEARNING_ITEMS} cards.{!isGesture && values.type !== "fill-blank" && values.type !== "simple-quiz" ? " Only cards with pictures are shown." : ""}
              </p>
            </div>
          )
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className={cn("grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-end", glassBoxClass)}>
              <div>
                <Label htmlFor="activity-title">Name</Label>
                <Input id="activity-title" className={fieldClass} value={values.title} onChange={(event) => update({ title: event.target.value })} placeholder="Match greetings" />
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl bg-white/80 px-3 ring-1 ring-blue-100">
                <input
                  type="checkbox"
                  checked={values.isPrivate}
                  onChange={(event) => update({ isPrivate: event.target.checked })}
                  className="h-4 w-4 rounded border-blue-200 text-blue-600"
                />
                <span className="text-sm font-semibold text-ink">Private to me</span>
              </label>
            </div>

            <div className={cn("space-y-3 p-4", glassBoxClass)}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <SectionLabel>{draftable ? (values.type === "fill-blank" ? "Sentences" : "Questions") : "Cards"}</SectionLabel>
                {draftable ? (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => draftWithAi(false)} disabled={drafting}>
                      {drafting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                      {drafting ? "Drafting..." : "Draft with AI"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => draftWithAi(true)} disabled={drafting}>
                      New version
                    </Button>
                  </div>
                ) : null}
              </div>
              {draftable ? (
                <>
                  <p className="text-xs text-slate-500">
                    {values.type === "fill-blank" ? "One sentence per card. Use ____ for the missing word." : "One short question per card."}
                  </p>
                  {selectedItems.map((item) => {
                    const key = getPromptStoreKey(values.type, item.id);
                    const value = values.promptInputs[key] ?? "";
                    return (
                      <div key={key}>
                        <Label htmlFor={`activity-prompt-${item.id}`}>{item.label}</Label>
                        <Input
                          id={`activity-prompt-${item.id}`}
                          className={fieldClass}
                          value={value}
                          onChange={(event) => update({ promptInputs: { ...values.promptInputs, [key]: event.target.value } })}
                          placeholder={values.type === "fill-blank" ? "My ____ is here." : "Which card shows family?"}
                        />
                        <FieldError message={validatePromptForActivity(values.type, item, value)} />
                      </div>
                    );
                  })}
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500">{getActivityTypeDraftText(values.type)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItems.map((item) => (
                      <span key={item.id} className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                        {item.label}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {aiNote ? <p className="text-xs font-semibold text-blue-700">{aiNote}</p> : null}
            </div>
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
        {step === 1 ? <span className="text-sm font-semibold text-slate-500">{selectedItems.length} of {MAX_ACTIVITY_LEARNING_ITEMS}</span> : null}
        {step < 2 ? (
          <Button type="button" onClick={() => goTo(step + 1)}>
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={saving || drafting}>
            <Check className="h-4 w-4" aria-hidden="true" />
            {saving ? "Saving..." : mode.kind === "edit" ? "Save changes" : "Create activity"}
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
