import type { Activity, Lesson } from "@/types";

/**
 * A lesson's practice step. The stored `relatedActivityId` wins; older rows (and databases that have not
 * run the migration adding that column) fall back to the id and title a lesson activity is saved with.
 */
export function findLessonActivity(lesson: Lesson, activities: Activity[]) {
  return (
    activities.find((activity) => activity.id === lesson.relatedActivityId) ??
    activities.find((activity) => activity.id === lessonActivityId(lesson)) ??
    activities.find((activity) => activity.id.startsWith("activity-lesson-") && activity.title === `${lesson.title} activity`)
  );
}

/** The lesson an activity belongs to, if any. */
export function findActivityLesson(activity: Activity, lessons: Lesson[], activities: Activity[]) {
  return lessons.find((lesson) => findLessonActivity(lesson, activities)?.id === activity.id);
}

/** Id given to an activity made for a lesson, so the link survives even without `relatedActivityId`. */
export function lessonActivityId(lesson: Pick<Lesson, "id">) {
  return `activity-${lesson.id}`;
}

/** Opens the full-screen player. */
export function activityPlayHref(activityId: string) {
  return `/activities?play=${encodeURIComponent(activityId)}`;
}
