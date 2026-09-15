"use client";

import { useRef } from "react";
import { PlayCircle, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardImage, isVideoUrl } from "@/features/content/content-media";
import { CategoryChip, KindBadge, kindTone } from "@/features/content/content-shared";
import type { Category, LearningItem } from "@/types";

/**
 * Library tile: type accent, picture, label, category, and an audio marker.
 * Gesture tiles with a video play a silent loop on hover. Without `onOpen` it renders as a static preview.
 */
export function CardTile({
  item,
  category,
  onOpen,
  previewVideoUrl,
  className
}: {
  item: Pick<LearningItem, "label" | "contentType" | "symbolImageUrl" | "gestureMediaUrl" | "audioUrl">;
  category?: Category;
  onOpen?: () => void;
  /** Staged video (blob URL) in the Add pop-up. It loops without hover. */
  previewVideoUrl?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = previewVideoUrl ?? (item.gestureMediaUrl && isVideoUrl(item.gestureMediaUrl) ? item.gestureMediaUrl : undefined);
  const tone = kindTone(item.contentType);

  const content = (
    <>
      <span className={cn("block h-1.5 w-full", tone.accent)} aria-hidden="true" />
      <span className="flex flex-1 flex-col p-2.5">
        <span className="flex items-center justify-between gap-2">
          <KindBadge kind={item.contentType} />
          {videoUrl ? <PlayCircle className={cn("h-4 w-4", tone.text)} aria-label="Has video" /> : null}
        </span>
        <span className={cn("relative mt-2 grid aspect-square w-full place-items-center overflow-hidden rounded-xl", tone.soft)}>
          {previewVideoUrl ? (
            <video src={previewVideoUrl} autoPlay muted loop playsInline className="h-full w-full object-cover" aria-hidden="true" />
          ) : videoUrl ? (
            <>
              <span className="absolute inset-0 transition-opacity duration-200 group-hover:opacity-0">
                {item.symbolImageUrl ? (
                  <CardImage value={item.symbolImageUrl} label={item.label} />
                ) : (
                  <video src={videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" aria-hidden="true" />
                )}
              </span>
              <video
                ref={videoRef}
                src={videoUrl}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            </>
          ) : (
            <CardImage value={item.symbolImageUrl} label={item.label || "New"} />
          )}
        </span>
        <span className="mt-2 flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{item.label || "Label"}</span>
          {item.audioUrl ? (
            <Volume2 className={cn("h-4 w-4 shrink-0", tone.text)} aria-label="Has audio" />
          ) : (
            <VolumeX className="h-4 w-4 shrink-0 text-slate-300" aria-label="No audio" />
          )}
        </span>
        <CategoryChip category={category} className="mt-1.5 self-start" />
      </span>
    </>
  );

  const base = "group flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] text-left shadow-sm";
  const hoverPlay = {
    onMouseEnter: () => {
      videoRef.current?.play().catch(() => undefined);
    },
    onMouseLeave: () => {
      if (!videoRef.current) return;
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  if (!onOpen) {
    return (
      <div className={cn(base, className)} {...hoverPlay}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.label}`}
      {...hoverPlay}
      className={cn(
        base,
        "transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(37,99,235,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
        className
      )}
    >
      {content}
    </button>
  );
}
