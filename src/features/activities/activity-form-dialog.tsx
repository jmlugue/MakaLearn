"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Layers, Loader2, Lock, LockOpen, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { cn } from "@/lib/utils";
import { activityTypeLabels } from "@/utils/activity-labels";
import {
  canDraftQuestionPrompts,
  selectActivityPromptDraftTargets,
  type ActivityDraftResult,
  type ActivityPromptIssue
} from "@/utils/activity-ai-draft";
import { buildDefaultActivityTitle } from "@/utils/activity-title";
import { SearchInput } from "@/features/admin/admin-shared";
import { HowItPlaysButton } from "@/features/content/activity-sample";
import { CardImage } from "@/features/content/content-media";
import { PopupTitle, SectionLabel, fieldClass, glassBoxClass } from "@/features/content/content-shared";
import { MaterialsStep } from "@/features/content/lesson-form-dialog";
import { GuideTip } from "@/features/guide/guide-tip";
import {
  MAX_ACTIVITY_LEARNING_ITEMS,
  activityTypeTones,
  activityTypes,
  canUseItem,
  getPromptStoreKey,
  getSavedQuestionPrompt,
  validatePromptForActivity,
  type ActivityPromptStore
} from "@/features/activities/activity-helpers";
import { ActivityTypeBadge, activityTypeIcons } from "@/features/activities/activity-type-badge";
import type { Activity, ActivityType, Category, LearningItem, Lesson } from "@/types";

export type ActivityFormMode = { kind: "new" } | { kind: "edit"; activity: Activity };

export type ActivityFormValues = {
  title: string;
  type: ActivityType;
  itemIds: string[];
  /** Question text per card, keyed by `getPromptStoreKey(type, itemId)`. */
  promptInputs: Record<string, string>;
  /** Chosen when the activity is made. Editing keeps the saved value. */
  isPrivate: boolean;
  /** The lesson this activity belongs to. Set when creating; an activity cannot move lessons later. */
  lessonId?: string;
};

const stepLabels = ["Format", "Cards", "Review"];

