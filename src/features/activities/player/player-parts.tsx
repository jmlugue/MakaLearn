"use client";

import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizePecsLabel, pecsCardManifest } from "@/data/pecs-card-manifest";
import { isEmbeddableActivityMediaUrl } from "@/utils/activity-symbol-options";
import { getLearningItemForValue, getDisplayLabel } from "@/features/activities/player/player-utils";
import type { LearningItem } from "@/types";

// Shared picture pieces for the players. Student mode game parts live in student-game-parts.tsx.

export function SymbolOption({
  value,
  learningItems,
  framed = true,
  preferNoTextPecs = false,
  className
}: {
  value: string;
  learningItems: LearningItem[];
  framed?: boolean;
  preferNoTextPecs?: boolean;
  className?: string;
}) {
  const item = getLearningItemForValue(value, learningItems);
  const imageValue = getSymbolImageValue(value, item, preferNoTextPecs);

  if (isEmbeddableActivityMediaUrl(imageValue)) {
    // The picture is positioned inside the box and scaled to fit. Sized by its own height, a tall PECS card
    // grew past the box and lost its word at the bottom.
    return (
      <span
        className={cn(
          "relative block h-20 min-h-0 w-full max-w-full min-w-0 sm:h-24",
          framed ? "overflow-hidden rounded-xl border border-slate-200 bg-white" : "overflow-hidden rounded-none bg-transparent",
          className
        )}
      >
        {/* Existing learning item media is rendered as supplied by the content library. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageValue}
          alt={item ? `${item.label} symbol` : "Learning item symbol"}
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid h-20 min-h-0 min-w-0 max-w-full place-items-center px-2 text-slate-400 sm:h-24",
        framed ? "rounded-xl border border-blue-100 bg-[#f8fbff] shadow-inner" : "rounded-none bg-transparent",
        className
      )}
    >
      <span className="grid place-items-center gap-1" aria-hidden="true">
        <ImageOff className="h-7 w-7" />
        <span className="text-xs font-bold">Picture unavailable</span>
      </span>
      <span className="sr-only">{getDisplayLabel(value, learningItems)} symbol image unavailable</span>
    </span>
  );
}

function getSymbolImageValue(value: string, item: LearningItem | undefined, preferNoTextPecs: boolean) {
  if (!preferNoTextPecs) return item?.symbolImageUrl || value;

  const noTextUrl = getNoTextPecsImageUrl(value, item);
  return noTextUrl || item?.symbolImageUrl || value;
}

function getNoTextPecsImageUrl(value: string, item: LearningItem | undefined) {
  const imageValue = item?.symbolImageUrl || value;
  const generatedFilename = getGeneratedPecsFilename(imageValue);
  if (generatedFilename) return `/pecs/generated_cards_no_text/${generatedFilename}`;

  const label = item?.label || value;
  const manifestCard = pecsCardManifest.find((card) => normalizePecsLabel(card.label) === normalizePecsLabel(label));
  return manifestCard ? `/pecs/generated_cards_no_text/${manifestCard.filename}` : undefined;
}

function getGeneratedPecsFilename(value: string) {
  const match = value.match(/(?:^|\/)pecs\/generated_cards\/([^?#/]+\.png)(?:[?#].*)?$/i);
  return match?.[1];
}
