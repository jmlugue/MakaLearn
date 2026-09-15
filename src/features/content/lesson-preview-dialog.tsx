"use client";

import Link from "next/link";
import { Pencil, PlayCircle, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AudioButton, CardImage } from "@/features/content/content-media";
import { KindBadge, splitSteps } from "@/features/content/content-shared";
import { PracticeLabel, SourceBadge } from "@/features/content/lesson-card";
import type { LearningItem, Lesson } from "@/types";

/** What a lesson does: goal, numbered steps, cards (tap to hear), and practice. Shared by the preview and the form's Review step. */
export function LessonPreviewBody({
  objective,
  steps,
  items,
  activityType
}: {
  objective: string;
  steps: string[];
  items: LearningItem[];
  activityType: Lesson["activityType"];
}) {
  const hasPecs = items.some((item) => item.contentType === "pecs");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
          <Target className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Goal</p>
          <p className="mt-0.5 text-sm font-semibold leading-6 text-ink">{objective || "No goal yet"}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Steps</p>
        <ol className="mt-2 space-y-2">
          {steps.map((step, index) => (
            <li key={`${index}-${step}`} className="flex items-start gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#fff] text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                {index + 1}
              </span>
              <span className="pt-0.5 text-sm leading-6 text-slate-700">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Cards</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-xl border border-blue-100 bg-[#fff] p-2">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f8fbff]">
                <CardImage value={item.symbolImageUrl} label={item.label} className="p-0.5 text-[10px] leading-tight" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{item.label}</span>
                <KindBadge kind={item.contentType} className="mt-0.5 px-1.5 text-[9px]" />
              </span>
              <AudioButton value={item.audioUrl} label={item.label} className="h-7 w-7" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-[#fff] px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Practice</p>
        <PracticeLabel hasPecs={hasPecs} activityType={activityType} className="text-sm" />
      </div>
    </div>
  );
}

export function LessonPreviewDialog({
  lesson,
  items,
  activityHref,
  onClose,
  onEdit,
  onDelete
}: {
  lesson: Lesson | null;
  items: LearningItem[];
  activityHref: string;
  onClose: () => void;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}) {
  const hasPecs = items.some((item) => item.contentType === "pecs");

  return (
    <Dialog
      open={Boolean(lesson)}
      onClose={onClose}
      title={lesson?.title ?? ""}
      className="max-w-2xl"
      footer={
        lesson ? (
          <>
            <Button type="button" variant="ghost" className="mr-auto text-red-600 hover:bg-red-50" onClick={() => onDelete(lesson)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
            <Button type="button" variant="outline" onClick={() => onEdit(lesson)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
            <Link
              href={activityHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-gradient-to-br from-blue-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:shadow-[0_14px_30px_rgba(37,99,235,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              {hasPecs ? "Open activity" : "Practice gesture"}
            </Link>
          </>
        ) : null
      }
    >
      {lesson ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SourceBadge source={lesson.source} />
            <span className="text-xs font-semibold text-slate-400">
              {lesson.estimatedDuration} min · {items.length} {items.length === 1 ? "card" : "cards"}
            </span>
          </div>
          <LessonPreviewBody objective={lesson.objective} steps={splitSteps(lesson.instructions)} items={items} activityType={lesson.activityType} />
        </>
      ) : null}
    </Dialog>
  );
}
