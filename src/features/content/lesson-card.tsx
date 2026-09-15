"use client";

import { Hand, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActivityTypeLabel } from "@/utils/activity-labels";
import { CardImage } from "@/features/content/content-media";
import type { LearningItem, Lesson } from "@/types";

export function SourceBadge({ source }: { source: Lesson["source"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        source === "manual" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
      )}
    >
      {source === "manual" ? "Manual" : "Auto-made"}
    </span>
  );
}

/** Practice line for a lesson: its activity type when it has PECS cards, otherwise gesture practice. */
export function PracticeLabel({ hasPecs, activityType, className }: { hasPecs: boolean; activityType: Lesson["activityType"]; className?: string }) {
  const Icon = hasPecs ? PlayCircle : Hand;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", hasPecs ? "text-blue-700" : "text-emerald-700", className)}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {hasPecs ? getActivityTypeLabel(activityType) : "Gesture practice"}
    </span>
  );
}

export function LessonCard({ lesson, items, onOpen }: { lesson: Lesson; items: LearningItem[]; onOpen: () => void }) {
  const shown = items.slice(0, 4);
  const extra = items.length - shown.length;
  const hasPecs = items.some((item) => item.contentType === "pecs");

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col rounded-2xl border border-blue-100 bg-[#fff] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(37,99,235,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
    >
      <span className="flex items-center justify-between gap-2">
        <SourceBadge source={lesson.source} />
        <span className="text-xs font-semibold text-slate-400">{lesson.estimatedDuration} min</span>
      </span>
      <span className="mt-3 line-clamp-2 text-lg font-bold leading-snug text-ink group-hover:text-blue-700">{lesson.title}</span>
      <span className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{lesson.objective}</span>
      <span className="mb-4 mt-4 flex items-center gap-2">
        {shown.map((item) => (
          <span key={item.id} className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl border border-blue-100 bg-[#f8fbff]" title={item.label}>
            <CardImage value={item.symbolImageUrl} label={item.label} className="p-1 text-[10px] leading-tight" />
          </span>
        ))}
        {extra > 0 ? (
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">+{extra}</span>
        ) : null}
      </span>
      <span className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <PracticeLabel hasPecs={hasPecs} activityType={lesson.activityType} />
        <span className="text-xs font-semibold text-slate-400">
          {items.length} {items.length === 1 ? "card" : "cards"}
        </span>
      </span>
    </button>
  );
}
