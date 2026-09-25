"use client";

import { Hand, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardImage } from "@/features/content/content-media";
import { kindTone } from "@/features/content/content-shared";
import type { LearningItem, Lesson } from "@/types";

const STRIP_SIZE = 5;

/** Gesture lessons are practised in Gesture practice; the label says so on the row. */
export function PracticeLabel({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold text-sky-700", className)}>
      <Hand className="h-3.5 w-3.5" aria-hidden="true" />
      Gesture practice
    </span>
  );
}

/** One small numbered card, in lesson order. */
export function LessonStep({ item, index, className }: { item: LearningItem; index: number; className?: string }) {
  const tone = kindTone(item.contentType);
  return (
    <span className={cn("relative block aspect-[3/4] overflow-hidden rounded-xl border", tone.soft, tone.border, className)} title={item.label}>
      <span className="absolute inset-1 rounded-lg bg-[#fff]">
        <CardImage value={item.symbolImageUrl} label={item.label} className="p-0.5 text-[10px] leading-tight" />
      </span>
      <span className="absolute left-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span>
    </span>
  );
}

/** A lesson as one wide plan row: title and description on the left, its cards in order on the right. */
export function LessonCard({
  lesson,
  items,
  creator,
  onOpen
}: {
  lesson: Lesson;
  items: LearningItem[];
  /** Shown for shared lessons made by someone else. */
  creator?: string;
  onOpen: () => void;
}) {
  const shown = items.slice(0, STRIP_SIZE);
  const extra = items.length - shown.length;
  const hasPecs = items.some((item) => item.contentType === "pecs");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] p-4 pl-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(37,99,235,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 md:flex-row md:items-center"
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-blue-600" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-lg font-bold leading-snug text-ink group-hover:text-blue-700">{lesson.title}</span>
        {lesson.objective ? <span className="mt-0.5 line-clamp-1 text-sm leading-6 text-slate-500">{lesson.objective}</span> : null}
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
          <span>
            {items.length} {items.length === 1 ? "card" : "cards"}
          </span>
          {lesson.visibility === "private" ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Private
            </span>
          ) : null}
          {creator ? <span>By {creator}</span> : null}
          {hasPecs ? null : <PracticeLabel />}
        </span>
      </span>
      <ol className="flex shrink-0 items-center gap-2" aria-label="Cards in order">
        {shown.map((item, index) => (
          <li key={item.id} className="w-12">
            <LessonStep item={item} index={index} />
          </li>
        ))}
        {extra > 0 ? (
          <li className="grid aspect-[3/4] w-12 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">+{extra}</li>
        ) : null}
      </ol>
    </button>
  );
}
