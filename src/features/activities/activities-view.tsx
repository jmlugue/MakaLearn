"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, Library, Pencil, Play, PlayCircle, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/form";
import { SelectionList } from "@/components/ui/selection-list";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/common/toast-provider";
import { activities as mockActivities, learningItems as mockLearningItems } from "@/data/mock-data";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useStudentMode } from "@/features/student-mode/student-mode-context";
import { insertAuditLog } from "@/lib/audit-logs";
import {
  createActivityQuestions,
  deleteActivity,
  fetchMakaLearnData,
  insertActivity,
  updateActivity
} from "@/lib/supabase/app-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { activityTypeLabels } from "@/utils/activity-labels";
import { ensurePecsManifestItems } from "@/utils/pecs-content-library";
import type { Activity, ActivityType, LearningItem } from "@/types";

const activityTypes: ActivityType[] = [
  "match-word-symbol",
  "choose-correct-symbol",
  "fill-blank",
  "drag-drop-symbol",
  "gesture-practice",
  "simple-quiz"
];
type ActivityTab = "workspace" | "library";
const LOCAL_ACTIVITIES_STORAGE_KEY = "makalearn-activities";
const CONTENT_LIBRARY_STORAGE_KEY = "makalearn-content-library";

type LocalContentLibraryState = {
  items?: LearningItem[];
};

function readLocalActivities(): Activity[] | null {
  if (typeof window === "undefined" || isSupabaseConfigured()) return null;

  try {
    const value = window.localStorage.getItem(LOCAL_ACTIVITIES_STORAGE_KEY);
    if (value === null) return null;
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as Activity[]).filter((activity) => activityTypes.includes(activity.type)) : null;
  } catch {
    return null;
  }
}

