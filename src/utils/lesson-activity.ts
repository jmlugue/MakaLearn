import type { Activity, Lesson } from "@/types";

/**
 * A lesson holds many activities. The link lives in the activity id, so it needs no extra database column:
 * activities made for a lesson are saved as `activity-${lesson.id}--${timestamp}`. Older links still count:
 * the stored `relatedActivityId`, the one-to-one id `activity-${lesson.id}`, and the old title pattern.
 */
function belongsToLesson(activity: Activity, lesson: Lesson) {
  return (
    activity.id === lesson.relatedActivityId ||
    activity.id === lessonActivityId(lesson) ||
    activity.id.startsWith(`${lessonActivityId(lesson)}--`) ||
    (activity.id.startsWith("activity-lesson-") && activity.title === `${lesson.title} activity`)
  );
}

/** Every activity of a lesson, in library order. */
export function findLessonActivities(lesson: Lesson, activities: Activity[]) {
  return activities.filter((activity) => belongsToLesson(activity, lesson));
}

/** The first activity of a lesson, for callers that only need one. */
export function findLessonActivity(lesson: Lesson, activities: Activity[]) {
  return activities.find((activity) => belongsToLesson(activity, lesson));
}

/** The lesson an activity belongs to, if any. */
export function findActivityLesson(activity: Activity, lessons: Lesson[]) {
  return lessons.find((lesson) => belongsToLesson(activity, lesson));
}

/** The old one-to-one id of a lesson's activity. */
export function lessonActivityId(lesson: Pick<Lesson, "id">) {
  return `activity-${lesson.id}`;
}

/** Id for a new activity that belongs to a lesson. */
export function newLessonActivityId(lesson: Pick<Lesson, "id">) {
  return `${lessonActivityId(lesson)}--${Date.now()}`;
}

/** Opens the full-screen player. */
export function activityPlayHref(activityId: string) {
  return `/activities?play=${encodeURIComponent(activityId)}`;
}

/** Everyone sees shared items; private ones only by their owner and admins. */
export function canSee(record: { visibility: "shared" | "private"; createdBy: string }, user: { id: string; role: string }) {
  return record.visibility === "shared" || record.createdBy === user.id || user.role === "admin";
}

/** A name not already taken: "Greetings (copy)", then "Greetings (copy 2)", and so on. */
export function uniqueCopyTitle(title: string, taken: string[]) {
  const names = new Set(taken.map((name) => name.trim().toLowerCase()));
  const base = `${title} (copy)`;
  if (!names.has(base.toLowerCase())) return base;
  for (let count = 2; ; count += 1) {
    const candidate = `${title} (copy ${count})`;
    if (!names.has(candidate.toLowerCase())) return candidate;
  }
}
