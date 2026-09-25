import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity } from "@/types";
import type { Database } from "@/types/database";

// Activity create, edit, and delete. The client is passed in so the app (browser client) and the database
// tests (`scripts/test-activity-records-db.mjs`, signed-in test accounts) run the same code. Keep this file
// free of runtime `@/` imports: the tests load it directly.

type Tables = Database["public"]["Tables"];
type ActivityRow = Tables["activities"]["Row"];
type ActivityItemRow = Tables["activity_items"]["Row"];
type Client = SupabaseClient<Database>;

/** Shown when the database refuses a change (row-level security matches zero rows instead of erroring). */
export const ACTIVITY_CHANGE_REFUSED =
  "You can't change this activity. Only teachers can change activities, and a private activity only by the teacher who made it.";
export const ACTIVITY_DELETE_REFUSED =
  "You can't delete this activity. Only teachers can delete activities, and a private activity only by the teacher who made it.";

async function expectData<T>(
  request: PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<NonNullable<T>> {
  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }
  return data as NonNullable<T>;
}

export function mapActivity(row: ActivityRow, questions: ActivityItemRow[]): Activity {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    prompt: row.prompt,
    learningItemIds: row.learning_item_ids,
    visibility: row.visibility,
    createdBy: row.created_by,
    questions: questions
      .filter((question) => question.activity_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map((question) => ({
        id: question.id,
        prompt: question.prompt,
        answer: question.answer,
        options: question.options,
        learningItemId: question.learning_item_id
      }))
  };
}

function questionRows(activity: Activity) {
  return activity.questions.map((question, index) => ({
    id: question.id,
    activity_id: activity.id,
    prompt: question.prompt,
    answer: question.answer,
    options: question.options,
    learning_item_id: question.learningItemId,
    position: index
  }));
}

export async function insertActivityRecord(supabase: Client, activity: Activity) {
  const rows = (await expectData(
    supabase
      .from("activities")
      .insert({
        id: activity.id,
        title: activity.title,
        type: activity.type,
        prompt: activity.prompt,
        learning_item_ids: activity.learningItemIds,
        visibility: activity.visibility,
        created_by: activity.createdBy
      })
      .select()
  )) as ActivityRow[];
  const row = rows[0];
  if (!row) {
    throw new Error("You can't create activities. Only teachers can create them.");
  }

  if (activity.questions.length) {
    try {
      await expectData(supabase.from("activity_items").insert(questionRows({ ...activity, id: row.id })).select("id"));
    } catch (error) {
      // Compensate for a partial create so retrying does not leave duplicate activity records.
      await supabase.from("activities").delete().eq("id", row.id);
      throw error;
    }
  }

  return { ...mapActivity(row, []), questions: activity.questions };
}

export async function deleteActivityRecord(supabase: Client, activityId: string) {
  // The schema cascades this deletion to activity_items.
  const deletedRows = (await expectData(
    supabase.from("activities").delete().eq("id", activityId).select("id")
  )) as Array<{ id: string }>;

  if (!deletedRows.some((row) => row.id === activityId)) {
    throw new Error(ACTIVITY_DELETE_REFUSED);
  }
}

export async function updateActivityRecord(supabase: Client, activity: Activity, previousActivity: Activity) {
  const newQuestionRows = questionRows(activity);
  const previousQuestionRows = questionRows(previousActivity);
  const newQuestionIds = new Set(newQuestionRows.map((question) => question.id));
  const previousQuestionIds = previousQuestionRows.map((question) => question.id);
  const previousQuestionIdSet = new Set(previousQuestionIds);
  let activityChanged = false;

  try {
    // RLS refuses by matching zero rows rather than erroring, so check the count and say what happened.
    const rows = (await expectData(
      supabase
        .from("activities")
        .update({
          title: activity.title,
          type: activity.type,
          prompt: activity.prompt,
          learning_item_ids: activity.learningItemIds,
          visibility: activity.visibility,
          updated_at: new Date().toISOString()
        })
        .eq("id", activity.id)
        .select()
    )) as ActivityRow[];
    const row = rows[0];
    if (!row) {
      throw new Error(ACTIVITY_CHANGE_REFUSED);
    }
    activityChanged = true;

    if (newQuestionRows.length) {
      await expectData(supabase.from("activity_items").upsert(newQuestionRows).select("id"));
    }

    const staleQuestionIds = previousQuestionIds.filter((id) => !newQuestionIds.has(id));
    if (staleQuestionIds.length) {
      const deletedRows = (await expectData(
        supabase.from("activity_items").delete().in("id", staleQuestionIds).select("id")
      )) as Array<{ id: string }>;
      if (deletedRows.length !== staleQuestionIds.length) {
        throw new Error("Supabase did not replace every previous activity question.");
      }
    }

    return { ...mapActivity(row, []), questions: activity.questions };
  } catch (error) {
    // Nothing was written when the first update was refused, so there is nothing to roll back.
    if (!activityChanged) throw error;

    const insertedQuestionIds = newQuestionRows
      .map((question) => question.id)
      .filter((id) => !previousQuestionIdSet.has(id));
    if (insertedQuestionIds.length) {
      await supabase.from("activity_items").delete().in("id", insertedQuestionIds);
    }
    await supabase
      .from("activities")
      .update({
        title: previousActivity.title,
        type: previousActivity.type,
        prompt: previousActivity.prompt,
        learning_item_ids: previousActivity.learningItemIds,
        visibility: previousActivity.visibility
      })
      .eq("id", previousActivity.id);
    if (previousQuestionRows.length) {
      await supabase.from("activity_items").upsert(previousQuestionRows);
    }
    throw error;
  }
}
