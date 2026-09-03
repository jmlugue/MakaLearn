"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Library, Loader2, Pencil, Play, PlayCircle, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint, Input, Label } from "@/components/ui/form";
import { SelectionList } from "@/components/ui/selection-list";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/common/toast-provider";
import { StudentActivityPlayer } from "@/features/activities/student-activity-player";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useStudentMode } from "@/features/student-mode/student-mode-context";
import { insertAuditLog } from "@/lib/audit-logs";
import {
  buildActivityTitle,
  buildDefaultActivityPrompt,
  canDraftQuestionPrompts
} from "@/utils/activity-ai-draft";
import type { ActivityDraftResult } from "@/utils/activity-ai-draft";
import {
  createActivityQuestions,
  deleteActivity,
  fetchMakaLearnData,
  insertActivity,
  insertActivityResult,
  updateActivity,
  upsertActivityPromptTemplates
} from "@/lib/supabase/app-data";
import { activityTypeLabels } from "@/utils/activity-labels";
import {
  getSavedFillBlankPromptForLabel,
  isGenericFillBlankPrompt
} from "@/utils/fill-blank-prompts";
import { ensurePecsManifestItems } from "@/utils/pecs-content-library";
import {
  getStarterLearningItemPromptDescription,
  getSavedChooseCorrectSymbolPrompt,
  isGenericChooseCorrectSymbolPrompt,
  upgradeStarterLearningItemPrompts
} from "@/utils/starter-learning-item-prompts";
import type { Activity, ActivityType, LearningItem } from "@/types";

const activityTypes: ActivityType[] = [
  "match-word-symbol",
  "choose-correct-symbol",
  "fill-blank",
  "drag-drop-symbol",
  "gesture-practice",
  "simple-quiz"
];
const activityTypeDescriptions: Record<ActivityType, string> = {
  "match-word-symbol": "Match words to pictures.",
  "choose-correct-symbol": "Pick the right picture.",
  "fill-blank": "Choose the missing word.",
  "drag-drop-symbol": "Drag pictures to words.",
  "gesture-practice": "Practice gestures.",
  "simple-quiz": "Answer guided questions."
};
type ActivityTab = "workspace" | "library";
const MAX_ACTIVITY_LEARNING_ITEMS = 5;

type ActivityPromptStore = Record<string, string>;
type ActivityPromptInputs = Record<string, string>;

function getPromptStoreKey(type: ActivityType, learningItemId: string) {
  return `${type}:${learningItemId}`;
}

function upgradeStarterActivityPrompts(records: Activity[]) {
  return records.map((activity) => {
    if (activity.type !== "choose-correct-symbol" && activity.type !== "fill-blank") {
      return activity;
    }

    return {
      ...activity,
      questions: activity.questions.map((question) => {
        const prompt = activity.type === "fill-blank"
          ? getSavedFillBlankPromptForLabel(question.answer)
          : getStarterLearningItemPromptDescription(question.learningItemId);
        return prompt ? { ...question, prompt } : question;
      })
    };
  });
}

function getValidActivityType(value?: string): ActivityType | undefined {
  return activityTypes.includes(value as ActivityType) ? (value as ActivityType) : undefined;
}

function getFirstActivityForType(activities: Activity[], activityType?: ActivityType) {
  if (!activityType) return undefined;
  return activities.find((activity) => activity.type === activityType);
}

function getInitialActivity(activities: Activity[], activityId?: string, activityType?: ActivityType) {
  if (activityId) {
    const requested = activities.find((activity) => activity.id === activityId);
    if (requested) return requested;
  }

  return getFirstActivityForType(activities, activityType) ?? activities[0];
}

function getSavedQuestionPrompt(type: ActivityType, item: LearningItem, promptStore: ActivityPromptStore) {
  const savedPrompt = promptStore[getPromptStoreKey(type, item.id)];
  if (savedPrompt) return savedPrompt;

  if (type === "fill-blank") return getSavedFillBlankPromptForLabel(item.label);
  if (type === "choose-correct-symbol") return getSavedChooseCorrectSymbolPrompt(item);

  return undefined;
}

