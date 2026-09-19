"use client";

import { Hand, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardImage } from "@/features/content/content-media";
import { kindTone } from "@/features/content/content-shared";
import type { LearningItem, Lesson } from "@/types";

export function SourceBadge({ source }: { source: Lesson["source"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        source === "manual" ? "bg-blue-100 text-blue-800" : "bg-sky-100 text-sky-800"
      )}
    >
      {source === "manual" ? "Manual" : "Auto-made"}
    </span>
  );
}

/** Gesture lessons are practised in Gesture practice; the label says so on the card. */
export function PracticeLabel({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700", className)}>
      <Hand className="h-4 w-4" aria-hidden="true" />
      Gesture practice
    </span>
  );
}

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
  const shown = items.slice(0, 4);
  const extra = items.length - shown.length;
  const hasPecs = items.some((item) => item.contentType === "pecs");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] p-4 pt-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(37,99,235,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-blue-400 to-sky-300" aria-hidden="true" />
      <span className="flex items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-1.5">
          <SourceBadge source={lesson.source} />
          {lesson.visibility === "private" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Private
            </span>
          ) : null}
        </span>
      </span>
      <span className="mt-3 line-clamp-2 text-lg font-bold leading-snug text-ink group-hover:text-blue-700">{lesson.title}</span>
      <span className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{lesson.objective}</span>
      {creator ? <span className="mt-1 text-xs font-semibold text-slate-400">By {creator}</span> : null}
      <span className="mb-4 mt-4 flex items-center gap-2">
        {shown.map((item) => (
          <span
            key={item.id}
            className={cn("grid h-12 w-12 place-items-center overflow-hidden rounded-xl border", kindTone(item.contentType).soft, kindTone(item.contentType).border)}
            title={item.label}
          >
            <CardImage value={item.symbolImageUrl} label={item.label} className="p-1 text-[10px] leading-tight" />
          </span>
        ))}
        {extra > 0 ? <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">+{extra}</span> : null}
      </span>
      <span className="mt-auto flex items-center justify-between gap-2 border-t border-blue-50 pt-3">
        {hasPecs ? <span /> : <PracticeLabel />}
        <span className="text-xs font-semibold text-slate-400">
          {items.length} {items.length === 1 ? "material" : "materials"}
        </span>
      </span>
    </button>
  );
}
