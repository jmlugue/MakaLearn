"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Clock, Hand, Link2, Pencil, PlayCircle, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ActivitySample } from "@/features/content/activity-sample";
import { AudioButton, CardImage } from "@/features/content/content-media";
import { KindBadge, PopupTitle, SectionLabel, deleteButtonClass, glassBoxClass, kindTone } from "@/features/content/content-shared";
import { SourceBadge } from "@/features/content/lesson-card";
import { activityPlayHref } from "@/utils/lesson-activity";
import { ActivityTypeBadge } from "@/features/activities/activity-type-badge";
import type { Activity, ActivityType, LearningItem, Lesson } from "@/types";

const primaryLinkClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:shadow-[0_14px_30px_rgba(37,99,235,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300";

/** The lesson's practice step: its linked activity, the gesture camera, or a prompt to make one. */
function PracticeRow({ hasPecs, activity }: { hasPecs: boolean; activity?: Activity }) {
  const Icon = !hasPecs ? Hand : activity ? Link2 : PlayCircle;
  return (
    <div className={cn("flex items-center gap-3 p-3", glassBoxClass)}>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", hasPecs ? "bg-blue-100 text-blue-700" : "bg-sky-100 text-sky-700")}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <SectionLabel>Practice</SectionLabel>
        <p className="truncate text-sm font-semibold text-ink">
          {!hasPecs ? "Gesture practice" : activity ? activity.title : "No activity yet"}
        </p>
      </div>
      {hasPecs && activity ? (
        <ActivityTypeBadge type={activity.type} className="shrink-0" />
      ) : null}
    </div>
  );
}

/** What a lesson does: materials (tap to hear), instructions, and a try-it sample of the activity. Shared by view and Review. */
export function LessonPreviewBody({
  instructions,
  items,
  pool,
  activityType,
  practiceControl
}: {
  instructions: string;
  items: LearningItem[];
  pool: LearningItem[];
  activityType: ActivityType;
  /** Optional control shown above the sample (the practice dropdown in the form). */
  practiceControl?: ReactNode;
}) {
  const pecsItems = items.filter((item) => item.contentType === "pecs");

  return (
    <div className="space-y-4">
      <div className={cn("p-4", glassBoxClass)}>
        <SectionLabel>Materials</SectionLabel>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {items.map((item) => {
            const tone = kindTone(item.contentType);
            return (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] shadow-sm">
                <div className={cn("grid aspect-square place-items-center p-2", tone.soft)}>
                  <CardImage value={item.symbolImageUrl} label={item.label} className="text-sm" />
                </div>
                <div className="flex items-center gap-1.5 p-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{item.label}</span>
                    <KindBadge kind={item.contentType} className="px-1.5 text-[9px]" />
                  </span>
                  <AudioButton value={item.audioUrl} label={item.label} className="h-7 w-7" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={cn("p-4", glassBoxClass)}>
        <SectionLabel>Instructions</SectionLabel>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{instructions || "No instructions yet."}</p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-blue-100/70 via-blue-50/70 to-sky-50/80 p-4 ring-1 ring-blue-100">
        <SectionLabel className="mb-2">How the activity goes</SectionLabel>
        {practiceControl}
        {pecsItems.length ? (
          <ActivitySample key={activityType} type={activityType} items={pecsItems} pool={pool} />
        ) : (
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
              <Hand className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm leading-6 text-slate-700">
              Gesture practice: the learner signs each gesture to the camera and gets feedback on their hand shape.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function LessonMeta({ lesson, creator }: { lesson: Pick<Lesson, "source" | "estimatedDuration">; creator?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SourceBadge source={lesson.source} />
      <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-blue-100">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {lesson.estimatedDuration} min
      </span>
      {creator ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-blue-100">
          <User className="h-3 w-3" aria-hidden="true" />
          {creator}
        </span>
      ) : null}
    </div>
  );
}

export function LessonPreviewDialog({
  lesson,
  items,
  pool,
  creator,
  activity,
  onClose,
  onCreateActivity,
  onEdit,
  onDelete
}: {
  lesson: Lesson | null;
  items: LearningItem[];
  pool: LearningItem[];
  creator: string;
  /** The lesson's linked activity, if it has one. */
  activity?: Activity;
  onClose: () => void;
  onCreateActivity: (lesson: Lesson) => void;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}) {
  const hasPecs = items.some((item) => item.contentType === "pecs");

  return (
    <Dialog
      open={Boolean(lesson)}
      onClose={onClose}
      title={lesson?.title ?? ""}
      description={lesson?.objective}
      className="max-w-3xl"
      hideHeader
      footer={
        lesson ? (
          <>
            <Button type="button" variant="ghost" className={deleteButtonClass} onClick={() => onDelete(lesson)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
            <Button type="button" variant="outline" onClick={() => onEdit(lesson)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
            {!hasPecs ? (
              <Link href="/gesture-practice" className={primaryLinkClass}>
                <Hand className="h-4 w-4" aria-hidden="true" />
                Practice gesture
              </Link>
            ) : activity ? (
              <Link href={activityPlayHref(activity.id)} className={primaryLinkClass}>
                <PlayCircle className="h-4 w-4" aria-hidden="true" />
                Play activity
              </Link>
            ) : (
              <Button type="button" onClick={() => onCreateActivity(lesson)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create activity
              </Button>
            )}
          </>
        ) : null
      }
    >
      {lesson ? (
        <div className="space-y-4">
          <PopupTitle title={lesson.title}>
            <LessonMeta lesson={lesson} creator={creator} />
          </PopupTitle>
          {lesson.objective ? <p className="-mt-2 text-sm leading-6 text-slate-600">{lesson.objective}</p> : null}
          <PracticeRow hasPecs={hasPecs} activity={activity} />
          <LessonPreviewBody instructions={lesson.instructions} items={items} pool={pool} activityType={activity?.type ?? lesson.activityType} />
        </div>
      ) : null}
    </Dialog>
  );
}