function validatePromptForActivity(type: ActivityType, item: LearningItem, prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) return "";

  if (type === "fill-blank") {
    if (!trimmed.includes("____")) return "Use ____ to show where the missing word goes.";
    if (isGenericFillBlankPrompt(item.label, trimmed)) return "Write a classroom sentence for this item.";
  }

  if (type === "choose-correct-symbol" && isGenericChooseCorrectSymbolPrompt(item, trimmed)) {
    return "Write a classroom question for this item.";
  }

  return "";
}

function getQuestionPromptInputKey(type: ActivityType, itemId: string) {
  return getPromptStoreKey(type, itemId);
}

function getPromptInputValue(type: ActivityType, item: LearningItem, promptInputs: ActivityPromptInputs) {
  return promptInputs[getQuestionPromptInputKey(type, item.id)]?.trim() ?? "";
}

function getActivityTypeDraftText(type: ActivityType) {
  if (type === "gesture-practice") return "Draft with AI is not used for gesture practice.";
  if (type === "match-word-symbol" || type === "drag-drop-symbol") {
    return "This activity already uses the selected cards directly, so no AI call is needed.";
  }
  return "Draft missing reusable question prompts for selected PECS items.";
}

function getInitialSelectedActivity(activities: Activity[], activityId?: string, activityType?: ActivityType) {
  if (activityId) {
    const requested = activities.find((activity) => activity.id === activityId);
    if (requested) return requested;
  }

  return getInitialActivity(activities, activityId, activityType);
}

