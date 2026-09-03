import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapMediaAssetRow } from "@/lib/supabase/media";
import { createFillBlankPromptForLabel } from "@/utils/fill-blank-prompts";
import { createChooseCorrectSymbolPrompt } from "@/utils/starter-learning-item-prompts";
import type {
  Activity,
  ActivityPromptTemplate,
  ActivityQuestion,
  ActivityResult,
  AppUser,
  Category,
  Learner,
  LearningItem,
  Lesson,
  MediaAsset,
  PracticeAttempt,
  UserSettings
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
type ActivityPromptTemplateRow = Tables["activity_prompt_templates"]["Row"];
type ActivityResultRow = Tables["activity_results"]["Row"];
type PracticeAttemptRow = Tables["practice_attempts"]["Row"];
type UserSettingsRow = Tables["user_settings"]["Row"];

export type MakaLearnData = {
  users: AppUser[];
  learners: Learner[];
  categories: Category[];
  learningItems: LearningItem[];
  mediaAssets: MediaAsset[];
  lessons: Lesson[];
  activities: Activity[];
  promptTemplates: ActivityPromptTemplate[];
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
    contentType: row.content_type,
    label: row.label,
    categoryId: row.category_id,
    description: row.description,
    instruction: row.instruction,
    symbolImageUrl: row.symbol_image_url ?? undefined,
    gestureMediaUrl: row.gesture_media_url ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    sentenceRole: row.sentence_role ?? undefined,
    tags: row.tags,
    createdBy: row.created_by,
    updatedAt: row.updated_at
  };
}

function mapActivityPromptTemplate(row: ActivityPromptTemplateRow): ActivityPromptTemplate {
  return {
    id: row.id,
    activityType: row.activity_type,
    learningItemId: row.learning_item_id,
    prompt: row.prompt,
    source: row.source,
    createdBy: row.created_by,
    updatedAt: row.updated_at
  };
}

function mapActivityResult(row: ActivityResultRow): ActivityResult {
  return {
    id: row.id,
    activityId: row.activity_id,
    learnerId: row.learner_id ?? undefined,
    teacherId: row.teacher_id,
    score: row.score,
    correctCount: row.correct_count,
    incorrectCount: row.incorrect_count,
    answers: typeof row.answers === "object" && row.answers ? (row.answers as Record<string, string>) : {},
    createdAt: row.created_at
  };
}

function mapPracticeAttempt(row: PracticeAttemptRow): PracticeAttempt {
  return {
    id: row.id,
    learnerId: row.learner_id ?? undefined,
    learningItemId: row.learning_item_id,
    teacherId: row.teacher_id,
    status: row.status,
    feedback: row.feedback,
    createdAt: row.created_at
  };
}

function mapUserSettings(row: UserSettingsRow): UserSettings {
  return {
    userId: row.user_id,
    largeText: row.large_text,
    highContrast: row.high_contrast,
    reduceMotion: row.reduce_motion,
    audioGuidance: row.audio_guidance,
    theme: row.theme,
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

async function expectData<T>(
  request: PromiseLike<{ data: T | null; error: { message: string } | null }>
): Promise<NonNullable<T>> {
  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }
  return data as NonNullable<T>;
}

export async function fetchMakaLearnData(): Promise<MakaLearnData> {
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
    promptTemplates
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
    expectData(supabase.from("activity_prompt_templates").select("*").order("updated_at", { ascending: false }))
  ]);

  return {
    users: profiles.map(mapProfile),
    categories: categories.map(mapCategory),
    learners: learners.map(mapLearner),
    learningItems: learningItems.map(mapLearningItem),
    mediaAssets: mediaAssets.map(mapMediaAssetRow),
    lessons: lessons.map((lesson) => mapLesson(lesson, lessonItems)),
    activities: activities.map((activity) => mapActivity(activity, activityItems)),
    promptTemplates: promptTemplates.map(mapActivityPromptTemplate)
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

export async function updateCategoryDetails(category: Category) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("categories")
      .update({
        name: category.name,
        description: category.description,
        color: category.color,
        updated_at: new Date().toISOString()
      })
      .eq("id", category.id)
      .select()
      .single()
  )) as CategoryRow;

  return mapCategory(row);
}

