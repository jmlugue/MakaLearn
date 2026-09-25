"use client";

import Link from "next/link";
import { Copy, Hand, Lock, Pencil, Trash2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AudioButton, CardImage } from "@/features/content/content-media";
import { KindBadge, PopupTitle, SectionLabel, deleteButtonClass, glassBoxClass, kindTone } from "@/features/content/content-shared";
import { SourceBadge } from "@/features/content/lesson-card";
import type { LearningItem, Lesson } from "@/types";

const chipClass = "inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-blue-100";

/** What a lesson holds: its materials (tap to hear). Shared by the preview and the form's Review. */
export function LessonPreviewBody({ items }: { items: LearningItem[] }) {
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

    </div>
  );
}

export function LessonMeta({
  lesson,
  creator
}: {
  lesson: Pick<Lesson, "source"> & Partial<Pick<Lesson, "visibility">>;
  creator?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SourceBadge source={lesson.source} />
      {lesson.visibility ? (
        <span className={chipClass}>
          {lesson.visibility === "private" ? <Lock className="h-3 w-3" aria-hidden="true" /> : <Users className="h-3 w-3" aria-hidden="true" />}
          {lesson.visibility === "private" ? "Private" : "Shared"}
        </span>
      ) : null}
      {creator ? (
        <span className={chipClass}>
          <User className="h-3 w-3" aria-hidden="true" />
          By {creator}
        </span>
      ) : null}
    </div>
  );
}

export function LessonPreviewDialog({
  lesson,
  items,
  creator,
  canEdit,
  onClose,
  onCopy,
  onEdit,
  onDelete
}: {
  lesson: Lesson | null;
  items: LearningItem[];
  creator: string;
  /** Teachers can manage shared lessons and their own private lessons. Admins are read-only. */
  canEdit: boolean;
  onClose: () => void;
  onCopy: (lesson: Lesson) => void;
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
            {canEdit ? (
              <Button type="button" variant="ghost" className={deleteButtonClass} onClick={() => onDelete(lesson)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </Button>
            ) : null}
            {!hasPecs ? (
              <Link
                href="/gesture-practice"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white/80 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                <Hand className="h-4 w-4" aria-hidden="true" />
                Practice gesture
              </Link>
            ) : null}
            {canEdit ? (
              <Button type="button" variant="outline" onClick={() => onCopy(lesson)}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Make a copy
              </Button>
            ) : null}
            {canEdit ? (
              <Button type="button" onClick={() => onEdit(lesson)}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Button>
            ) : null}
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
          <LessonPreviewBody items={items} />
        </div>
      ) : null}
    </Dialog>
  );
}
