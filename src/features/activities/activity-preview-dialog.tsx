"use client";

import { BookOpen, Hand, Lock, Pencil, Play, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ActivitySample } from "@/features/content/activity-sample";
import { AudioButton, CardImage } from "@/features/content/content-media";
import { PopupTitle, SectionLabel, deleteButtonClass, glassBoxClass, kindTone } from "@/features/content/content-shared";
import { ActivityTypeBadge } from "@/features/activities/activity-type-badge";
import type { Activity, LearningItem, Lesson } from "@/types";

const chipClass = "inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-blue-100";

/** What an activity is: its cards, where it came from, and a hover demo of how it plays. */
export function ActivityPreviewDialog({
  activity,
  items,
  pool,
  lesson,
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
  canManage: boolean;
  onClose: () => void;
  onPlay: (activity: Activity) => void;
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
            <Button type="button" onClick={() => onPlay(activity)}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Play
            </Button>
          </>
        ) : null
      }
    >
      {activity ? (
        <div className="space-y-4">
          <PopupTitle title={activity.title}>
            <ActivityTypeBadge type={activity.type} />
            <span className={chipClass}>
              {activity.visibility === "private" ? <Lock className="h-3 w-3" aria-hidden="true" /> : <Users className="h-3 w-3" aria-hidden="true" />}
              {activity.visibility === "private" ? "Private" : "Shared"}
            </span>
            {lesson ? (
              <span className={cn(chipClass, "text-blue-700")}>
                <BookOpen className="h-3 w-3" aria-hidden="true" />
                From {lesson.title}
              </span>
            ) : null}
          </PopupTitle>

          <div className={cn("p-4", glassBoxClass)}>
            <SectionLabel>
              {items.length} {items.length === 1 ? "Card" : "Cards"}
            </SectionLabel>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {items.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] shadow-sm">
                  <div className={cn("grid aspect-square place-items-center p-2", kindTone(item.contentType).soft)}>
                    <CardImage value={item.symbolImageUrl} label={item.label} className="text-sm" />
                  </div>
                  <div className="flex items-center gap-1.5 p-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.label}</span>
                    <AudioButton value={item.audioUrl} label={item.label} className="h-7 w-7" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-blue-100/70 via-blue-50/70 to-sky-50/80 p-4 ring-1 ring-blue-100">
            <SectionLabel className="mb-2">How it plays</SectionLabel>
            {activity.type !== "gesture-practice" && pecsItems.length ? (
              <ActivitySample key={activity.type} type={activity.type} items={pecsItems} pool={pool} />
            ) : (
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
                  <Hand className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-sm leading-6 text-slate-700">The learner copies each gesture. The teacher marks it done or asks for another try.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