export async function deleteCategory(categoryId: string) {
  const supabase = getClientOrThrow();
  const deletedRows = (await expectData(
    supabase.from("categories").delete().eq("id", categoryId).select("id")
  )) as Array<{ id: string }>;

  if (!deletedRows.some((row) => row.id === categoryId)) {
    throw new Error("Supabase did not delete this category. Check the categories delete policy and try again.");
  }
}

export async function insertLearningItem(item: LearningItem) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("learning_items")
      .insert({
        id: item.id,
        content_type: item.contentType,
        label: item.label,
        category_id: item.categoryId,
        description: item.description,
        instruction: item.instruction,
        symbol_image_url: item.symbolImageUrl ?? null,
        gesture_media_url: item.gestureMediaUrl ?? null,
        audio_url: item.audioUrl ?? null,
        sentence_role: item.sentenceRole ?? null,
        tags: item.tags,
        created_by: item.createdBy,
        updated_at: item.updatedAt
      })
      .select()
      .single()
  )) as LearningItemRow;

  return mapLearningItem(row);
}

export async function updateLearningItemDetails(item: LearningItem) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("learning_items")
      .update({
        label: item.label,
        content_type: item.contentType,
        category_id: item.categoryId,
        description: item.description,
        instruction: item.instruction,
        sentence_role: item.sentenceRole ?? null,
        tags: item.tags,
        updated_at: item.updatedAt
      })
      .eq("id", item.id)
      .select()
      .single()
  )) as LearningItemRow;

  return mapLearningItem(row);
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

export async function updateLesson(lesson: Lesson, previousLesson: Lesson) {
  const supabase = getClientOrThrow();
  const nextLessonItems = lesson.learningItemIds.map((learningItemId, index) => ({
    lesson_id: lesson.id,
    learning_item_id: learningItemId,
    position: index
  }));
  const previousLessonItems = previousLesson.learningItemIds.map((learningItemId, index) => ({
    lesson_id: previousLesson.id,
    learning_item_id: learningItemId,
    position: index
  }));
  const nextLearningItemIds = new Set(lesson.learningItemIds);
  const previousLearningItemIds = new Set(previousLesson.learningItemIds);

  try {
    const row = (await expectData(
      supabase
        .from("lessons")
        .update({
          title: lesson.title,
          objective: lesson.objective,
          instructions: lesson.instructions,
          activity_type: lesson.activityType,
          estimated_duration: lesson.estimatedDuration,
          notes: lesson.notes,
          source: lesson.source,
          visibility: lesson.visibility,
          updated_at: new Date().toISOString()
        })
        .eq("id", lesson.id)
        .select()
        .single()
    )) as LessonRow;

    if (nextLessonItems.length) {
      await expectData(supabase.from("lesson_items").upsert(nextLessonItems));
    }

    const staleLearningItemIds = previousLesson.learningItemIds.filter((id) => !nextLearningItemIds.has(id));
    if (staleLearningItemIds.length) {
      const deletedRows = (await expectData(
        supabase
          .from("lesson_items")
          .delete()
          .eq("lesson_id", lesson.id)
          .in("learning_item_id", staleLearningItemIds)
          .select("learning_item_id")
      )) as Array<{ learning_item_id: string }>;
      if (deletedRows.length !== staleLearningItemIds.length) {
        throw new Error("Supabase did not replace every previous lesson item.");
      }
    }

    return { ...mapLesson(row, []), learningItemIds: lesson.learningItemIds };
  } catch (error) {
    const insertedLearningItemIds = lesson.learningItemIds.filter((id) => !previousLearningItemIds.has(id));
    if (insertedLearningItemIds.length) {
      await supabase
        .from("lesson_items")
        .delete()
        .eq("lesson_id", lesson.id)
        .in("learning_item_id", insertedLearningItemIds);
    }
    await supabase
      .from("lessons")
      .update({
        title: previousLesson.title,
        objective: previousLesson.objective,
        instructions: previousLesson.instructions,
        activity_type: previousLesson.activityType,
        estimated_duration: previousLesson.estimatedDuration,
        notes: previousLesson.notes,
        source: previousLesson.source,
        visibility: previousLesson.visibility
      })
      .eq("id", previousLesson.id);
    if (previousLessonItems.length) {
      await supabase.from("lesson_items").upsert(previousLessonItems);
    }
    throw error;
  }
}

