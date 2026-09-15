"use client";

import { PlayCircle, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardImage, isVideoUrl } from "@/features/content/content-media";
import { CategoryChip, KindBadge, kindMeta } from "@/features/content/content-shared";
import type { Category, LearningItem } from "@/types";

/** Library tile: type accent, picture, label, category, and an audio marker. Without `onOpen` it renders as a static preview. */
export function CardTile({
  item,
  category,
  onOpen,
  className
}: {
  item: Pick<LearningItem, "label" | "contentType" | "symbolImageUrl" | "gestureMediaUrl" | "audioUrl">;
  category?: Category;
  onOpen?: () => void;
  className?: string;
}) {
  const hasVideo = Boolean(item.gestureMediaUrl && isVideoUrl(item.gestureMediaUrl));
  const content = (
    <>
      <span className={cn("block h-1.5 w-full", kindMeta[item.contentType].accent)} aria-hidden="true" />
      <span className="flex flex-1 flex-col p-2.5">
        <span className="flex items-center justify-between gap-2">
          <KindBadge kind={item.contentType} />
          {hasVideo ? <PlayCircle className="h-4 w-4 text-emerald-600" aria-label="Has video" /> : null}
        </span>
        <span className="mt-2 grid aspect-square w-full place-items-center overflow-hidden rounded-xl bg-[#f8fbff]">
          <CardImage value={item.symbolImageUrl} label={item.label || "New card"} />
        </span>
        <span className="mt-2 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{item.label || "Card label"}</span>
          {item.audioUrl ? (
            <Volume2 className="h-4 w-4 shrink-0 text-blue-600" aria-label="Has audio" />
          ) : (
            <VolumeX className="h-4 w-4 shrink-0 text-slate-300" aria-label="No audio" />
          )}
        </span>
        <CategoryChip category={category} className="mt-1.5 self-start" />
      </span>
    </>
  );

  const base = "flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] text-left shadow-sm";

  if (!onOpen) {
    return <div className={cn(base, className)}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.label}`}
      className={cn(
        base,
        "transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(37,99,235,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
        className
      )}
    >
      {content}
    </button>
  );
}
