"use client";

import { ExternalLink, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn, formatDate } from "@/lib/utils";
import { CardImage, MediaPreview } from "@/features/content/content-media";
import { KindBadge, PopupTitle, SectionLabel, glassBoxClass, toneClasses } from "@/features/content/content-shared";
import { mediaTypeMeta, type LibraryMediaType } from "@/features/content/media-tab";
import type { LearningItem, MediaAsset } from "@/types";

export function MediaPreviewDialog({
  asset,
  item,
  uploaderName,
  onClose,
  onOpenCard
}: {
  asset: MediaAsset | null;
  item?: LearningItem;
  uploaderName: string;
  onClose: () => void;
  onOpenCard: (item: LearningItem) => void;
}) {
  const type = (asset?.type ?? "symbol-image") as LibraryMediaType;
  const meta = mediaTypeMeta[type] ?? mediaTypeMeta["symbol-image"];
  const tone = toneClasses[meta.tone];
  const Icon = meta.icon;
  const kind = type === "audio-file" ? "audio" : type === "gesture-media" ? "gesture" : "image";

  return (
    <Dialog
      open={Boolean(asset)}
      onClose={onClose}
      title={item?.label ?? asset?.title ?? ""}
      className="max-w-2xl"
      hideHeader
      footer={
        item ? (
          <Button type="button" onClick={() => onOpenCard(item)}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open material
          </Button>
        ) : null
      }
    >
      {asset ? (
        <div className="space-y-4">
          <PopupTitle title={item?.label ?? asset.title}>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", tone.badge)}>
              <Icon className="h-3 w-3" aria-hidden="true" />
              {meta.single}
            </span>
          </PopupTitle>
          <div className={cn("rounded-2xl p-3 ring-1", tone.soft, tone.border)}>
            {kind === "audio" ? (
              <div className="flex items-center gap-4 rounded-xl bg-[#fff] p-4 shadow-sm">
                <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-50">
                  {item?.symbolImageUrl ? (
                    <CardImage value={item.symbolImageUrl} label={item.label} className="p-1 text-xs" />
                  ) : (
                    <Volume2 className="h-7 w-7 text-blue-600" aria-hidden="true" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{asset.fileName}</p>
                  <MediaPreview value={asset.publicUrl} kind="audio" label={asset.title} className="mt-2" />
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl bg-[#fff] shadow-sm">
                <MediaPreview value={asset.publicUrl} kind={kind} label={asset.title} className="max-h-80 rounded-none" />
              </div>
            )}
          </div>

          <div className={cn("p-4", glassBoxClass)}>
            <SectionLabel className="mb-3">Details</SectionLabel>
            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <dt className="text-slate-400">File</dt>
              <dd className="truncate font-semibold text-ink">{asset.fileName}</dd>
              <dt className="text-slate-400">Material</dt>
              <dd className="flex items-center gap-2 font-semibold text-ink">
                {item ? (
                  <>
                    {item.label}
                    <KindBadge kind={item.contentType} className="px-1.5 text-[9px]" />
                  </>
                ) : (
                  <span className="text-slate-400">Not linked</span>
                )}
              </dd>
              <dt className="text-slate-400">Uploaded by</dt>
              <dd className="font-semibold text-ink">{uploaderName}</dd>
              <dt className="text-slate-400">Date</dt>
              <dd className="font-semibold text-ink">{formatDate(asset.uploadedAt)}</dd>
            </dl>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
