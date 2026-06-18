import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { mapMediaAssetRow } from "@/lib/supabase/media";
import type {
  Activity,
  ActivityQuestion,
  ActivityResult,
  AppUser,
  Category,
  Learner,
  LearningItem,
  Lesson,
  MediaAsset,
  PracticeAttempt
} from "@/types";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];
type ProfileRow = Tables["profiles"]["Row"];
type CategoryRow = Tables["categories"]["Row"];
type LearnerRow = Tables["learners"]["Row"];
type LearningItemRow = Tables["learning_items"]["Row"];
type LessonRow = Tables["lessons"]["Row"];
type LessonItemRow = Tables["lesson_items"]["Row"];
type ActivityRow = Tables["activities"]["Row"];
type ActivityItemRow = Tables["activity_items"]["Row"];
type PracticeAttemptRow = Tables["practice_attempts"]["Row"];
type ActivityResultRow = Tables["activity_results"]["Row"];

export type MakaLearnData = {
  users: AppUser[];
  learners: Learner[];
  categories: Category[];
  learningItems: LearningItem[];
  mediaAssets: MediaAsset[];
  lessons: Lesson[];
  activities: Activity[];
  practiceAttempts: PracticeAttempt[];
  activityResults: ActivityResult[];
};

function getClientOrThrow() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase is not configured. Add your project URL and anon key to .env.local.");
  }
  return supabase;
}

function mapProfile(row: ProfileRow): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    color: row.color,
    createdBy: row.created_by
  };
}

function mapLearner(row: LearnerRow): Learner {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gradeLevel: row.grade_level,
    communicationNeeds: row.communication_needs,
    preferredLearningMode: row.preferred_learning_mode,
    assignedTeacherId: row.assigned_teacher_id,
    profilePhotoUrl: row.profile_photo_url ?? "/placeholder-new",
    status: row.status
  };
}

function mapLearningItem(row: LearningItemRow): LearningItem {
  return {
    id: row.id,
    label: row.label,
    categoryId: row.category_id,
    description: row.description,
    instruction: row.instruction,
    symbolImageUrl: row.symbol_image_url ?? undefined,
    gestureMediaUrl: row.gesture_media_url ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    tags: row.tags,
    createdBy: row.created_by,
    updatedAt: row.updated_at
  };
}

function mapLesson(row: LessonRow, lessonItems: LessonItemRow[]): Lesson {
  return {
    id: row.id,
    title: row.title,
    objective: row.objective,
    instructions: row.instructions,
    activityType: row.activity_type,
    estimatedDuration: row.estimated_duration,
    notes: row.notes,
    source: row.source,
    visibility: row.visibility,
    createdBy: row.created_by,
    learningItemIds: lessonItems
      .filter((item) => item.lesson_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map((item) => item.learning_item_id)
  };
}

function mapActivity(row: ActivityRow, questions: ActivityItemRow[]): Activity {
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

function mapPracticeAttempt(row: PracticeAttemptRow): PracticeAttempt {
  return {
    id: row.id,
    learnerId: row.learner_id ?? undefined,
    learningItemId: row.learning_item_id,
    status: row.status,
    feedback: row.feedback,
    attemptedAt: row.attempted_at,
    savedBy: row.saved_by
  };
}

function mapActivityResult(row: ActivityResultRow): ActivityResult {
  return {
    id: row.id,
    learnerId: row.learner_id ?? undefined,
    activityId: row.activity_id,
    activityType: row.activity_type,
    scorePercentage: row.score_percentage,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    timeSpentSeconds: row.time_spent_seconds,
    completedAt: row.completed_at,
    relatedLearningItemIds: row.related_learning_item_ids,
    savedBy: row.saved_by
  };
}

async function expectData<T>(
  request: PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<NonNullable<T>> {
  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }
  return data as NonNullable<T>;
}

export async function fetchMakaLearnData(): Promise<MakaLearnData | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getClientOrThrow();
  const [
    profiles,
    categories,
    learners,
    learningItems,
    mediaAssets,
    lessons,
    lessonItems,
    activities,
    activityItems,
    practiceAttempts,
    activityResults
  ] = await Promise.all([
    expectData(supabase.from("profiles").select("*").order("name")),
    expectData(supabase.from("categories").select("*").order("name")),
    expectData(supabase.from("learners").select("*").order("name")),
    expectData(supabase.from("learning_items").select("*").order("label")),
    expectData(supabase.from("media_assets").select("*").order("uploaded_at", { ascending: false })),
    expectData(supabase.from("lessons").select("*").order("created_at", { ascending: false })),
    expectData(supabase.from("lesson_items").select("*").order("position")),
    expectData(supabase.from("activities").select("*").order("created_at", { ascending: false })),
    expectData(supabase.from("activity_items").select("*").order("position")),
    expectData(supabase.from("practice_attempts").select("*").order("attempted_at", { ascending: false })),
    expectData(supabase.from("activity_results").select("*").order("completed_at", { ascending: false }))
  ]);

  return {
    users: profiles.map(mapProfile),
    categories: categories.map(mapCategory),
    learners: learners.map(mapLearner),
    learningItems: learningItems.map(mapLearningItem),
    mediaAssets: mediaAssets.map(mapMediaAssetRow),
    lessons: lessons.map((lesson) => mapLesson(lesson, lessonItems)),
    activities: activities.map((activity) => mapActivity(activity, activityItems)),
    practiceAttempts: practiceAttempts.map(mapPracticeAttempt),
    activityResults: activityResults.map(mapActivityResult)
  };
}

export async function upsertLearner(learner: Learner) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("learners")
      .upsert({
        id: learner.id,
        name: learner.name,
        age: learner.age,
        grade_level: learner.gradeLevel,
        communication_needs: learner.communicationNeeds,
        preferred_learning_mode: learner.preferredLearningMode,
        assigned_teacher_id: learner.assignedTeacherId,
        profile_photo_url: learner.profilePhotoUrl,
        status: learner.status,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
  )) as LearnerRow;

  return mapLearner(row);
}

