"use client";

import { cn } from "@/lib/utils";
import { PictureBox } from "@/features/content/content-media";
import { kindTone } from "@/features/content/content-shared";
import type { Category, LearningItem } from "@/types";

/**
 * Library tile: the card is tinted in its kind color with a white picture well. Gestures show their name; PECS
 * keep it for screen readers and as a hover tooltip. Without `onOpen` it renders as a static preview.
 */
export function CardTile({
  item,
  category,
  onOpen,
  className
}: {
  item: Pick<LearningItem, "label" | "contentType" | "symbolImageUrl" | "audioUrl">;
  category?: Category;
  onOpen?: () => void;
  className?: string;
}) {
  const tone = kindTone(item.contentType);

  // PECS cards are picture only: the word is printed on the card art. Gesture pictures have no word, so their
  // name shows under the picture. Audio and category show when the card is opened.
  const showName = item.contentType === "gesture" && Boolean(item.label);
  const content = (
    <>
      <span className={cn("block h-1.5 w-full", tone.accent)} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col p-2.5">
        <PictureBox value={item.symbolImageUrl} label={item.label || "New"} className="rounded-xl bg-[#fff]" />
        {showName ? <span className={cn("mt-2 truncate text-center text-sm font-bold", tone.text)}>{item.label}</span> : null}
      </span>
    </>
  );

  const base = cn("group flex min-w-0 flex-col overflow-hidden rounded-2xl border text-left shadow-sm", tone.soft, tone.border);

  if (!onOpen) {
    return (
      <div className={cn(base, className)} title={item.label || undefined}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.label}`}
      title={item.label}
      className={cn(
        base,
        "transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(37,99,235,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
        tone.hoverBorder,
        className
      )}
    >
      {content}
    </button>
  );
}
