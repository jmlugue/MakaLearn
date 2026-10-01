"use client";

import { BookOpen, Eye, EyeOff, Lock, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardImage } from "@/features/content/content-media";
import { activityTypeTones } from "@/features/activities/activity-helpers";
import { ActivityTypeBadge } from "@/features/activities/activity-type-badge";
import type { Activity, LearningItem, Lesson } from "@/types";

/** Up to four of the activity's own pictures, with "+N" when there are more. */
export function ActivityCover({ activity, items, className }: { activity: Activity; items: LearningItem[]; className?: string }) {
  const shown = items.length > 4 ? items.slice(0, 3) : items.slice(0, 4);
  const extra = items.length - shown.length;
  const single = items.length === 1;

  return (
    <div className={cn("grid gap-1.5 p-2", activityTypeTones[activity.type].soft, single ? "grid-cols-1" : "grid-cols-2", className)}>
      {shown.map((item) => (
        <span key={item.id} className={cn("grid place-items-center overflow-hidden rounded-xl bg-white/90 shadow-sm", single ? "aspect-[2/1]" : "aspect-[4/3]")}>
          <CardImage value={item.symbolImageUrl} label={item.label} className="p-1.5 text-sm leading-tight" />
        </span>
      ))}
      {extra > 0 ? (
        <span className="grid aspect-[4/3] place-items-center rounded-xl bg-white/70 text-lg font-extrabold text-blue-700">+{extra}</span>
      ) : null}
      {!items.length ? (
        <span className="col-span-full grid aspect-[2/1] place-items-center rounded-xl bg-white/70 text-sm font-semibold text-slate-500">No cards</span>
      ) : null}
    </div>
  );
}

export function ActivityCard({
  activity,
  items,
  lesson,
  creator,
  onOpen,
  onPlay,
  hiddenFromStudents = false,
  onToggleStudents
}: {
  activity: Activity;
  items: LearningItem[];
  /** The lesson this activity is the practice step of. */
  lesson?: Lesson;
  /** Owner name, for shared activities made by someone else. */
  creator?: string;
  onOpen: () => void;
  /** Left out for admins, who can only view activities. */
  onPlay?: () => void;
  /** Hidden from this teacher's Student mode (the eye is closed). */
  hiddenFromStudents?: boolean;
  /** Teachers only: shows or hides the activity in Student mode. */
  onToggleStudents?: () => void;
}) {
  const isPrivate = activity.visibility === "private";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(37,99,235,0.12)]">
      {/* The whole card opens the preview; Preview sits above it as its own button. */}
      <button type="button" onClick={onOpen} className="absolute inset-0 z-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
        <span className="sr-only">Open {activity.title}</span>
      </button>
      <span className={cn("pointer-events-none h-1.5 w-full", activityTypeTones[activity.type].stripe)} aria-hidden="true" />
      <ActivityCover activity={activity} items={items} className={cn("pointer-events-none", hiddenFromStudents && "opacity-50 grayscale")} />
      {onToggleStudents ? (
        <button
          type="button"
          onClick={onToggleStudents}
          aria-pressed={!hiddenFromStudents}
          aria-label={hiddenFromStudents ? `Show ${activity.title} in Student mode` : `Hide ${activity.title} from Student mode`}
          title={hiddenFromStudents ? "Hidden in Student mode. Click to show." : "Shown in Student mode. Click to hide."}
          className={cn(
            "absolute right-2.5 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
            hiddenFromStudents ? "border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200" : "border-blue-100 bg-white text-blue-600 hover:bg-blue-50"
          )}
        >
          {hiddenFromStudents ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
        </button>
      ) : null}
      <div className="pointer-events-none flex flex-1 flex-col p-4">
        <span className="truncate text-lg font-bold leading-snug text-ink group-hover:text-blue-700" title={activity.title}>
          {activity.title}
        </span>
        <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-sm text-slate-500">
          <ActivityTypeBadge type={activity.type} />
          <span className="shrink-0">
            {items.length} {items.length === 1 ? "card" : "cards"}
          </span>
          {isPrivate ? (
            <span className="inline-flex shrink-0 items-center" title="Private">
              <Lock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              <span className="sr-only">Private</span>
            </span>
          ) : null}
          {creator ? <span className="min-w-0 truncate">· By {creator}</span> : null}
          {hiddenFromStudents ? <span className="shrink-0 text-xs font-semibold text-slate-500">· Hidden in Student mode</span> : null}
        </span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-3">
          {lesson ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-blue-700" title={`From ${lesson.title}`}>
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{lesson.title}</span>
            </span>
          ) : (
            <span />
          )}
          {onPlay ? (
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Preview ${activity.title}`}
            className="pointer-events-auto relative z-10 inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:shadow-[0_10px_24px_rgba(37,99,235,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <MonitorPlay className="h-4 w-4" aria-hidden="true" />
            Preview
          </button>
          ) : null}
        </span>
      </div>
    </article>
  );
}
