"use client";

import { BookOpen, Lock, Pencil, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ActivitySample } from "@/features/content/activity-sample";
import { AudioButton, CardImage } from "@/features/content/content-media";
import { PopupTitle, SectionLabel, deleteButtonClass, kindTone } from "@/features/content/content-shared";
import { ActivityTypeBadge } from "@/features/activities/activity-type-badge";
import type { Activity, LearningItem, Lesson } from "@/types";

/** What an activity is: how it plays, its cards, and where it came from. */
export function ActivityPreviewDialog({
  activity,
  items,
  pool,
  lesson,
  creator,
  canManage,
  onClose,
  onPlay,
  onEdit,
  onDelete
}: {
  activity: Activity | null;
  items: LearningItem[];
  pool: LearningItem[];
  lesson?: Lesson;
  /** Owner name, for shared activities made by someone else. */
  creator?: string;
  canManage: boolean;
  onClose: () => void;
  /** Left out for admins, who can only view activities. */
  onPlay?: (activity: Activity) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
}) {
  const pecsItems = items.filter((item) => item.contentType === "pecs");

  return (
    <Dialog
      open={Boolean(activity)}
      onClose={onClose}
      title={activity?.title ?? ""}
      className="max-w-3xl"
      hideHeader
      footer={
        activity ? (
          <>
            {canManage ? (
              <Button type="button" variant="ghost" className={deleteButtonClass} onClick={() => onDelete(activity)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            ) : null}
            {canManage ? (
              <Button type="button" variant="outline" onClick={() => onEdit(activity)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            ) : null}
            {onPlay ? (
              <Button type="button" onClick={() => onPlay(activity)}>
                <Play className="h-4 w-4" aria-hidden="true" />
                Play
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {activity ? (
        <div className="space-y-5">
          <PopupTitle title={activity.title}>
            <ActivityTypeBadge type={activity.type} />
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
              {lesson ? (
                <span className="inline-flex min-w-0 items-center gap-1 font-semibold text-blue-700">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">From {lesson.title}</span>
                </span>
              ) : null}
              {creator ? <span>By {creator}</span> : null}
              {activity.visibility === "private" ? (
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  Private
                </span>
              ) : null}
            </span>
          </PopupTitle>

          {pecsItems.length ? (
            <div className="rounded-2xl bg-gradient-to-br from-blue-100/70 via-blue-50/70 to-sky-50/80 p-4 ring-1 ring-blue-100">
              <SectionLabel className="mb-2">How it plays</SectionLabel>
              <ActivitySample key={activity.type} type={activity.type} items={pecsItems} pool={pool} canTry={Boolean(onPlay)} />
            </div>
          ) : null}

          <div>
            <SectionLabel className="mb-2">
              {items.length} {items.length === 1 ? "card" : "cards"}
            </SectionLabel>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {items.map((item) => (
                <li key={item.id} className="overflow-hidden rounded-xl border border-blue-100 bg-[#fff]">
                  <div className={cn("grid aspect-square place-items-center p-2", kindTone(item.contentType).soft)}>
                    <CardImage value={item.symbolImageUrl} label={item.label} className="text-sm" />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.label}</span>
                    <AudioButton value={item.audioUrl} label={item.label} className="h-7 w-7" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
