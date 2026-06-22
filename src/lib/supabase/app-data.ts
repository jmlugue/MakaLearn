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
    // Future Supabase: add a content_type column so PECS and gesture records
    // are separated in the database instead of inferred locally.
    contentType: getLearningItemContentType(row),
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

export async function insertLearningItem(item: LearningItem) {
  const supabase = getClientOrThrow();
  const row = (await expectData(
    supabase
      .from("learning_items")
      .insert({
        id: item.id,
        label: item.label,
        category_id: item.categoryId,
        description: item.description,
        instruction: item.instruction,
        symbol_image_url: item.symbolImageUrl ?? null,
        gesture_media_url: item.gestureMediaUrl ?? null,
        audio_url: item.audioUrl ?? null,
        tags: item.tags,
        created_by: item.createdBy,
        updated_at: item.updatedAt
      })
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

  // The schema cascades this deletion to activity_items and activity_results.
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

  try {
    if (newQuestionRows.length) {
      await expectData(supabase.from("activity_items").insert(newQuestionRows));
    }

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

    const previousQuestionIds = previousActivity.questions.map((question) => question.id);
    if (previousQuestionIds.length) {
      const deletedRows = (await expectData(
        supabase.from("activity_items").delete().in("id", previousQuestionIds).select("id")
      )) as Array<{ id: string }>;
      if (deletedRows.length !== previousQuestionIds.length) {
        throw new Error("Supabase did not replace every previous activity question.");
      }
    }

    return { ...mapActivity(row, []), questions: activity.questions };
  } catch (error) {
    const newQuestionIds = activity.questions.map((question) => question.id);
    if (newQuestionIds.length) {
      await supabase.from("activity_items").delete().in("id", newQuestionIds);
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

export function createActivityQuestions(
  type: Activity["type"],
  selectedItems: LearningItem[],
  optionPool: LearningItem[] = selectedItems
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
        prompt: createAdaptivePrompt(type, item),
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
      prompt: createAdaptivePrompt(type, item),
      answer: usesSymbolOptions ? item.symbolImageUrl ?? item.label : item.label,
      options,
      learningItemId: item.id
    };
  });
}

function createAdaptivePrompt(type: Activity["type"], item: LearningItem) {
  if (type === "gesture-practice") {
    return `Practise “${item.label}” with teacher guidance.`;
  }

  if (type === "fill-blank") {
    return createFillBlankPrompt(item);
  }

  if (type === "choose-correct-symbol") {
    return `Choose the PECS card for "${item.label}".`;
  }

  if (type === "simple-quiz") {
    return `Which PECS word fits this classroom use: ${item.description}`;
  }

  if (type === "drag-drop-symbol") {
    return item.label;
  }

  return `Match "${item.label}" to its PECS card.`;
}

function createFillBlankPrompt(item: LearningItem) {
  const label = item.label.trim();
  const normalized = label.toLowerCase();

  if (["hello", "hi"].includes(normalized)) return "Say ____ when greeting someone.";
  if (["yes", "no"].includes(normalized)) return "Answer ____ when making a choice.";
  if (normalized.includes("help")) return "I need ____.";
  if (normalized.includes("eat") || normalized.includes("food")) return "I want to ____.";
  if (normalized.includes("drink") || normalized.includes("water")) return "I want to ____.";
  if (normalized.includes("more")) return "I want ____.";
  if (normalized.includes("stop")) return "Please ____.";
  if (normalized.includes("toilet")) return "I need the ____.";

  const firstSentence = item.description.split(/[.!?]/)[0]?.trim();
  return firstSentence ? `${firstSentence}: ____.` : `Choose the word ____ when it matches the card.`;
}

function getLearningItemContentType(row: LearningItemRow): LearningItem["contentType"] {
  return row.tags.includes("gesture") ? "gesture" : "pecs";
}