function activityUsesImageOptions(type: ActivityType) {
  return type === "match-word-symbol" || type === "choose-correct-symbol" || type === "drag-drop-symbol";
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

export function ActivitiesView({ initialActivityType, initialActivityId }: { initialActivityType?: string; initialActivityId?: string }) {
  const { user } = useAuthUser();
  const { isStudentMode } = useStudentMode();
  const { notify } = useToast();
  const requestedActivityType = getValidActivityType(initialActivityType);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesReady, setActivitiesReady] = useState(false);
  const [tab, setTab] = useState<ActivityTab>("workspace");
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editReturnTab, setEditReturnTab] = useState<ActivityTab>("workspace");
  const [activitySearch, setActivitySearch] = useState("");
  const [learningItemSearch, setLearningItemSearch] = useState("");
  const [activityPendingDelete, setActivityPendingDelete] = useState<Activity | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dragged, setDragged] = useState("");
  const [result, setResult] = useState<{ score: number; correct: number; incorrect: number } | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ActivityType>("fill-blank");
  const [selectedLearningItemIds, setSelectedLearningItemIds] = useState<string[]>([]);
  const [privateActivity, setPrivateActivity] = useState(false);
  const [activityPromptStore, setActivityPromptStore] = useState<ActivityPromptStore>({});
  const [activityPromptInputs, setActivityPromptInputs] = useState<ActivityPromptInputs>({});
  const [error, setError] = useState("");
  const [learningItemError, setLearningItemError] = useState("");
  const [aiDraftNote, setAiDraftNote] = useState("");
  const [aiDraftInProgress, setAiDraftInProgress] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active) return;
        const nextActivities = upgradeStarterActivityPrompts(data.activities);
        setActivities(nextActivities);
        setLearningItems(getActivityItems(upgradeStarterLearningItemPrompts(data.learningItems)));
        setActivityPromptStore(
          Object.fromEntries(data.promptTemplates.map((template) => [getPromptStoreKey(template.activityType, template.learningItemId), template.prompt]))
        );
        setSelectedActivityId((current) => {
          const requestedActivity = initialActivityId ? getInitialActivity(nextActivities, initialActivityId, requestedActivityType) : undefined;
          if (requestedActivity) return requestedActivity.id;
          if (nextActivities.some((activity) => activity.id === current)) return current;
          return getInitialSelectedActivity(nextActivities, initialActivityId, requestedActivityType)?.id ?? "";
        });
        setActivitiesReady(true);
      } catch (error) {
        if (!active) return;
        const nextActivities: Activity[] = [];
        const nextLearningItems: LearningItem[] = [];
        setActivities(nextActivities);
        setLearningItems(nextLearningItems);
        setSelectedActivityId("");
        setActivitiesReady(true);
        notify({
          title: "Activities unavailable",
          description: "Supabase activity records could not be loaded.",
          tone: "error"
        });
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
    };
  }, [initialActivityId, notify, requestedActivityType]);

  useEffect(() => {
    if (!isStudentMode) return;
    setTab("workspace");
    setCreateFormOpen(false);
    setEditingActivity(null);
    setActivityPendingDelete(null);
  }, [isStudentMode]);

  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? activities[0];
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
  const selectedLearningItemsForForm = useMemo(
    () =>
      selectedLearningItemIds
        .map((id) => learningItems.find((item) => item.id === id))
        .filter((item): item is LearningItem => Boolean(item)),
    [learningItems, selectedLearningItemIds]
  );
  const promptEditableActivity = canDraftQuestionPrompts(type);
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

  async function scoreActivity(questionIds?: string[]) {
    if (!selectedActivity) {
      notify({ title: "No activity selected", description: "Choose or create an activity before scoring." });
      return;
    }
    const questionsToScore = questionIds?.length
      ? selectedActivity.questions.filter((question) => questionIds.includes(question.id))
      : selectedActivity.questions;
    const correct = questionsToScore.reduce(
      (sum, question) => sum + (answers[question.id] === question.answer ? 1 : 0),
      0
    );
    const incorrect = questionsToScore.length - correct;
    const score = questionsToScore.length ? Math.round((correct / questionsToScore.length) * 100) : 0;
    setResult({ score, correct, incorrect });
    try {
      await insertActivityResult({
        activityId: selectedActivity.id,
        teacherId: user.id,
        score,
        correctCount: correct,
        incorrectCount: incorrect,
        answers
      });
    } catch (error) {
      notify({
        title: "Result not saved",
        description: error instanceof Error ? error.message : "The activity result could not be saved.",
        tone: "error"
      });
    }
    if (isStudentMode) return;

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
    const nextPromptInputs = Object.fromEntries(
      activity.questions.map((question) => [getQuestionPromptInputKey(activity.type, question.learningItemId), question.prompt])
    );
    setEditReturnTab(tab);
    setEditingActivity(activity);
    setTitle(activity.title);
    setType(activity.type);
    setSelectedLearningItemIds(activity.learningItemIds.slice(0, MAX_ACTIVITY_LEARNING_ITEMS));
    setActivityPromptInputs(nextPromptInputs);
    setLearningItemSearch("");
    setPrivateActivity(activity.visibility === "private");
    setError("");
    setLearningItemError("");
    setAiDraftNote("");
    setCreateFormOpen(true);
    setTab("workspace");
  }

  function changeActivityType(nextType: ActivityType) {
    setType(nextType);
    setActivityPromptInputs({});
    setSelectedLearningItemIds((current) =>
      current.filter((id) => {
        const item = learningItems.find((candidate) => candidate.id === id);
        if (!item) return false;
        if (nextType === "gesture-practice") return item.contentType === "gesture";
        if (item.contentType !== "pecs") return false;
        return activityUsesImageOptions(nextType) ? Boolean(item.symbolImageUrl) : true;
      }).slice(0, MAX_ACTIVITY_LEARNING_ITEMS)
    );
    setLearningItemError("");
  }

  function closeCreateForm() {
    const shouldReturnToLibrary = Boolean(editingActivity) && editReturnTab === "library";
    setTitle("");
    setType("fill-blank");
    setSelectedLearningItemIds([]);
    setActivityPromptInputs({});
    setLearningItemSearch("");
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

  async function generateAiActivityDraft(regenerate = false) {
    const selectedLearningItems = selectedLearningItemIds
      .map((id) => learningItems.find((item) => item.id === id))
      .filter((item): item is LearningItem => Boolean(item));

    if (selectedLearningItems.length > MAX_ACTIVITY_LEARNING_ITEMS) {
      setLearningItemError(`Choose up to ${MAX_ACTIVITY_LEARNING_ITEMS} learning items only.`);
      return;
    }

    if (!selectedLearningItems.length) {
      setLearningItemError(
        type === "gesture-practice"
          ? "Select at least one gesture before drafting."
          : "Select at least one learning item before drafting."
      );
      return;
    }

    const nextTitle = buildActivityTitle(type, selectedLearningItems);
    setTitle(nextTitle);
    if (error) setError("");

    if (type === "gesture-practice") {
      setAiDraftNote("Draft with AI is not used for gesture practice.");
      notify({
        title: "No AI draft needed",
        description: "Gesture practice uses teacher-guided practice and live camera feedback.",
        tone: "info"
      });
      return;
    }

    if (!canDraftQuestionPrompts(type)) {
      setAiDraftNote("This activity already uses the selected PECS cards.");
      notify({
        title: "Activity title updated",
        description: "This activity type does not need AI-generated questions.",
        tone: "info"
      });
      return;
    }

    const missingLearningItemIds = regenerate
      ? selectedLearningItems.map((item) => item.id)
      : selectedLearningItems
          .filter((item) => !getPromptInputValue(type, item, activityPromptInputs))
          .map((item) => item.id);

    if (!missingLearningItemIds.length) {
      setAiDraftNote("Each selected item already has a question.");
      notify({
        title: "Questions already ready",
        description: "No AI call was needed.",
        tone: "info"
      });
      return;
    }

    setAiDraftInProgress(true);
    setLearningItemError("");
    setAiDraftNote("");

    try {
      const response = await fetch("/api/activity-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          activityType: type,
          learningItems: selectedLearningItems,
          missingLearningItemIds,
          regenerate
        })
      });

      if (!response.ok) {
        throw new Error("Activity draft request failed.");
      }

      const draft = (await response.json()) as ActivityDraftResult;
      if (draft.suggestions.length) {
        const nextInputs = {
          ...activityPromptInputs,
          ...Object.fromEntries(draft.suggestions.map((suggestion) => [getQuestionPromptInputKey(type, suggestion.learningItemId), suggestion.prompt]))
        };
        setActivityPromptStore((current) => ({
          ...current,
          ...Object.fromEntries(draft.suggestions.map((suggestion) => [getPromptStoreKey(type, suggestion.learningItemId), suggestion.prompt]))
        }));
        setActivityPromptInputs(nextInputs);
      }
      setAiDraftNote(draft.note || "Draft with AI finished.");
      notify({
        title:
          draft.source === "hugging-face"
            ? "AI prompts ready"
            : draft.source === "cache"
              ? "Saved AI draft used"
              : draft.source === "rate-limited"
                ? "AI limit reached"
                : "Starter prompts added",
        description: draft.note || "Questions were added for the selected items.",
        tone: draft.source === "hugging-face" || draft.source === "cache" ? "success" : "info"
      });
    } catch {
      setAiDraftNote("Could not create questions with AI. You can type the questions below.");
      notify({
        title: "AI draft unavailable",
        description: "Type the missing questions below, then save the activity.",
        tone: "info"
      });
    } finally {
      setAiDraftInProgress(false);
    }
  }

  async function createActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedLearningItemIds.length) {
      setLearningItemError("Select at least one learning item for this activity.");
      return;
    }
    if (selectedLearningItemIds.length > MAX_ACTIVITY_LEARNING_ITEMS) {
      setLearningItemError(`Choose up to ${MAX_ACTIVITY_LEARNING_ITEMS} learning items only.`);
      return;
    }
    const selectedLearningItems = selectedLearningItemIds
      .map((id) => learningItems.find((item) => item.id === id))
      .filter((item): item is LearningItem => Boolean(item));
    if (activityUsesImageOptions(type) && selectedLearningItems.some((item) => !item.symbolImageUrl)) {
      setLearningItemError("Image-based activities require a symbol image for every selected learning item.");
      return;
    }
    if (canDraftQuestionPrompts(type)) {
      const firstInvalidPrompt = selectedLearningItems.find((item) => {
        const prompt = getPromptInputValue(type, item, activityPromptInputs);
        return !prompt || Boolean(validatePromptForActivity(type, item, prompt));
      });

      if (firstInvalidPrompt) {
        const prompt = getPromptInputValue(type, firstInvalidPrompt, activityPromptInputs);
        const validationMessage = prompt ? validatePromptForActivity(type, firstInvalidPrompt, prompt) : "Add a question for this item or press Draft with AI.";
        setLearningItemError(`${firstInvalidPrompt.label}: ${validationMessage}`);
        return;
      }
    }
    const activityTitle = title.trim() || buildActivityTitle(type, selectedLearningItems);
    if (!activityTitle) {
      setError("Activity title is required.");
      return;
    }
    const promptOverrides = Object.fromEntries(
      selectedLearningItems.flatMap((item) => {
        const prompt = getPromptInputValue(type, item, activityPromptInputs) || getSavedQuestionPrompt(type, item, activityPromptStore);
        return prompt ? [[getPromptStoreKey(type, item.id), prompt]] : [];
      })
    ) as Record<string, string>;
    if (canDraftQuestionPrompts(type)) {
      try {
        await upsertActivityPromptTemplates(
          selectedLearningItems.flatMap((item) => {
            const prompt = promptOverrides[getPromptStoreKey(type, item.id)];
            return prompt
              ? [{
                  activityType: type,
                  learningItemId: item.id,
                  prompt,
                  source: "manual" as const,
                  createdBy: user.id
                }]
              : [];
          })
        );
        setActivityPromptStore((current) => ({ ...current, ...promptOverrides }));
      } catch (error) {
        notify({
          title: "Question prompts not saved",
          description: error instanceof Error ? error.message : "Reusable prompts could not be saved.",
          tone: "error"
        });
        return;
      }
    }
    const questions = createActivityQuestions(type, selectedLearningItems, learningItems, promptOverrides);
    const nextActivity: Activity = {
      id: editingActivity?.id ?? `activity-${Date.now()}`,
      title: activityTitle,
      type,
      prompt: buildDefaultActivityPrompt(type),
      learningItemIds: selectedLearningItems.map((item) => item.id),
      questions,
      visibility: privateActivity ? "private" : "shared",
      createdBy: editingActivity?.createdBy ?? user.id
    };
    let savedActivity = nextActivity;
    try {
      savedActivity = editingActivity
        ? await updateActivity(nextActivity, editingActivity)
        : await insertActivity(nextActivity);
    } catch (error) {
      notify({
        title: "Activity not saved",
        description: error instanceof Error ? error.message : "The activity could not be saved.",
        tone: "error"
      });
      return;
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
    if (!wasEditing) {
      setTab("library");
    }
    notify({
      title: wasEditing ? "Activity updated" : "Activity created",
      description: `The activity was ${wasEditing ? "updated" : "created"}.`,
      tone: "success"
    });
  }

  async function confirmDeleteActivity(activity: Activity) {
    setDeleteInProgress(true);

    try {
      await deleteActivity(activity.id);
    } catch (error) {
      notify({
        title: "Activity not deleted",
        description: error instanceof Error ? error.message : "The activity could not be deleted.",
        tone: "error"
      });
      setDeleteInProgress(false);
      return;
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
      {!isStudentMode ? (
        <PageHeader
          eyebrow="Activities"
          title="Activities"
          description="Create, choose, and run classroom activities."
        />
      ) : null}

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
          <span className="mt-3 block text-sm font-bold">Workspace</span>
          <span className={`mt-1 block text-xs leading-5 ${tab === "workspace" ? "text-blue-50" : "text-slate-500"}`}>
            Run or create
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
          <span className="mt-3 block text-sm font-bold">Library</span>
          <span className={`mt-1 block text-xs leading-5 ${tab === "library" ? "text-blue-50" : "text-slate-500"}`}>
            Find saved activities
          </span>
        </button>
      </div> : null}
      {tab === "workspace" ? (
      <section className={isStudentMode ? "mt-0" : "mt-4 space-y-4"}>

        {!isStudentMode ? <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Activity workspace</h2>
            <p className="mt-1 text-sm text-slate-600">Run the selected activity or make a new one.</p>
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
                <CardDescription>Choose a type, pick items, then save.</CardDescription>
              </div>
              {editingActivity ? (
                <Button type="button" variant="ghost" size="icon" aria-label="Close activity editor" onClick={closeCreateForm}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <form className="mt-5 space-y-5" onSubmit={createActivity}>
              <section className="rounded-xl border border-blue-100 bg-white p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">1</span>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Choose activity type</h3>
                    <p className="text-xs text-slate-500">Pick one format.</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Activity type">
                  {activityTypes.map((item) => {
                    const selected = type === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => changeActivityType(item)}
                        className={`rounded-lg border p-3 text-left transition ${
                          selected
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                            : "border-blue-100 bg-white hover:border-blue-300 hover:bg-skywash"
                        }`}
                      >
                        <span className="block text-sm font-bold text-ink">{activityTypeLabels[item]}</span>
                        <span className="mt-1 block text-xs text-slate-500">{activityTypeDescriptions[item]}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-xl border border-blue-100 bg-white p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">2</span>
                    <div>
                      <h3 className="text-sm font-bold text-ink">Pick learning items</h3>
                      <p className="text-xs text-slate-500">Use up to {MAX_ACTIVITY_LEARNING_ITEMS} items.</p>
                    </div>
                  </div>
                  {type !== "gesture-practice" ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="secondary" onClick={() => generateAiActivityDraft(false)} disabled={aiDraftInProgress}>
                        {aiDraftInProgress ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                        {aiDraftInProgress ? "Drafting..." : "Draft with AI"}
                      </Button>
                      {canDraftQuestionPrompts(type) && selectedLearningItemIds.length ? (
                        <Button type="button" variant="outline" onClick={() => generateAiActivityDraft(true)} disabled={aiDraftInProgress}>
                          <Sparkles className="h-4 w-4" aria-hidden="true" />
                          Generate new version
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {type !== "gesture-practice" ? (
                  <p className="mb-3 text-xs font-semibold text-blue-700">{getActivityTypeDraftText(type)}</p>
                ) : null}
                <Label htmlFor="learning-item-search">{type === "gesture-practice" ? "Search gestures" : "Search items"}</Label>
                <div className="relative mb-4 mt-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <Input
                    id="learning-item-search"
                    type="search"
                    value={learningItemSearch}
                    onChange={(event) => setLearningItemSearch(event.target.value)}
                    placeholder={type === "gesture-practice" ? "Type a gesture name" : "Type an item name"}
                    className="pl-10"
                  />
                </div>
                <SelectionList
                  label={type === "gesture-practice" ? "Gestures" : "Items"}
                  helper={activityUsesImageOptions(type) ? "Only items with images are shown." : "Select the items to practice."}
                  options={selectableLearningItems.map((item) => ({
                    value: item.id,
                    label: item.label
                  }))}
                  selectedValues={selectedLearningItemIds}
                  onChange={(values) => {
                    const nextValues = values.slice(0, MAX_ACTIVITY_LEARNING_ITEMS);
                    setSelectedLearningItemIds(nextValues);
                    setActivityPromptInputs((current) => {
                      const nextInputs: ActivityPromptInputs = {};
                      nextValues.forEach((id) => {
                        const key = getQuestionPromptInputKey(type, id);
                        const item = learningItems.find((candidate) => candidate.id === id);
                        const savedPrompt = item ? getSavedQuestionPrompt(type, item, activityPromptStore) : undefined;
                        nextInputs[key] = current[key] ?? savedPrompt ?? "";
                      });
                      return nextInputs;
                    });
                    if (values.length > MAX_ACTIVITY_LEARNING_ITEMS) {
                      setLearningItemError(`Choose up to ${MAX_ACTIVITY_LEARNING_ITEMS} learning items only.`);
                      return;
                    }
                    if (learningItemError) setLearningItemError("");
                  }}
                  maxSelected={MAX_ACTIVITY_LEARNING_ITEMS}
                  maxSelectedMessage={`Limit reached: ${MAX_ACTIVITY_LEARNING_ITEMS} items.`}
                  emptyText={learningItemEmptyText}
                />
                <FieldError message={learningItemError} />
                {aiDraftNote ? <p className="mt-3 text-xs font-semibold text-blue-700">{aiDraftNote}</p> : null}
                {promptEditableActivity && selectedLearningItemsForForm.length ? (
                  <div className="mt-4 space-y-3 rounded-lg border border-blue-100 bg-skywash p-3">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {type === "fill-blank" ? "Fill-in-the-blank questions" : "Teacher questions"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {type === "fill-blank"
                          ? "Type one sentence for each card. Use ____ for the missing word."
                          : "Type one short question for each card."}
                      </p>
                    </div>
                    {selectedLearningItemsForForm.map((item) => {
                      const key = getQuestionPromptInputKey(type, item.id);
                      const value = activityPromptInputs[key] ?? "";
                      const validationMessage = validatePromptForActivity(type, item, value);

                      return (
                        <div key={key}>
                          <Label htmlFor={`activity-prompt-${item.id}`}>{item.label}</Label>
                          <Input
                            id={`activity-prompt-${item.id}`}
                            value={value}
                            onChange={(event) => {
                              setActivityPromptInputs((current) => ({ ...current, [key]: event.target.value }));
                              if (learningItemError) setLearningItemError("");
                              if (aiDraftNote) setAiDraftNote("");
                            }}
                            placeholder={type === "fill-blank" ? "Example: My ____ is here." : "Example: Which card shows family?"}
                          />
                          <FieldError message={validationMessage} />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>

              <section className="rounded-xl border border-blue-100 bg-white p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">3</span>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Name and save</h3>
                    <p className="text-xs text-slate-500">Name the activity and choose who can see it.</p>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
                  <div>
                    <Label htmlFor="activity-title">Activity name</Label>
                    <Input
                      id="activity-title"
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        if (error) setError("");
                      }}
                      placeholder="Example: Match greetings"
                    />
                    <FieldError message={error} />
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-skywash p-3">
                    <p className="text-sm font-bold text-ink">Visibility</p>
                    <label className="mt-3 flex min-h-12 items-center gap-3 rounded-lg bg-white p-3 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={privateActivity}
                        onChange={(event) => setPrivateActivity(event.target.checked)}
                        className="h-5 w-5"
                      />
                      Private to me
                    </label>
                    <FieldHint>{privateActivity ? "Only you can see it." : "Shared with teachers."}</FieldHint>
                  </div>
                </div>
              </section>
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
        isStudentMode ? (
          <StudentActivityPlayer
            activity={selectedActivity}
            activities={activities}
            learningItems={learningItems}
            answers={answers}
            result={result}
            dragged={dragged}
            setDragged={setDragged}
            chooseAnswer={chooseAnswer}
            onScore={scoreActivity}
            onClearResult={() => setResult(null)}
            onReset={() => resetPlayer()}
            onSelectActivity={openActivity}
          />
        ) : (
        <Card>
          <div>
            <CardTitle className="text-2xl">{selectedActivity.title}</CardTitle>
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
            <Button onClick={() => scoreActivity()}>
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
        )
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
                <h2 className="text-xl font-bold text-ink">Library</h2>
                <p className="mt-1 text-sm text-slate-600">Search and open an activity.</p>
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
                  className={`flex min-h-40 flex-col rounded-lg border bg-white p-4 shadow-sm ${
                    selectedActivity?.id === activity.id ? "border-blue-500 ring-2 ring-blue-100" : "border-blue-100"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink">{activity.title}</h3>
                    <Badge>{activity.visibility}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-blue-50 text-blue-700">{activityTypeLabels[activity.type]}</Badge>
                    <Badge className="bg-white text-blue-700">
                      {activity.questions.length} {activity.questions.length === 1 ? "question" : "questions"}
                    </Badge>
                    <Badge className="bg-white text-blue-700">
                      {activity.learningItemIds.length} {activity.learningItemIds.length === 1 ? "item" : "items"}
                    </Badge>
                  </div>
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
                  This removes the activity and its questions. This action cannot be undone.
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
      {activity.questions.map((question, index) => {
        const shouldShowSymbolOptions = activityUsesImageOptions(activity.type) || activity.type === "fill-blank";
        const promptLabel =
          activity.type === "match-word-symbol"
            ? "Word"
            : activity.type === "choose-correct-symbol"
              ? "Situation"
              : "Question";

        return (
        <div key={question.id} className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-blue-700">{promptLabel} {index + 1}</p>
          <p className={`mt-1 ${activity.type === "match-word-symbol" ? "text-2xl font-black text-ink" : "text-lg font-semibold"}`}>
            {question.prompt}
          </p>
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
                className={`${shouldShowSymbolOptions ? "min-h-36 flex-col p-3" : "min-h-16"} ${scoredClass}`}
              >
                {shouldShowSymbolOptions ? (
                  <>
                    <SymbolOption value={option} learningItems={learningItems} />
                    {activity.type === "fill-blank" ? <span className="mt-2 text-base font-black">{option}</span> : null}
                  </>
                ) : (
                  option
                )}
              </Button>
              );
            })}
          </div>
        </div>
        );
      })}
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
