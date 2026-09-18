"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity as ActivityIcon, PlayCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingState } from "@/components/common/loading-state";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { GuideBanner } from "@/features/guide/guide-banner";
import { GuideTip } from "@/features/guide/guide-tip";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useStudentMode } from "@/features/student-mode/student-mode-context";
import { StudentActivityPlayer } from "@/features/activities/student-activity-player";
import { ActivityPlayerScreen } from "@/features/activities/player/activity-player-screen";
import { TeacherPlayer } from "@/features/activities/player/teacher-player";
import { ActivityLibrary } from "@/features/activities/activity-library";
import { ActivityPreviewDialog } from "@/features/activities/activity-preview-dialog";
import { ActivityFormDialog, type ActivityFormMode, type ActivityFormValues } from "@/features/activities/activity-form-dialog";
import {
  getActivityItems,
  getPromptStoreKey,
  getSavedQuestionPrompt,
  getValidActivityType,
  itemsOfActivity,
  upgradeStarterActivityPrompts,
  type ActivityPromptStore
} from "@/features/activities/activity-helpers";
import { insertAuditLog } from "@/lib/audit-logs";
import {
  createActivityQuestions,
  deleteActivity,
  fetchMakaLearnData,
  insertActivity,
  insertActivityResult,
  updateActivity,
  updateLesson,
  upsertActivityPromptTemplates
} from "@/lib/supabase/app-data";
import { buildDefaultActivityPrompt, canDraftQuestionPrompts } from "@/utils/activity-ai-draft";
import {
  normalizeActivitySymbolQuestions,
  resolveCanonicalLearningItemId
} from "@/utils/activity-symbol-options";
import { activityPlayHref, findLessonActivity } from "@/utils/lesson-activity";
import { ensurePecsManifestCategories } from "@/utils/pecs-content-library";
import { upgradeStarterLearningItemPrompts } from "@/utils/starter-learning-item-prompts";
import type { Activity, ActivityType, Category, LearningItem, Lesson } from "@/types";

type Score = { score: number; correct: number; incorrect: number };