export async function deleteLesson(lessonId: string) {
  const supabase = getClientOrThrow();

  await expectData(supabase.from("lesson_items").delete().eq("lesson_id", lessonId).select());
  const deletedRows = (await expectData(
    supabase.from("lessons").delete().eq("id", lessonId).select("id")
  )) as Array<{ id: string }>;

  if (!deletedRows.some((row) => row.id === lessonId)) {
    throw new Error("Supabase did not delete this lesson. Check the lessons delete policy and try again.");
  }
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
    try {
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
    } catch (error) {
      // Compensate for a partial create so retrying does not leave duplicate activity records.
      await supabase.from("activities").delete().eq("id", row.id);
      throw error;
    }
  }

  return { ...mapActivity(row, []), questions: activity.questions };
}

export async function deleteActivity(activityId: string) {
  const supabase = getClientOrThrow();

  // The schema cascades this deletion to activity_items.
  const deletedRows = (await expectData(
    supabase.from("activities").delete().eq("id", activityId).select("id")
  )) as Array<{ id: string }>;

  if (!deletedRows.some((row) => row.id === activityId)) {
    throw new Error("Supabase did not delete this activity. Check the activities delete policy and try again.");
  }
}

export async function updateActivity(activity: Activity, previousActivity: Activity) {
  const supabase = getClientOrThrow();
  const newQuestionRows = activity.questions.map((question, index) => ({
    id: question.id,
    activity_id: activity.id,
    prompt: question.prompt,
    answer: question.answer,
    options: question.options,
    learning_item_id: question.learningItemId,
    position: index
  }));
  const previousQuestionRows = previousActivity.questions.map((question, index) => ({
    id: question.id,
    activity_id: previousActivity.id,
    prompt: question.prompt,
    answer: question.answer,
    options: question.options,
    learning_item_id: question.learningItemId,
    position: index
  }));
  const newQuestionIds = new Set(newQuestionRows.map((question) => question.id));
  const previousQuestionIds = previousQuestionRows.map((question) => question.id);
  const previousQuestionIdSet = new Set(previousQuestionIds);

  try {
    const row = (await expectData(
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
        .single()
    )) as ActivityRow;

    if (newQuestionRows.length) {
      await expectData(supabase.from("activity_items").upsert(newQuestionRows));
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

export async function clearLearningItemMedia(learningItemId: string, type: MediaAsset["type"]) {
  const supabase = getClientOrThrow();
  const update =
    type === "symbol-image"
      ? { symbol_image_url: null, updated_at: new Date().toISOString() }
      : type === "gesture-media"
        ? { gesture_media_url: null, updated_at: new Date().toISOString() }
        : { audio_url: null, updated_at: new Date().toISOString() };

  await expectData(supabase.from("learning_items").update(update).eq("id", learningItemId).select());
  await expectData(supabase.from("media_assets").delete().eq("related_item_id", learningItemId).eq("type", type).select());
}

export async function deleteLearningItem(learningItemId: string, deleteMedia: boolean) {
  const supabase = getClientOrThrow();

  if (deleteMedia) {
    await expectData(supabase.from("media_assets").delete().eq("related_item_id", learningItemId).select());
  }

  await expectData(supabase.from("learning_items").delete().eq("id", learningItemId).select());
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

export async function updateProfileStatus(userId: string, status: AppUser["status"]) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("profiles")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select()
      .single()
  )) as ProfileRow;

  return mapProfile(row);
}

export async function fetchActivityPromptTemplates(
  activityType?: ActivityPromptTemplate["activityType"]
) {
  const supabase = getClientOrThrow();
  const query = supabase.from("activity_prompt_templates").select("*").order("updated_at", { ascending: false });
  const rows = (await expectData(
    activityType ? query.eq("activity_type", activityType) : query
  )) as ActivityPromptTemplateRow[];

  return rows.map(mapActivityPromptTemplate);
}

export async function upsertActivityPromptTemplates(
  prompts: Array<Pick<ActivityPromptTemplate, "activityType" | "learningItemId" | "prompt" | "createdBy"> & Partial<Pick<ActivityPromptTemplate, "source">>>
) {
  if (!prompts.length) return [];

  const supabase = getClientOrThrow();
  const now = new Date().toISOString();
  const rows = (await expectData(
    supabase
      .from("activity_prompt_templates")
      .upsert(
        prompts.map((prompt) => ({
          id: `${prompt.activityType}:${prompt.learningItemId}`,
          activity_type: prompt.activityType,
          learning_item_id: prompt.learningItemId,
          prompt: prompt.prompt,
          source: prompt.source ?? "manual",
          created_by: prompt.createdBy,
          updated_at: now
        })),
        { onConflict: "activity_type,learning_item_id" }
      )
      .select()
  )) as ActivityPromptTemplateRow[];

  return rows.map(mapActivityPromptTemplate);
}

export async function insertActivityResult(
  result: Omit<ActivityResult, "id" | "createdAt">
) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("activity_results")
      .insert({
        activity_id: result.activityId,
        learner_id: result.learnerId ?? null,
        teacher_id: result.teacherId,
        score: result.score,
        correct_count: result.correctCount,
        incorrect_count: result.incorrectCount,
        answers: result.answers
      })
      .select()
      .single()
  )) as ActivityResultRow;

  return mapActivityResult(row);
}