function readLocalContentLibraryItems(): LearningItem[] | null {
  if (typeof window === "undefined" || isSupabaseConfigured()) return null;

  try {
    const value = window.localStorage.getItem(CONTENT_LIBRARY_STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as LocalContentLibraryState;
    return Array.isArray(parsed.items) ? parsed.items : null;
  } catch {
    return null;
  }
}

function getValidActivityType(value?: string): ActivityType | undefined {
  return activityTypes.includes(value as ActivityType) ? (value as ActivityType) : undefined;
}

function getFirstActivityForType(activities: Activity[], activityType?: ActivityType) {
  if (!activityType) return undefined;
  return activities.find((activity) => activity.type === activityType);
}

function activityUsesImageOptions(type: ActivityType) {
  return type === "match-word-symbol" || type === "choose-correct-symbol" || type === "drag-drop-symbol";
}

function getActivityDraftInstructions(type: ActivityType, items: LearningItem[]) {
  const count = items.length;
  const noun = count === 1 ? "item" : "items";

  const instructions: Record<ActivityType, string> = {
    "match-word-symbol": `Show the ${count} selected ${noun}. Ask the learner to match each word to its picture, then revisit any missed matches.`,
    "choose-correct-symbol": `Read each prompt aloud and ask the learner to choose the correct picture. Give one repeat if needed before moving on.`,
    "fill-blank": `Read each sentence with a pause at the blank. Let the learner choose the missing word, then read the completed sentence together.`,
    "drag-drop-symbol": `Ask the learner to drag each picture to its matching word. On touch screens, tap a picture first and then choose its word.`,
    "gesture-practice": `Model each selected gesture once, then ask the learner to copy it. Mark the attempt after the learner has had enough time to respond.`,
    "simple-quiz": `Ask one short question for each selected item. Read the choices aloud when helpful and review incorrect answers at the end.`
  };

  return instructions[type];
}

function getActivityItems(items: LearningItem[]) {
  const normalized = items.map((item) => ({
    ...item,
    contentType: item.contentType ?? (item.tags?.includes("gesture") ? ("gesture" as const) : ("pecs" as const))
  }));

  return ensurePecsManifestItems(normalized).filter(
    (item) => item.contentType === "pecs" || item.contentType === "gesture"
  );
}

function getResultPresentation(score: number) {
  if (score === 100) {
    return {
      containerClass: "border-emerald-200 bg-emerald-50",
      textClass: "text-emerald-800",
      heading: "Activity complete",
      guidance: "All answers were correct. Reset the activity when you are ready for another attempt."
    };
  }

  if (score >= 50) {
    return {
      containerClass: "border-amber-200 bg-amber-50",
      textClass: "text-amber-900",
      heading: "Review the missed answers",
      guidance: "Review the incorrect answers together, then reset the activity and try again."
    };
  }

  return {
    containerClass: "border-red-200 bg-red-50",
    textClass: "text-red-800",
    heading: "More guided practice needed",
    guidance: "Review the learning items together, then reset the activity for another attempt."
  };
}

export function ActivitiesView({ initialActivityType }: { initialActivityType?: string }) {
  const { user } = useAuthUser();
  const { isStudentMode } = useStudentMode();
  const { notify } = useToast();
  const requestedActivityType = getValidActivityType(initialActivityType);
  const [activities, setActivities] = useState<Activity[]>(isSupabaseConfigured() ? [] : mockActivities);
  const [activitiesReady, setActivitiesReady] = useState(false);
  const [tab, setTab] = useState<ActivityTab>("workspace");
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editReturnTab, setEditReturnTab] = useState<ActivityTab>("workspace");
  const [activitySearch, setActivitySearch] = useState("");
  const [learningItemSearch, setLearningItemSearch] = useState("");
  const [activityPendingDelete, setActivityPendingDelete] = useState<Activity | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [learningItems, setLearningItems] = useState<LearningItem[]>(getActivityItems(mockLearningItems));
  const [selectedActivityId, setSelectedActivityId] = useState(
    isSupabaseConfigured()
      ? ""
      : getFirstActivityForType(mockActivities, requestedActivityType)?.id ?? mockActivities[0].id
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dragged, setDragged] = useState("");
  const [result, setResult] = useState<{ score: number; correct: number; incorrect: number } | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("simple-quiz");
  const [selectedLearningItemIds, setSelectedLearningItemIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [privateActivity, setPrivateActivity] = useState(false);
  const [error, setError] = useState("");
  const [learningItemError, setLearningItemError] = useState("");
  const [aiDraftNote, setAiDraftNote] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      if (!isSupabaseConfigured()) {
        const nextActivities = (readLocalActivities() ?? mockActivities).filter((activity) => activityTypes.includes(activity.type));
        const nextLearningItems = getActivityItems(readLocalContentLibraryItems() ?? mockLearningItems);
        if (!active) return;
        setActivities(nextActivities);
        setLearningItems(nextLearningItems);
        setSelectedActivityId(
          getFirstActivityForType(nextActivities, requestedActivityType)?.id ?? nextActivities[0]?.id ?? ""
        );
        setActivitiesReady(true);
        return;
      }

      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        // An empty table is valid after deletions; never replace it with mock activities.
        const nextActivities = data.activities.filter((activity) => activityTypes.includes(activity.type));
        setActivities(nextActivities);
        setLearningItems(getActivityItems(data.learningItems.length ? data.learningItems : mockLearningItems));
        setSelectedActivityId((current) => {
          const requestedActivity = getFirstActivityForType(nextActivities, requestedActivityType);
          if (requestedActivity) return requestedActivity.id;
          return nextActivities.some((activity) => activity.id === current) ? current : nextActivities[0]?.id ?? "";
        });
        setActivitiesReady(true);
      } catch (error) {
        if (!active) return;
        setActivities([]);
        setSelectedActivityId("");
        setActivitiesReady(true);
        notify({
          title: "Activities could not be loaded",
          description: "Activity materials are not available right now."
        });
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
    };
  }, [notify, requestedActivityType]);

  useEffect(() => {
    if (!activitiesReady || isSupabaseConfigured() || typeof window === "undefined") return;
    window.localStorage.setItem(LOCAL_ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
  }, [activities, activitiesReady]);

  useEffect(() => {
    if (!isStudentMode) return;
    setTab("workspace");
    setCreateFormOpen(false);
    setEditingActivity(null);
    setActivityPendingDelete(null);
  }, [isStudentMode]);

  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? activities[0];
  const selectedItems = useMemo(
    () => selectedActivity?.learningItemIds.map((id) => learningItems.find((item) => item.id === id)).filter(Boolean) ?? [],
    [learningItems, selectedActivity]
  );
  const filteredActivities = useMemo(() => {
    const query = activitySearch.trim().toLowerCase();
    if (!query) return activities;

    return activities.filter((activity) => {
      const relatedLabels = activity.learningItemIds
        .map((id) => learningItems.find((item) => item.id === id)?.label ?? "")
        .join(" ");
      return [activity.title, activity.prompt, activityTypeLabels[activity.type], activity.visibility, relatedLabels]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [activities, activitySearch, learningItems]);
  const selectableLearningItems = useMemo(() => {
    const query = learningItemSearch.trim().toLowerCase();

    return learningItems.filter((item) => {
      const supportsContentType = type === "gesture-practice" ? item.contentType === "gesture" : item.contentType === "pecs";
      const supportsType = !activityUsesImageOptions(type) || Boolean(item.symbolImageUrl);
      const matchesSearch = !query || [item.label, item.description, item.tags.join(" ")].join(" ").toLowerCase().includes(query);
      return supportsContentType && supportsType && matchesSearch;
    });
  }, [learningItemSearch, learningItems, type]);
  const learningItemEmptyText = learningItemSearch
    ? "No learning items match this search."
    : type === "gesture-practice"
      ? "No gesture items are available yet. Add a gesture in Content Library first."
      : activityUsesImageOptions(type)
        ? "No PECS items with images are available yet. Add or upload PECS images in Content Library first."
        : "No PECS learning items are available yet. Add PECS items in Content Library first.";

  function logActivityAction(action: "create" | "edit" | "delete", activity: Activity, detail: string) {
    insertAuditLog({
      category: "content",
      action,
      actor: user,
      targetType: "activity",
      targetId: activity.id,
      targetTitle: activity.title,
      detail
    }).catch(() => undefined);
  }

  function chooseAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setResult(null);
  }

  function scoreActivity() {
    if (!selectedActivity) {
      notify({ title: "No activity selected", description: "Choose or create an activity before scoring." });
      return;
    }
    const correct = selectedActivity.questions.reduce(
      (sum, question) => sum + (answers[question.id] === question.answer ? 1 : 0),
      0
    );
    const incorrect = selectedActivity.questions.length - correct;
    const score = selectedActivity.questions.length ? Math.round((correct / selectedActivity.questions.length) * 100) : 0;
    setResult({ score, correct, incorrect });
    const presentation = getResultPresentation(score);
    notify({
      title: presentation.heading,
      description: `${score}% — ${presentation.guidance}`,
      tone: score === 100 ? "success" : "info"
    });
  }

  function resetPlayer(activityId = selectedActivityId) {
    setSelectedActivityId(activityId);
    setAnswers({});
    setDragged("");
    setResult(null);
  }

  function openActivity(activityId: string) {
    resetPlayer(activityId);
    setTab("workspace");
  }

  function openEditActivity(activity: Activity) {
    setEditReturnTab(tab);
    setEditingActivity(activity);
    setTitle(activity.title);
    setType(activity.type);
    setSelectedLearningItemIds(activity.learningItemIds);
    setLearningItemSearch("");
    setInstructions(activity.prompt);
    setPrivateActivity(activity.visibility === "private");
    setError("");
    setLearningItemError("");
    setAiDraftNote("");
    setCreateFormOpen(true);
    setTab("workspace");
  }

  function closeCreateForm() {
    const shouldReturnToLibrary = Boolean(editingActivity) && editReturnTab === "library";
    setTitle("");
    setType("simple-quiz");
    setSelectedLearningItemIds([]);
    setLearningItemSearch("");
    setInstructions("");
    setPrivateActivity(false);
    setError("");
    setLearningItemError("");
    setAiDraftNote("");
    setEditingActivity(null);
    setCreateFormOpen(false);
    if (shouldReturnToLibrary) {
      setTab("library");
    }
  }

  function generateAiActivityDraft() {
    const selectedLearningItems = selectedLearningItemIds
      .map((id) => learningItems.find((item) => item.id === id))
      .filter((item): item is LearningItem => Boolean(item));

    if (!selectedLearningItems.length) {
      setLearningItemError(
        type === "gesture-practice"
          ? "Select at least one gesture before drafting."
          : "Select at least one learning item before drafting."
      );
      return;
    }

    const itemNames = selectedLearningItems.map((item) => item.label).join(", ");
    setTitle(`${activityTypeLabels[type]}: ${itemNames}`);
    setInstructions(getActivityDraftInstructions(type, selectedLearningItems));
    setAiDraftNote(
      `Drafted for ${activityTypeLabels[type].toLowerCase()}. You can still change the activity type, items, visibility, and instructions before saving.`
    );
    setLearningItemError("");
    notify({
      title: "Activity draft ready",
      description: `${activityTypeLabels[type]} instructions are ready to review.`,
      tone: "success"
    });
  }

  async function createActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      setError("Activity title is required.");
      return;
    }
    if (!selectedLearningItemIds.length) {
      setLearningItemError("Select at least one learning item for this activity.");
      return;
    }
    const selectedLearningItems = selectedLearningItemIds
      .map((id) => learningItems.find((item) => item.id === id))
      .filter((item): item is LearningItem => Boolean(item));
    if (activityUsesImageOptions(type) && selectedLearningItems.some((item) => !item.symbolImageUrl)) {
      setLearningItemError("Image-based activities require a symbol image for every selected learning item.");
      return;
    }
    const questions = createActivityQuestions(type, selectedLearningItems, learningItems);
    const nextActivity: Activity = {
      id: editingActivity?.id ?? `activity-${Date.now()}`,
      title,
      type,
      prompt: instructions.trim() || "Complete each question with teacher guidance.",
      learningItemIds: selectedLearningItems.map((item) => item.id),
      questions,
      visibility: privateActivity ? "private" : "shared",
      createdBy: editingActivity?.createdBy ?? user.id
    };
    let savedActivity = nextActivity;
    let savedToSupabase = !isSupabaseConfigured();
    if (isSupabaseConfigured()) {
      try {
        savedActivity = editingActivity
          ? await updateActivity(nextActivity, editingActivity)
          : await insertActivity(nextActivity);
        savedToSupabase = true;
      } catch (error) {
        console.error("Supabase activity save failed. Keeping the activity in local state for this session.", error);
      }
    }
    setActivities((current) =>
      editingActivity
        ? current.map((activity) => (activity.id === editingActivity.id ? savedActivity : activity))
        : [savedActivity, ...current]
    );
    logActivityAction(editingActivity ? "edit" : "create", savedActivity, editingActivity ? "Updated an activity." : "Created an activity.");
    resetPlayer(savedActivity.id);
    const wasEditing = Boolean(editingActivity);
    closeCreateForm();
    notify({
      title: savedToSupabase
        ? wasEditing
          ? "Activity updated"
          : "Activity created"
        : wasEditing
          ? "Activity updated locally"
          : "Activity created locally",
      description: savedToSupabase
        ? `The activity was ${wasEditing ? "updated" : "created"}.`
        : "Supabase could not save this activity yet, so it is available in this browser session.",
      tone: savedToSupabase ? "success" : "info"
    });
  }

  async function confirmDeleteActivity(activity: Activity) {
    setDeleteInProgress(true);

    if (isSupabaseConfigured()) {
      try {
        await deleteActivity(activity.id);
      } catch (error) {
        notify({
          title: "Activity not deleted",
          description: "The activity could not be deleted. Try again."
        });
        setDeleteInProgress(false);
        return;
      }
    }

    const remainingActivities = activities.filter((candidate) => candidate.id !== activity.id);
    setActivities(remainingActivities);
    if (selectedActivityId === activity.id) {
      resetPlayer(remainingActivities[0]?.id ?? "");
    }
    if (editingActivity?.id === activity.id) {
      closeCreateForm();
    }
    logActivityAction("delete", activity, "Deleted an activity.");
    setActivityPendingDelete(null);
    setDeleteInProgress(false);
    notify({
      title: "Activity deleted",
      description: `${activity.title} was removed from the activity library.`,
      tone: "success"
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={isStudentMode ? "Student mode" : "Activities"}
        title={isStudentMode ? "Practice activity" : "PECS activity library and player"}
        description={
          isStudentMode
            ? "Answer each prompt with teacher guidance. Creation and editing tools are hidden in this view."
            : "Create and run symbol-based activities from PECS cards only. Gesture recognition stays in the gesture tab."
        }
      />

      {!isStudentMode ? <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTab("workspace")}
          className={`min-h-[6rem] rounded-lg border p-4 text-left shadow-sm transition ${
            tab === "workspace"
              ? "border-blue-500 bg-blue-600 text-white shadow-soft"
              : "border-blue-100 bg-white text-slate-700 hover:border-blue-300 hover:bg-skywash"
          }`}
          aria-pressed={tab === "workspace"}
        >
          <span className="flex items-center justify-between gap-3">
            <PlayCircle className="h-6 w-6" aria-hidden="true" />
            <span className={`text-sm font-bold ${tab === "workspace" ? "text-white" : "text-blue-700"}`}>
              {selectedActivity?.questions.length ?? 0} {selectedActivity?.questions.length === 1 ? "question" : "questions"}
            </span>
          </span>
          <span className="mt-3 block text-sm font-bold">Play &amp; create</span>
          <span className={`mt-1 block text-xs leading-5 ${tab === "workspace" ? "text-blue-50" : "text-slate-500"}`}>
            Run the selected activity or create a new one
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("library")}
          className={`min-h-[6rem] rounded-lg border p-4 text-left shadow-sm transition ${
            tab === "library"
              ? "border-blue-500 bg-blue-600 text-white shadow-soft"
              : "border-blue-100 bg-white text-slate-700 hover:border-blue-300 hover:bg-skywash"
          }`}
          aria-pressed={tab === "library"}
        >
          <span className="flex items-center justify-between gap-3">
            <Library className="h-6 w-6" aria-hidden="true" />
            <span className={`text-2xl font-bold ${tab === "library" ? "text-white" : "text-blue-700"}`}>
              {activities.length}
            </span>
          </span>
          <span className="mt-3 block text-sm font-bold">Activity library</span>
          <span className={`mt-1 block text-xs leading-5 ${tab === "library" ? "text-blue-50" : "text-slate-500"}`}>
            Browse shared and private activities
          </span>
        </button>
      </div> : null}
      {tab === "workspace" ? (
      <section className="mt-4 space-y-4">
        {isStudentMode && activities.length > 1 ? (
          <Card className="bg-[#fbfdff]">
            <CardTitle>Choose an activity</CardTitle>
            <CardDescription>Pick one activity to practise.</CardDescription>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activities.map((activity) => (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => resetPlayer(activity.id)}
                  className={`min-h-16 rounded-lg border p-3 text-left text-sm font-semibold transition ${
                    selectedActivity?.id === activity.id
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-blue-100 bg-white text-ink hover:border-blue-300"
                  }`}
                >
                  {activity.title}
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        {!isStudentMode ? <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Activity workspace</h2>
            <p className="mt-1 text-sm text-slate-600">Run the selected activity, or open the creator when you need a new one.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {createFormOpen ? (
              <Button type="button" variant="secondary" onClick={closeCreateForm} aria-expanded="true" aria-controls="create-activity-form">
                <X className="h-4 w-4" aria-hidden="true" />
                Close form
              </Button>
            ) : (
              <Button type="button" onClick={() => setCreateFormOpen(true)} aria-expanded="false" aria-controls="create-activity-form">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create activity
              </Button>
            )}
          </div>
        </div> : null}

        {!isStudentMode ? <div className="space-y-4">
          {createFormOpen ? (
          <div
            className={
              editingActivity
                ? "fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6"
                : "contents"
            }
          >
          <Card
            id="create-activity-form"
            role={editingActivity ? "dialog" : undefined}
            aria-modal={editingActivity ? true : undefined}
            aria-labelledby={editingActivity ? "activity-form-title" : undefined}
            className={`${editingActivity ? "mx-auto w-full" : ""} max-w-4xl border-blue-200 bg-[#fbfdff]`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle id="activity-form-title">{editingActivity ? "Edit activity" : "Create activity"}</CardTitle>
                <CardDescription>
                  {editingActivity
                    ? "Update the activity details, learning items, questions, and visibility."
                    : "Teachers and admins can manually create shared or private activities."}
                </CardDescription>
              </div>
              {editingActivity ? (
                <Button type="button" variant="ghost" size="icon" aria-label="Close activity editor" onClick={closeCreateForm}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <form className="mt-4 space-y-4" onSubmit={createActivity}>
              <div>
                <Label htmlFor="activity-title">Activity title</Label>
                <Input
                  id="activity-title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (error) setError("");
                  }}
                />
                <FieldError message={error} />
              </div>
              <div>
                <Label htmlFor="activity-type">Activity type</Label>
                <Select
                  id="activity-type"
                  value={type}
                  onChange={(event) => {
                    const nextType = event.target.value as ActivityType;
                    setType(nextType);
                    setSelectedLearningItemIds((current) =>
                      current.filter((id) => {
                        const item = learningItems.find((candidate) => candidate.id === id);
                        if (!item) return false;
                        if (nextType === "gesture-practice") return item.contentType === "gesture";
                        if (item.contentType !== "pecs") return false;
                        return activityUsesImageOptions(nextType) ? Boolean(item.symbolImageUrl) : true;
                      })
                    );
                    setLearningItemError("");
                  }}
                >
                  {activityTypes.map((item) => (
                    <option key={item} value={item}>
                      {activityTypeLabels[item]}
                    </option>
                  ))}
                </Select>
                <FieldHint>Choose any activity type first; the draft helper will keep that choice.</FieldHint>
              </div>
              <div>
                <Label htmlFor="learning-item-search">Search learning items</Label>
                <div className="relative mb-4 mt-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <Input
                    id="learning-item-search"
                    type="search"
                    value={learningItemSearch}
                    onChange={(event) => setLearningItemSearch(event.target.value)}
                    placeholder={type === "gesture-practice" ? "Search gestures" : "Search learning items"}
                    className="pl-10"
                  />
                </div>
                <SelectionList
                  label={type === "gesture-practice" ? "Gestures" : "Learning items"}
                  helper={
                    activityUsesImageOptions(type)
                      ? "Choose learning items to ask about. Only items with images are shown."
                      : type === "gesture-practice"
                        ? "Choose the gestures to include in the guided practice."
                        : "Choose the learning items this activity should use."
                  }
                  options={selectableLearningItems.map((item) => ({
                      value: item.id,
                      label: item.label,
                      description: activityUsesImageOptions(type) ? "Symbol image ready" : item.description
                    }))}
                  selectedValues={selectedLearningItemIds}
                  onChange={(values) => {
                    setSelectedLearningItemIds(values);
                    if (learningItemError) setLearningItemError("");
                  }}
                  emptyText={
                    learningItemEmptyText
                  }
                />
                <FieldError message={learningItemError} />
                <div className="mt-3 rounded-lg border border-blue-100 bg-white p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-600 text-white">
                        <Bot className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-ink">Activity draft</p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          Drafts the selected activity type from your chosen items for teacher review.
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="secondary" onClick={generateAiActivityDraft}>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Draft activity
                    </Button>
                  </div>
                  {aiDraftNote ? <p className="mt-3 text-xs font-semibold leading-5 text-blue-700">{aiDraftNote}</p> : null}
                </div>
              </div>
              <label className="flex min-h-12 items-center gap-3 rounded-lg border border-blue-100 bg-skywash p-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={privateActivity}
                  onChange={(event) => setPrivateActivity(event.target.checked)}
                  className="h-5 w-5"
                />
                Private to me
              </label>
              <div>
                <Label htmlFor="activity-instructions">Activity instructions</Label>
                <Textarea
                  id="activity-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Optional directions shown above the activity"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit">
                  {editingActivity ? <Pencil className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  {editingActivity ? "Save changes" : "Create activity"}
                </Button>
                <Button type="button" variant="outline" onClick={closeCreateForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
          </div>
          ) : null}
        </div> : null}

        {selectedActivity ? (
        <Card>
          <div>
            <Badge>{activityTypeLabels[selectedActivity.type]}</Badge>
            <CardTitle className="mt-3 text-2xl">{selectedActivity.title}</CardTitle>
            <CardDescription>{selectedActivity.prompt}</CardDescription>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This run is for presentation and classroom practice only. Learner progress recording is not included in the current scope.
            </p>
          </div>

          <div className="mt-5 rounded-lg bg-skywash p-4">
            <p className="text-sm font-semibold text-slate-700">Related learning items</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedItems.map((item) =>
                item ? (
                  <Badge key={item.id} className="bg-white text-blue-700">
                    {item.label}
                  </Badge>
                ) : null
              )}
            </div>
          </div>

            <ActivityPlayer
              activity={selectedActivity}
              learningItems={learningItems}
              answers={answers}
              scored={Boolean(result)}
            dragged={dragged}
            setDragged={setDragged}
            chooseAnswer={chooseAnswer}
          />

          {result ? (() => {
            const presentation = getResultPresentation(result.score);
            return (
              <div className={`mt-5 rounded-lg border p-4 ${presentation.containerClass}`} role="status">
                <p className={`text-xl font-bold ${presentation.textClass}`}>{result.score}% — {presentation.heading}</p>
                <p className={`mt-1 text-sm font-semibold ${presentation.textClass}`}>
                  {result.correct} correct · {result.incorrect} incorrect
                </p>
                <p className={`mt-2 text-sm leading-6 ${presentation.textClass}`}>{presentation.guidance}</p>
              </div>
            );
          })() : null}

          <CardFooter className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button onClick={scoreActivity}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Score activity
            </Button>
            <Button variant="secondary" onClick={() => resetPlayer()}>
              Reset answers
            </Button>
            {!isStudentMode ? <Button variant="outline" onClick={() => openEditActivity(selectedActivity)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit activity
            </Button> : null}
          </CardFooter>
        </Card>
        ) : (
          <EmptyState
            icon={PlayCircle}
            title="No activity selected"
            description="Create an activity or choose one from the activity library."
          />
        )}
      </section>
      ) : null}

      {tab === "library" && !isStudentMode ? (
        <section className="mt-4 space-y-4">
          <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">Activity library</h2>
                <p className="mt-1 text-sm text-slate-600">Select an activity to open it in the player.</p>
              </div>
              <div className="w-full lg:max-w-sm">
                <Label htmlFor="activity-search">Search activities</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <Input
                    id="activity-search"
                    type="search"
                    value={activitySearch}
                    onChange={(event) => setActivitySearch(event.target.value)}
                    placeholder="Search title, type, or learning item"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {filteredActivities.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredActivities.map((activity) => (
                <article
                  key={activity.id}
                  className={`flex min-h-44 flex-col rounded-lg border bg-white p-4 shadow-sm ${
                    selectedActivity?.id === activity.id ? "border-blue-500 ring-2 ring-blue-100" : "border-blue-100"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink">{activity.title}</h3>
                    <Badge>{activity.visibility}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{activityTypeLabels[activity.type]}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{activity.prompt}</p>
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                    <Button type="button" size="sm" className="col-span-2" onClick={() => openActivity(activity.id)}>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      Open activity
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => openEditActivity(activity)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => setActivityPendingDelete(activity)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={activitySearch ? Search : Library}
              title={activities.length ? "No activities found" : "No activities yet"}
              description={
                activities.length
                  ? "Try another title, type, or learning item."
                  : "Create an activity to add it to the library."
              }
            />
          )}
        </section>
      ) : null}

      {activityPendingDelete && !isStudentMode ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-activity-title"
            aria-describedby="delete-activity-description"
            className="w-full max-w-md rounded-lg border border-red-100 bg-white p-5 shadow-soft"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="delete-activity-title" className="text-lg font-bold text-ink">
                  Delete {activityPendingDelete.title}?
                </h2>
                <p id="delete-activity-description" className="mt-2 text-sm leading-6 text-slate-600">
                  This removes the activity, its questions, and associated saved results. This action cannot be undone.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close delete confirmation"
                disabled={deleteInProgress}
                onClick={() => setActivityPendingDelete(null)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={deleteInProgress}
                onClick={() => setActivityPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleteInProgress}
                onClick={() => confirmDeleteActivity(activityPendingDelete)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {deleteInProgress ? "Deleting..." : "Delete activity"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ActivityPlayer({
  activity,
  learningItems,
  answers,
  scored,
  dragged,
  setDragged,
  chooseAnswer
}: {
  activity: Activity;
  learningItems: LearningItem[];
  answers: Record<string, string>;
  scored: boolean;
  dragged: string;
  setDragged: (value: string) => void;
  chooseAnswer: (questionId: string, value: string) => void;
}) {
  if (activity.type === "drag-drop-symbol") {
    const uniqueCards = [...new Set(activity.questions.flatMap((question) => question.options))];
    return (
      <div className="mt-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">Drag cards to the matching words.</p>
        <div className="mb-4 flex flex-wrap gap-3">
          {uniqueCards.map((card) => (
            <button
              key={card}
              type="button"
              draggable
              onDragStart={() => setDragged(card)}
              onClick={() => setDragged(card)}
              className={`grid min-h-28 min-w-28 place-items-center rounded-lg border bg-white p-3 text-xl font-bold text-blue-700 ${
                dragged === card ? "border-blue-500 ring-4 ring-blue-100" : "border-blue-100"
              }`}
            >
              <SymbolOption value={card} learningItems={learningItems} />
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {activity.questions.map((question) => {
            const answer = answers[question.id];
            const isCorrect = answer === question.answer;
            return (
            <div
              key={question.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dragged && chooseAnswer(question.id, dragged)}
              className={`min-h-28 rounded-lg border-2 border-dashed p-4 ${
                scored && answer
                  ? isCorrect
                    ? "border-green-300 bg-green-50"
                    : "border-red-300 bg-red-50"
                  : "border-blue-200 bg-skywash"
              }`}
            >
              <p className="font-semibold">{question.prompt}</p>
              <Button className="mt-3" variant="secondary" onClick={() => dragged && chooseAnswer(question.id, dragged)}>
                Drop selected card
              </Button>
              <div className="mt-3">
                {answer ? (
                  <div className="inline-grid rounded-lg border border-blue-100 bg-white p-2">
                    <SymbolOption value={answer} learningItems={learningItems} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Answer: None</p>
                )}
                {scored && answer ? (
                  <p className={`mt-2 text-sm font-semibold ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                    {isCorrect ? "Correct match" : "Incorrect match"}
                  </p>
                ) : null}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {activity.questions.map((question, index) => (
        <div key={question.id} className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">Question {index + 1}</p>
          <p className="mt-1 text-lg font-semibold">{question.prompt}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {question.options.map((option) => {
              const selected = answers[question.id] === option;
              const isCorrectOption = option === question.answer;
              const scoredClass =
                scored && selected
                  ? isCorrectOption
                    ? "border-green-300 bg-green-50 text-green-900 hover:bg-green-50"
                    : "border-red-300 bg-red-50 text-red-900 hover:bg-red-50"
                  : "";
              return (
              <Button
                key={option}
                variant={selected && !scored ? "primary" : "outline"}
                onClick={() => chooseAnswer(question.id, option)}
                className={`${activityUsesImageOptions(activity.type) ? "min-h-32 p-3" : "min-h-16"} ${scoredClass}`}
              >
                {activityUsesImageOptions(activity.type) ? (
                  <SymbolOption value={option} learningItems={learningItems} />
                ) : (
                  option
                )}
              </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function SymbolOption({ value, learningItems }: { value: string; learningItems: LearningItem[] }) {
  const item = learningItems.find((candidate) => candidate.symbolImageUrl === value || candidate.label === value);
  const imageValue = item?.symbolImageUrl ?? value;
  const isImageUrl =
    imageValue.startsWith("http") ||
    imageValue.startsWith("/") ||
    imageValue.startsWith("blob:") ||
    imageValue.startsWith("data:");

  if (isImageUrl) {
    return (
      <span
        role="img"
        aria-label={item ? `${item.label} symbol` : "Learning item symbol"}
        className="block h-24 w-full min-w-24 rounded-lg bg-white bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${JSON.stringify(imageValue)})` }}
      />
    );
  }

  return (
    <span className="grid h-20 min-w-24 place-items-center rounded-lg border border-blue-100 bg-[#f8fbff] px-3 text-lg font-black text-blue-700 shadow-inner">
      {imageValue}
      {item ? <span className="sr-only">{item.label} symbol image</span> : null}
    </span>
  );
}