export async function insertCategory(category: Category) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("categories")
      .insert({
        id: category.id,
        name: category.name,
        description: category.description,
        color: category.color,
        created_by: category.createdBy
      })
      .select()
      .single()
  )) as CategoryRow;

  return mapCategory(row);
}

export async function insertLesson(lesson: Lesson) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("lessons")
      .insert({
        id: lesson.id,
        title: lesson.title,
        objective: lesson.objective,
        instructions: lesson.instructions,
        activity_type: lesson.activityType,
        estimated_duration: lesson.estimatedDuration,
        notes: lesson.notes,
        source: lesson.source,
        visibility: lesson.visibility,
        created_by: lesson.createdBy
      })
      .select()
      .single()
  )) as LessonRow;

  if (lesson.learningItemIds.length) {
    await expectData(
      supabase.from("lesson_items").insert(
        lesson.learningItemIds.map((learningItemId, index) => ({
          lesson_id: row.id,
          learning_item_id: learningItemId,
          position: index
        }))
      )
    );
  }

  return { ...mapLesson(row, []), learningItemIds: lesson.learningItemIds };
}

export async function insertActivity(activity: Activity) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
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
      .single()
  )) as ActivityRow;

  if (activity.questions.length) {
    await expectData(
      supabase.from("activity_items").insert(
        activity.questions.map((question, index) => ({
          id: question.id,
          activity_id: row.id,
          prompt: question.prompt,
          answer: question.answer,
          options: question.options,
          learning_item_id: question.learningItemId,
          position: index
        }))
      )
    );
  }

  return { ...mapActivity(row, []), questions: activity.questions };
}

export async function insertPracticeAttempt(attempt: PracticeAttempt) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("practice_attempts")
      .insert({
        id: attempt.id,
        learner_id: attempt.learnerId ?? null,
        learning_item_id: attempt.learningItemId,
        status: attempt.status,
        feedback: attempt.feedback,
        attempted_at: attempt.attemptedAt,
        saved_by: attempt.savedBy
      })
      .select()
      .single()
  )) as PracticeAttemptRow;

  return mapPracticeAttempt(row);
}

export async function insertActivityResult(result: ActivityResult) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("activity_results")
      .insert({
        id: result.id,
        learner_id: result.learnerId ?? null,
        activity_id: result.activityId,
        activity_type: result.activityType,
        score_percentage: result.scorePercentage,
        correct_count: result.correctCount,
        incorrect_count: result.incorrectCount,
        time_spent_seconds: result.timeSpentSeconds,
        completed_at: result.completedAt,
        related_learning_item_ids: result.relatedLearningItemIds,
        saved_by: result.savedBy
      })
      .select()
      .single()
  )) as ActivityResultRow;

  return mapActivityResult(row);
}

export async function updateLearningItemMedia(
  learningItemId: string,
  asset: Pick<MediaAsset, "type" | "publicUrl">
) {
  if (!asset.publicUrl) return;

  const supabase = getClientOrThrow();
  const update =
    asset.type === "symbol-image"
      ? { symbol_image_url: asset.publicUrl, updated_at: new Date().toISOString() }
      : asset.type === "gesture-media"
        ? { gesture_media_url: asset.publicUrl, updated_at: new Date().toISOString() }
        : { audio_url: asset.publicUrl, updated_at: new Date().toISOString() };

  await expectData(supabase.from("learning_items").update(update).eq("id", learningItemId).select());
}

export async function updateProfileRole(userId: string, role: AppUser["role"]) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single()
  )) as ProfileRow;

  return mapProfile(row);
}

export async function updateProfileDetails(userId: string, input: Pick<AppUser, "name" | "email">) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("profiles")
      .update({ name: input.name, email: input.email, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single()
  )) as ProfileRow;

  return mapProfile(row);
}

export function createActivityQuestions(type: Activity["type"], items: LearningItem[]): ActivityQuestion[] {
  return items.slice(0, 2).map((item) => ({
    id: `q-${Date.now()}-${item.id}`,
    prompt: type === "fill-blank" ? `I want to ____ (${item.label})` : item.label,
    answer:
      type === "gesture-practice"
        ? "Correct"
        : type === "match-word-symbol" || type === "choose-correct-symbol" || type === "drag-drop-symbol"
          ? item.symbolImageUrl ?? item.label
          : item.label,
    options:
      type === "gesture-practice"
        ? ["Correct", "Good attempt", "Needs practice"]
        : items.map((candidate) =>
            type === "match-word-symbol" || type === "choose-correct-symbol" || type === "drag-drop-symbol"
              ? candidate.symbolImageUrl ?? candidate.label
              : candidate.label
          ),
    learningItemId: item.id
  }));
}