export async function insertPracticeAttempt(
  attempt: Omit<PracticeAttempt, "id" | "createdAt">
) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("practice_attempts")
      .insert({
        learner_id: attempt.learnerId ?? null,
        learning_item_id: attempt.learningItemId,
        teacher_id: attempt.teacherId,
        status: attempt.status,
        feedback: attempt.feedback
      })
      .select()
      .single()
  )) as PracticeAttemptRow;

  return mapPracticeAttempt(row);
}

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapUserSettings(data) : null;
}

export async function upsertUserSettings(settings: Omit<UserSettings, "updatedAt">) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("user_settings")
      .upsert({
        user_id: settings.userId,
        large_text: settings.largeText,
        high_contrast: settings.highContrast,
        reduce_motion: settings.reduceMotion,
        audio_guidance: settings.audioGuidance,
        theme: settings.theme,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
  )) as UserSettingsRow;

  return mapUserSettings(row);
}

export function createActivityQuestions(
  type: Activity["type"],
  selectedItems: LearningItem[],
  optionPool: LearningItem[] = selectedItems,
  promptOverrides: Record<string, string> = {}
): ActivityQuestion[] {
  const usesSymbolOptions =
    type === "match-word-symbol" || type === "choose-correct-symbol" || type === "drag-drop-symbol";
  const pecsOptionPool = optionPool.filter((item) => item.contentType === "pecs");
  const gestureOptionPool = optionPool.filter((item) => item.contentType === "gesture");
  const eligibleOptions =
    type === "gesture-practice"
      ? gestureOptionPool
      : usesSymbolOptions
        ? pecsOptionPool.filter((item) => item.symbolImageUrl)
        : pecsOptionPool;

  return selectedItems.map((item, index) => {
    if (type === "gesture-practice") {
      return {
        id: `q-${Date.now()}-${item.id}`,
        prompt: createAdaptivePrompt(type, item, promptOverrides),
        answer: "Completed with teacher",
        options: ["Completed with teacher", "Try again"],
        learningItemId: item.id
      };
    }

    const choiceItems = [item, ...eligibleOptions.filter((candidate) => candidate.id !== item.id)].slice(0, 3);
    const rotation = choiceItems.length ? index % choiceItems.length : 0;
    const rotatedChoices = [...choiceItems.slice(rotation), ...choiceItems.slice(0, rotation)];
    const options = rotatedChoices.map((candidate) =>
      usesSymbolOptions ? candidate.symbolImageUrl ?? candidate.label : candidate.label
    );

    return {
      id: `q-${Date.now()}-${item.id}`,
      prompt: createAdaptivePrompt(type, item, promptOverrides),
      answer: usesSymbolOptions ? item.symbolImageUrl ?? item.label : item.label,
      options,
      learningItemId: item.id
    };
  });
}

function createAdaptivePrompt(type: Activity["type"], item: LearningItem, promptOverrides: Record<string, string>) {
  const savedPrompt = promptOverrides[`${type}:${item.id}`];
  if (savedPrompt) return savedPrompt;

  if (type === "gesture-practice") {
    return `Practise "${item.label}" with teacher guidance.`;
  }

  if (type === "fill-blank") {
    return createFillBlankPrompt(item);
  }

  if (type === "choose-correct-symbol") {
    return createChooseCorrectSymbolPrompt(item);
  }

  if (type === "drag-drop-symbol") {
    return item.label;
  }

  return `Match the word "${item.label}" to its PECS card.`;
}

function createFillBlankPrompt(item: LearningItem) {
  return createFillBlankPromptForLabel(item.label);
}