export function ActivityFormDialog({
  mode,
  items,
  categories,
  lessons,
  promptStore,
  lessonOfActivity,
  onPromptStoreChange,
  onClose,
  onSave
}: {
  mode: ActivityFormMode | null;
  items: LearningItem[];
  categories: Category[];
  /** Lessons the teacher can see, offered under "From a lesson". */
  lessons: Lesson[];
  promptStore: ActivityPromptStore;
  /** The lesson an edited activity belongs to. Its cards then come from that lesson. */
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
          lessons={lessons}
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

function initialValues(mode: ActivityFormMode, lessonOfActivity?: Lesson): ActivityFormValues {
  if (mode.kind === "new") {
    return { title: "", type: "match-word-symbol", itemIds: [], promptInputs: {}, isPrivate: false };
  }
  const { activity } = mode;
  return {
    title: activity.title,
    type: activity.type,
    itemIds: activity.learningItemIds.slice(0, MAX_ACTIVITY_LEARNING_ITEMS),
    promptInputs: Object.fromEntries(activity.questions.map((question) => [getPromptStoreKey(activity.type, question.learningItemId), question.prompt])),
    isPrivate: activity.visibility === "private",
    lessonId: lessonOfActivity?.id
  };
}

function ActivityForm({
  title,
  mode,
  items,
  categories,
  lessons,
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
  lessons: Lesson[];
  promptStore: ActivityPromptStore;
  lessonOfActivity?: Lesson;
  onPromptStoreChange: (patch: ActivityPromptStore) => void;
  saving: boolean;
  onClose: () => void;
  onSave: (values: ActivityFormValues) => void;
}) {
  const { notify } = useToast();
  const [values, setValues] = useState<ActivityFormValues>(() => initialValues(mode, lessonOfActivity));
  // Editing normally starts with changing the selected cards. Opening on Review made Back → Cards → Next
  // look like a loop because Next returned to the same screen that first appeared after pressing Edit.
  const [step, setStep] = useState(mode.kind === "edit" ? 1 : 0);
  const [source, setSource] = useState<"own" | "lesson">(lessonOfActivity ? "lesson" : "own");
  const [error, setError] = useState("");
  const [aiNote, setAiNote] = useState("");
  const [aiIssuesByItem, setAiIssuesByItem] = useState<Record<string, ActivityPromptIssue>>({});
  const [lockedPromptItemIds, setLockedPromptItemIds] = useState<Set<string>>(() => new Set());
  const [drafting, setDrafting] = useState(false);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);
  const selectedItems = values.itemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
  const lesson = values.lessonId ? lessonOfActivity ?? lessons.find((candidate) => candidate.id === values.lessonId) : undefined;
  // From a lesson: only that lesson's cards can be picked.
  const lessonCardIds = useMemo(() => (lesson ? new Set(lesson.learningItemIds) : null), [lesson]);
  const usableItems = useMemo(
    () => items.filter((item) => canUseItem(values.type, item) && (!lessonCardIds || lessonCardIds.has(item.id))),
    [items, lessonCardIds, values.type]
  );
  const draftable = canDraftQuestionPrompts(values.type);

  // Demo cards: the picked ones, else the chosen lesson's cards, else a few with pictures, so the demo shows
  // the real cards whenever it can.
  const demoItems = selectedItems.length
    ? selectedItems.filter((item) => item.contentType === "pecs")
    : usableItems.filter((item) => item.contentType === "pecs" && item.symbolImageUrl).slice(0, 3);

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
      next[key] =
        current[key] ??
        (item ? getSavedQuestionPrompt(type, item, promptStore, categoryNameById.get(item.categoryId)) : undefined) ??
        "";
    });
    return next;
  }

  function setItems(itemIds: string[]) {
    const limited = itemIds.slice(0, MAX_ACTIVITY_LEARNING_ITEMS);
    update({ itemIds: limited, promptInputs: withPrompts(values.type, limited, values.promptInputs) });
  }

  function pickLesson(lessonId: string) {
    const next = lessons.find((candidate) => candidate.id === lessonId);
    const kept = next ? values.itemIds.filter((id) => next.learningItemIds.includes(id)) : values.itemIds;
    update({ lessonId: next?.id, itemIds: kept, promptInputs: withPrompts(values.type, kept, values.promptInputs) });
  }

  function pickSource(next: "own" | "lesson") {
    setSource(next);
    if (next === "own") pickLesson("");
    setError("");
  }

  function changeType(type: ActivityType) {
    const kept = values.itemIds.filter((id) => {
      const item = itemById.get(id);
      return item ? canUseItem(type, item) : false;
    });
    update({ type, itemIds: kept, promptInputs: withPrompts(type, kept, {}) });
    setAiNote("");
    setAiIssuesByItem({});
    setLockedPromptItemIds(new Set());
  }

  function defaultTitle() {
    return buildDefaultActivityTitle(values.type, selectedItems, { lessonTitle: lesson?.title, categories });
  }

  function validate(target: number) {
    if (target >= 1 && mode.kind === "new" && source === "lesson" && !lesson) {
      setStep(0);
      setError("Pick a collection, or untick From a collection.");
      return false;
    }
    if (target >= 2) {
      if (!selectedItems.length) {
        setStep(1);
        setError("Pick at least one card.");
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
      update({ title: defaultTitle() });
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
        setError(`${invalid.label}: ${prompt ? validatePromptForActivity(values.type, invalid, prompt) : "Add a question, or use Inspire me with AI."}`);
        return;
      }
    }
    onSave({ ...values, title: values.title.trim() || defaultTitle() });
  }

  function togglePromptLock(itemId: string) {
    setLockedPromptItemIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function draftWithAi() {
    if (!selectedItems.length) {
      setError("Pick at least one card before drafting.");
      return;
    }
    const promptByItemId = Object.fromEntries(
      selectedItems.map((item) => [item.id, values.promptInputs[getPromptStoreKey(values.type, item.id)] ?? ""])
    );
    const targets = selectActivityPromptDraftTargets(
      selectedItems.map((item) => item.id),
      promptByItemId,
      values.type === "fill-blank" ? lockedPromptItemIds : []
    );
    if (!targets.itemIds.length) {
      setAiIssuesByItem({});
      setError("");
      setAiNote(
        values.type === "fill-blank" && lockedPromptItemIds.size
          ? "All sentences are locked. Unlock one to get a new idea."
          : "The selected materials already have prompts."
      );
      return;
    }

    setDrafting(true);
    setAiNote("");
    setAiIssuesByItem({});
    setError("");
    try {
      const response = await fetch("/api/activity-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityType: values.type,
          learningItems: selectedItems,
          missingLearningItemIds: targets.itemIds,
          currentPromptByItemId: targets.regenerate
            ? Object.fromEntries(targets.itemIds.map((id) => [id, promptByItemId[id] ?? ""]))
            : undefined,
          regenerate: targets.regenerate
        })
      });
      if (!response.ok) throw new Error("Activity draft request failed.");
      const draft = (await response.json()) as ActivityDraftResult;
      if (draft.suggestions.length) {
        const requestedIds = new Set(targets.itemIds);
        const patch = Object.fromEntries(
          draft.suggestions
            .filter((suggestion) => requestedIds.has(suggestion.learningItemId))
            .map((suggestion) => [getPromptStoreKey(values.type, suggestion.learningItemId), suggestion.prompt])
        );
        setValues((current) => ({ ...current, promptInputs: { ...current.promptInputs, ...patch } }));
        onPromptStoreChange(patch);
      }
      setAiIssuesByItem(
        Object.fromEntries(
          (draft.issues ?? [])
            .filter(
              (issue) =>
                issue.code === "needs-teacher-input" && targets.itemIds.includes(issue.learningItemId)
            )
            .map((issue) => [issue.learningItemId, issue])
        )
      );
      const allRequestedReady =
        draft.source !== "rate-limited" &&
        targets.itemIds.every((id) =>
          draft.suggestions.some((suggestion) => suggestion.learningItemId === id)
        );
      const readyNote = values.type === "fill-blank"
        ? "Sentences ready. Check them before saving."
        : "Questions ready. Check them before saving.";
      setAiNote(allRequestedReady ? readyNote : draft.note || readyNote);
      notify({
        title:
          allRequestedReady
            ? values.type === "fill-blank"
              ? "AI sentences ready"
              : "AI prompts ready"
            : draft.source === "gemini"
              ? "AI prompts ready"
            : draft.source === "cache"
              ? "Saved AI draft used"
              : draft.source === "mixed"
                ? "AI draft checked"
              : draft.source === "rate-limited"
                ? draft.rateLimit?.retryAfterSeconds
                  ? "Please wait a moment"
                  : "AI limit reached"
                : "Starter prompts added",
        description: allRequestedReady ? readyNote : draft.note || "Questions were added for the selected cards.",
        tone: allRequestedReady || draft.source === "gemini" || draft.source === "cache" ? "success" : "info"
      });
    } catch {
      setAiNote("Could not get ideas from AI. Type the questions instead.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div>
      <PopupTitle title={title} className="mb-4" />
      <Stepper step={step} onStep={goTo} />

      <div className="mt-5 min-h-[22rem]">
        {step === 0 ? (
          <div className="space-y-4">
            <section className={cn("p-4", glassBoxClass)}>
              <SectionLabel className="mb-3">Activity format</SectionLabel>
              <GuideTip id="activities.types" className="block">
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Activity format">
                  {activityTypes.map((type) => {
                    const selected = values.type === type;
                    const Icon = activityTypeIcons[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => changeType(type)}
                        className={cn(
                          "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-2.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                          selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-blue-100 bg-white/80 hover:border-blue-300"
                        )}
                      >
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", activityTypeTones[type].soft, activityTypeTones[type].text)}>
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-bold leading-tight text-ink">{activityTypeLabels[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </GuideTip>
              <HowItPlaysButton type={values.type} items={demoItems} pool={items} className="mt-3" />
            </section>

            <section className={cn("p-4", glassBoxClass)}>
              {mode.kind === "new" ? (
                <>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={source === "lesson"}
                      onChange={(event) => pickSource(event.target.checked ? "lesson" : "own")}
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-blue-300 accent-blue-600"
                    />
                    <span>
                      <span className="block text-sm font-bold text-ink">From a collection</span>
                      <span className="block text-xs text-slate-600">Use only the cards in one of your collections.</span>
                    </span>
                  </label>
                  {source === "lesson" ? (
                    <LessonPicker lessons={lessons} itemById={itemById} value={values.lessonId} onChange={pickLesson} />
                  ) : null}
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  {lesson ? <BookOpen className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" /> : <Layers className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />}
                  <span className="font-semibold text-ink">{lesson ? `From ${lesson.title}` : "My own cards"}</span>
                  <span>Set when it was made.</span>
                </p>
              )}
            </section>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-3">
            {lesson ? (
              <p className="flex items-center gap-1.5 text-sm text-slate-600">
                <BookOpen className="h-4 w-4 text-blue-600" aria-hidden="true" />
                Cards from <span className="font-semibold text-ink">{lesson.title}</span>
              </p>
            ) : null}
            <MaterialsStep
              key={`${values.type}-${values.lessonId ?? "none"}`}
              items={usableItems}
              categories={categories}
              selectedIds={values.itemIds}
              onChange={setItems}
              kinds={["pecs"]}
              max={MAX_ACTIVITY_LEARNING_ITEMS}
              tray="slots"
              emptyText={lesson ? "This collection has no cards with pictures." : "No cards with pictures match."}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className={cn("space-y-3 p-4", glassBoxClass)}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="activity-title">Name</Label>
                  <Input
                    id="activity-title"
                    className={fieldClass}
                    value={values.title}
                    onChange={(event) => update({ title: event.target.value })}
                    placeholder={selectedItems.length ? defaultTitle() : "Matching activity: Feelings"}
                  />
                </div>
                <PrivateSwitch editing={mode.kind === "edit"} isPrivate={values.isPrivate} onChange={(isPrivate) => update({ isPrivate })} />
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-blue-50 pt-3">
                <ActivityTypeBadge type={values.type} />
                {lesson ? (
                  <span className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-blue-700">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">From {lesson.title}</span>
                  </span>
                ) : null}
                <span className="ml-auto flex items-center gap-1" aria-label={`${selectedItems.length} cards`}>
                  {selectedItems.map((item) => (
                    <span key={item.id} title={item.label} className="relative block h-10 w-8 overflow-hidden rounded-lg border border-blue-100 bg-[#fff] p-0.5">
                      <CardImage value={item.symbolImageUrl} label={item.label} className="p-0 text-xs leading-none" />
                    </span>
                  ))}
                </span>
              </div>
            </div>

            {draftable ? (
              <div className={cn("space-y-3 p-4", glassBoxClass)}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SectionLabel>{values.type === "fill-blank" ? "Sentences" : "Questions"}</SectionLabel>
                  <Button type="button" size="sm" variant="secondary" onClick={draftWithAi} disabled={drafting}>
                    {drafting ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-blue-600" aria-hidden="true" />
                    )}
                    {drafting ? "Thinking..." : "Inspire me with AI"}
                  </Button>
                </div>
                {aiNote ? (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-700" role="status">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    {aiNote}
                  </p>
                ) : null}
                {values.type === "fill-blank" ? (
                  <p className="text-xs text-slate-500">Lock a sentence to keep it when you ask for new ideas.</p>
                ) : null}
                <ul className="space-y-2.5">
                  {selectedItems.map((item) => {
                    const key = getPromptStoreKey(values.type, item.id);
                    const value = values.promptInputs[key] ?? "";
                    return (
                      <li key={key} className="flex items-start gap-3">
                        <span className="relative mt-0.5 block h-14 w-11 shrink-0 overflow-hidden rounded-xl border border-blue-100 bg-[#fff] p-1">
                          <CardImage value={item.symbolImageUrl} label={item.label} className="text-xs" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <label htmlFor={`activity-prompt-${item.id}`} className="text-xs font-semibold text-slate-600">
                            {item.label}
                          </label>
                          <div className="relative mt-0.5">
                            <Input
                              id={`activity-prompt-${item.id}`}
                              className={cn(fieldClass, values.type === "fill-blank" && "pr-12")}
                              value={value}
                              onChange={(event) => {
                                update({ promptInputs: { ...values.promptInputs, [key]: event.target.value } });
                                setAiIssuesByItem((current) => {
                                  const next = { ...current };
                                  delete next[item.id];
                                  return next;
                                });
                              }}
                              placeholder={values.type === "fill-blank" ? "Write a sentence with ____, or use Inspire me with AI" : "A short question"}
                            />
                            {values.type === "fill-blank" ? (
                              <button
                                type="button"
                                aria-pressed={lockedPromptItemIds.has(item.id)}
                              aria-label={`${lockedPromptItemIds.has(item.id) ? "Unlock" : "Lock"} ${item.label} sentence`}
                              title={lockedPromptItemIds.has(item.id) ? "Unlock this sentence" : "Keep this sentence when using AI"}
                              onClick={() => togglePromptLock(item.id)}
                              disabled={!value.trim() && !lockedPromptItemIds.has(item.id)}
                              className={cn(
                                  "absolute right-0.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:text-slate-300",
                                  lockedPromptItemIds.has(item.id)
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                                )}
                              >
                                {lockedPromptItemIds.has(item.id) ? (
                                  <Lock className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                  <LockOpen className="h-4 w-4" aria-hidden="true" />
                                )}
                              </button>
                            ) : null}
                          </div>
                          <FieldError message={validatePromptForActivity(values.type, item, value)} />
                          {aiIssuesByItem[item.id] ? (
                            <p className="mt-1 text-xs font-medium text-amber-700" role="status">
                              {aiIssuesByItem[item.id].message}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
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

/**
 * A dropdown with search. Closed, it shows the chosen lesson (picture, name, card count, tick). Open, a search
 * box sits above the list; picking a lesson closes it. It opens by itself while nothing is chosen.
 */
function LessonPicker({
  lessons,
  itemById,
  value,
  onChange
}: {
  lessons: Lesson[];
  itemById: Map<string, LearningItem>;
  value?: string;
  onChange: (lessonId: string) => void;
}) {
  const [open, setOpen] = useState(!value);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const query = search.trim().toLowerCase();
  const sorted = useMemo(() => [...lessons].sort((a, b) => a.title.localeCompare(b.title)), [lessons]);
  const visible = query ? sorted.filter((lesson) => lesson.title.toLowerCase().includes(query)) : sorted;
  const chosen = lessons.find((lesson) => lesson.id === value);

  useEffect(() => {
    if (!open || !value) return;
    function close(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open, value]);

  function cover(lesson: Lesson) {
    return lesson.learningItemIds.map((id) => itemById.get(id)).find((item) => item?.symbolImageUrl);
  }

  function count(lesson: Lesson) {
    const total = lesson.learningItemIds.filter((id) => itemById.has(id)).length;
    return `${total} ${total === 1 ? "card" : "cards"}`;
  }

  function lessonRow(lesson: Lesson, selected: boolean) {
    const picture = cover(lesson);
    return (
      <>
        <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-blue-100 bg-blue-50 p-1">
          {picture ? <CardImage value={picture.symbolImageUrl} label={picture.label} className="p-0 text-xs leading-none" /> : <BookOpen className="m-auto h-full w-4 text-blue-600" aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{lesson.title}</span>
          <span className="block text-xs text-slate-500">{count(lesson)}</span>
        </span>
        {selected ? (
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-600 text-white">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </>
    );
  }

  return (
    <div ref={rootRef} className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="activity-lesson-list"
        className={cn(
          "flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 bg-[#fff] p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
          chosen ? "border-blue-500 ring-2 ring-blue-100" : "border-blue-100 hover:border-blue-300"
        )}
      >
        {chosen ? (
          lessonRow(chosen, true)
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-3 text-sm font-semibold text-slate-500">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            Pick a collection
          </span>
        )}
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-blue-600 transition", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div id="activity-lesson-list" className="mt-2 rounded-2xl border border-blue-100 bg-[#fff] p-2 shadow-[0_12px_30px_rgba(37,99,235,0.12)]">
          <SearchInput label="Search collections" placeholder="Search collections" value={search} onChange={setSearch} />
          <ul className="clean-scrollbar mt-2 max-h-56 space-y-1 overflow-y-auto" aria-label="Collections">
            {visible.map((lesson) => {
              const selected = lesson.id === value;
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      onChange(lesson.id);
                      setSearch("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                      selected ? "bg-blue-50 ring-1 ring-blue-500" : "hover:bg-blue-50"
                    )}
                  >
                    {lessonRow(lesson, selected)}
                  </button>
                </li>
              );
            })}
            {!visible.length ? (
              <li className="py-6 text-center text-sm text-slate-500">{lessons.length ? "No collections match." : "No collections yet. Make one in Content."}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Private is picked when an activity is made; afterwards it is only shown. */
function PrivateSwitch({ editing, isPrivate, onChange }: { editing: boolean; isPrivate: boolean; onChange: (isPrivate: boolean) => void }) {
  if (editing) {
    const Icon = isPrivate ? Lock : Users;
    return (
      <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-white/80 px-3 text-sm font-semibold text-slate-600 ring-1 ring-blue-100">
        <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
        {isPrivate ? "Private" : "Shared"}
      </span>
    );
  }

  return (
    <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-white/80 px-3 ring-1 ring-blue-100">
      <Lock className="h-4 w-4 text-blue-600" aria-hidden="true" />
      <span className="text-sm font-semibold text-ink">Private</span>
      <button
        type="button"
        role="switch"
        aria-checked={isPrivate}
        aria-label="Private to me"
        onClick={() => onChange(!isPrivate)}
        className={cn(
          "relative h-7 w-12 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
          isPrivate ? "bg-blue-600" : "bg-slate-200"
        )}
      >
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", isPrivate ? "left-6" : "left-1")} />
      </button>
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
                  current ? "bg-blue-600 text-white" : done ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
              </span>
              <span className={cn("text-sm font-semibold", current ? "text-ink" : "text-slate-500")}>{label}</span>
            </button>
            {index < stepLabels.length - 1 ? <span className={cn("h-0.5 flex-1 rounded-full", done ? "bg-blue-200" : "bg-slate-100")} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