function getInitialActivity(activities: Activity[], activityId?: string, activityType?: ActivityType) {
  const requested = activityId ? activities.find((activity) => activity.id === activityId) : undefined;
  return requested ?? (activityType ? activities.find((activity) => activity.type === activityType) : undefined) ?? activities[0];
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Activities has two faces. Teachers get a library of activity cards, a stepped creator, and a full-screen
 * player at `/activities?play=<id>`. Student mode goes straight to the player and switches activities
 * from inside it.
 */
export function ActivitiesView() {
  const { user } = useAuthUser();
  const { isStudentMode } = useStudentMode();
  const { notify } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // `activityId` is the older link format; it opens the player too.
  const playId = searchParams.get("play") ?? searchParams.get("activityId") ?? "";
  const requestedType = getValidActivityType(searchParams.get("type") ?? undefined);

  const [ready, setReady] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promptStore, setPromptStore] = useState<ActivityPromptStore>({});

  const [openActivityId, setOpenActivityId] = useState("");
  const [formMode, setFormMode] = useState<ActivityFormMode | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Player state. Student mode picks its activity here; teachers pick it through the URL.
  const [studentActivityId, setStudentActivityId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dragged, setDragged] = useState("");
  const [result, setResult] = useState<Score | null>(null);
  // Bumped by the teacher's Restart so the player also goes back to its first question.
  const [playerRound, setPlayerRound] = useState(0);
  const [progress, setProgress] = useState("");
  // True when the player was opened from the library, so Exit can go back instead of stacking history.
  const openedFromLibrary = useRef(false);

  useEffect(() => {
    let active = true;
    fetchMakaLearnData()
      .then((data) => {
        if (!active) return;
        const sourceItems = upgradeStarterLearningItemPrompts(data.learningItems);
        const nextItems = getActivityItems(sourceItems);
        setLearningItems(nextItems);
        setActivities(
          upgradeStarterActivityPrompts(data.activities).map((activity) =>
            normalizeActivitySymbolQuestions(activity, nextItems, sourceItems)
          )
        );
        setLessons(data.lessons);
        setCategories(ensurePecsManifestCategories(data.categories));
        setPromptStore(
          Object.fromEntries(
            data.promptTemplates.map((template) => [
              getPromptStoreKey(
                template.activityType,
                resolveCanonicalLearningItemId(template.learningItemId, nextItems, sourceItems)
              ),
              template.prompt
            ])
          )
        );
      })
      .catch(() => {
        if (!active) return;
        notify({ title: "Activities unavailable", description: "Activity records could not be loaded.", tone: "error" });
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [notify]);

  const itemById = useMemo(() => new Map(learningItems.map((item) => [item.id, item])), [learningItems]);
  const lessonByActivityId = useMemo(() => {
    const map = new Map<string, Lesson>();
    lessons.forEach((lesson) => {
      const activity = findLessonActivity(lesson, activities);
      if (activity && !map.has(activity.id)) map.set(activity.id, lesson);
    });
    return map;
  }, [activities, lessons]);
  const lessonOf = useCallback((activity: Activity) => lessonByActivityId.get(activity.id), [lessonByActivityId]);
  const reportProgress = useCallback((current: number, total: number) => setProgress(`${current} / ${total}`), []);

  const playingActivity = isStudentMode
    ? activities.find((activity) => activity.id === studentActivityId) ?? getInitialActivity(activities, playId, requestedType)
    : activities.find((activity) => activity.id === playId);
  const openActivity = activities.find((activity) => activity.id === openActivityId) ?? null;
  const editingActivity = formMode?.kind === "edit" ? formMode.activity : null;

  // A fresh start whenever a different activity is played.
  const playingId = playingActivity?.id ?? "";
  useEffect(() => {
    setAnswers({});
    setDragged("");
    setResult(null);
  }, [playingId]);

  // A player link to an activity that no longer exists falls back to the library.
  useEffect(() => {
    if (!ready || isStudentMode || !playId || playingActivity) return;
    notify({ title: "Activity not found", description: "It may have been deleted." });
    router.replace(pathname);
  }, [isStudentMode, notify, pathname, playId, playingActivity, ready, router]);

  function canManage(activity: Activity) {
    return user.role === "admin" || activity.createdBy === user.id || activity.visibility === "shared";
  }

  function log(action: "create" | "edit" | "delete", activity: Activity, detail: string) {
    insertAuditLog({ category: "content", action, actor: user, targetType: "activity", targetId: activity.id, targetTitle: activity.title, detail }).catch(
      () => undefined
    );
  }

  function play(activity: Activity) {
    setOpenActivityId("");
    openedFromLibrary.current = true;
    router.push(activityPlayHref(activity.id));
  }

  function exitPlayer() {
    if (openedFromLibrary.current) {
      openedFromLibrary.current = false;
      router.back();
      return;
    }
    router.replace(pathname);
  }

  function switchActivity(activityId: string) {
    if (isStudentMode) {
      setStudentActivityId(activityId);
      return;
    }
    router.replace(activityPlayHref(activityId));
  }

  function resetPlayer() {
    setAnswers({});
    setDragged("");
    setResult(null);
  }

  function restartPlayer() {
    resetPlayer();
    setPlayerRound((round) => round + 1);
  }

  function chooseAnswer(questionId: string, value: string) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setResult(null);
  }

  async function scoreActivity(questionIds?: string[]) {
    if (!playingActivity) return;
    const scored = questionIds?.length
      ? playingActivity.questions.filter((question) => questionIds.includes(question.id))
      : playingActivity.questions;
    const correct = scored.reduce((sum, question) => sum + (answers[question.id] === question.answer ? 1 : 0), 0);
    const incorrect = scored.length - correct;
    const score = scored.length ? Math.round((correct / scored.length) * 100) : 0;
    setResult({ score, correct, incorrect });
    try {
      await insertActivityResult({ activityId: playingActivity.id, teacherId: user.id, score, correctCount: correct, incorrectCount: incorrect, answers });
    } catch (error) {
      notify({ title: "Result not saved", description: errorText(error, "The activity result could not be saved."), tone: "error" });
    }
  }

  async function saveActivity(mode: ActivityFormMode, values: ActivityFormValues) {
    const selected = values.itemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
    const { type } = values;
    const promptOverrides: Record<string, string> = Object.fromEntries(
      selected.flatMap((item) => {
        const key = getPromptStoreKey(type, item.id);
        const prompt = values.promptInputs[key]?.trim() || getSavedQuestionPrompt(type, item, promptStore);
        return prompt ? [[key, prompt]] : [];
      })
    );

    if (canDraftQuestionPrompts(type)) {
      try {
        await upsertActivityPromptTemplates(
          selected.flatMap((item) => {
            const prompt = promptOverrides[getPromptStoreKey(type, item.id)];
            return prompt ? [{ activityType: type, learningItemId: item.id, prompt, source: "manual" as const, createdBy: user.id }] : [];
          })
        );
        setPromptStore((current) => ({ ...current, ...promptOverrides }));
      } catch (error) {
        notify({ title: "Questions not saved", description: errorText(error, "Reusable questions could not be saved."), tone: "error" });
        return false;
      }
    }

    const previous = mode.kind === "edit" ? mode.activity : null;
    const next: Activity = {
      id: previous?.id ?? `activity-${Date.now()}`,
      title: values.title,
      type,
      prompt: buildDefaultActivityPrompt(type),
      learningItemIds: selected.map((item) => item.id),
      questions: createActivityQuestions(type, selected, learningItems, promptOverrides),
      visibility: values.isPrivate ? "private" : "shared",
      createdBy: previous?.createdBy ?? user.id
    };

    let saved: Activity;
    try {
      saved = previous ? await updateActivity(next, previous) : await insertActivity(next);
    } catch (error) {
      notify({ title: "Activity not saved", description: errorText(error, "The activity could not be saved."), tone: "error" });
      return false;
    }

    setActivities((current) => (previous ? current.map((activity) => (activity.id === saved.id ? saved : activity)) : [saved, ...current]));
    log(previous ? "edit" : "create", saved, previous ? "Updated an activity." : "Created an activity.");
    if (previous && playingActivity?.id === saved.id) resetPlayer();

    // One lesson, one activity: a format changed here is also the lesson's format, so saving the lesson
    // later does not switch it back.
    const lesson = previous ? lessonOf(previous) : undefined;
    if (lesson && lesson.activityType !== saved.type) {
      try {
        const updatedLesson = await updateLesson({ ...lesson, activityType: saved.type }, lesson);
        setLessons((current) => current.map((candidate) => (candidate.id === updatedLesson.id ? updatedLesson : candidate)));
      } catch {
        // The lesson form also starts from the linked activity's format, so a failed write is harmless.
      }
    }

    notify({ title: previous ? "Activity updated" : "Activity created", tone: "success" });
    return true;
  }

  async function confirmDelete() {
    const activity = activityToDelete;
    if (!activity) return;
    setDeleting(true);
    try {
      await deleteActivity(activity.id);
    } catch (error) {
      notify({ title: "Activity not deleted", description: errorText(error, "The activity could not be deleted."), tone: "error" });
      setDeleting(false);
      return;
    }
    setActivities((current) => current.filter((candidate) => candidate.id !== activity.id));
    log("delete", activity, "Deleted an activity.");
    setActivityToDelete(null);
    setOpenActivityId("");
    setDeleting(false);
    notify({ title: "Activity deleted", tone: "success" });
    if (playId === activity.id) router.replace(pathname);
  }

  const player = playingActivity ? (
    <StudentActivityPlayer
      activity={playingActivity}
      activities={activities}
      learningItems={learningItems}
      answers={answers}
      result={result}
      dragged={dragged}
      setDragged={setDragged}
      chooseAnswer={chooseAnswer}
      onScore={scoreActivity}
      onClearResult={() => setResult(null)}
      onReset={resetPlayer}
      onSelectActivity={switchActivity}
    />
  ) : null;

  const deleteLesson = activityToDelete ? lessonOf(activityToDelete) : undefined;
  const dialogs = (
    <>
      <ActivityPreviewDialog
        activity={openActivity}
        items={openActivity ? itemsOfActivity(openActivity, itemById) : []}
        pool={learningItems}
        lesson={openActivity ? lessonOf(openActivity) : undefined}
        canManage={Boolean(openActivity && canManage(openActivity))}
        onClose={() => setOpenActivityId("")}
        onPlay={play}
        onEdit={(activity) => {
          setOpenActivityId("");
          setFormMode({ kind: "edit", activity });
        }}
        onDelete={setActivityToDelete}
      />
      <ActivityFormDialog
        mode={formMode}
        items={learningItems}
        categories={categories}
        promptStore={promptStore}
        lessonOfActivity={editingActivity ? lessonOf(editingActivity) : undefined}
        onPromptStoreChange={(patch) => setPromptStore((current) => ({ ...current, ...patch }))}
        onClose={() => setFormMode(null)}
        onSave={saveActivity}
      />
      <ConfirmDialog
        open={Boolean(activityToDelete)}
        title={`Delete ${activityToDelete?.title ?? "activity"}?`}
        description={
          deleteLesson
            ? `It is the practice step of ${deleteLesson.title}. The lesson stays and can make a new one.`
            : "This removes the activity and its questions."
        }
        confirmLabel="Delete activity"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setActivityToDelete(null)}
      />
    </>
  );

  if (isStudentMode) {
    if (!ready) return <LoadingState label="Loading activities" />;
    return player ?? <EmptyState icon={PlayCircle} title="No activities yet" description="Ask your teacher to add an activity." />;
  }

  return (
    <>
      <PageHeader
        title="Activities"
        icon={ActivityIcon}
        actions={
          <GuideTip id="activities.create">
            <Button type="button" onClick={() => setFormMode({ kind: "new" })} disabled={!ready}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create activity
            </Button>
          </GuideTip>
        }
      />
      <GuideBanner pageKey="activities" />

      {!ready ? (
        <LoadingState label="Loading activities" />
      ) : (
        <ActivityLibrary
          activities={activities}
          itemById={itemById}
          lessonOf={lessonOf}
          onOpen={(activity) => setOpenActivityId(activity.id)}
          onPlay={play}
        />
      )}

      {playingActivity ? (
        <ActivityPlayerScreen
          title={playingActivity.title}
          type={playingActivity.type}
          progress={progress}
          onExit={exitPlayer}
          onReset={restartPlayer}
          onEdit={canManage(playingActivity) ? () => setFormMode({ kind: "edit", activity: playingActivity }) : undefined}
        >
          <TeacherPlayer
            key={`${playingActivity.id}-${playerRound}`}
            activity={playingActivity}
            learningItems={learningItems}
            answers={answers}
            result={result}
            dragged={dragged}
            setDragged={setDragged}
            chooseAnswer={chooseAnswer}
            onScore={scoreActivity}
            onRestart={restartPlayer}
            onExit={exitPlayer}
            onProgress={reportProgress}
          />
        </ActivityPlayerScreen>
      ) : null}

      {dialogs}
    </>
  );
}
