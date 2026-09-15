"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { MediaPreview } from "@/features/content/content-media";
import { mediaTypeLabels, type LibraryMediaType } from "@/features/content/media-tab";
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
  const kind = asset?.type === "audio-file" ? "audio" : asset?.type === "gesture-media" ? "gesture" : "image";

  return (
    <Dialog
      open={Boolean(asset)}
      onClose={onClose}
      title={asset?.fileName ?? ""}
      className="max-w-xl"
      footer={
        item ? (
          <Button type="button" onClick={() => onOpenCard(item)}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open card
          </Button>
        ) : null
      }
    >
      {asset ? (
        <div className="space-y-4">
          <MediaPreview value={asset.publicUrl} kind={kind} label={asset.title} />
          <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-slate-400">Type</dt>
            <dd className="font-semibold text-ink">{mediaTypeLabels[asset.type as LibraryMediaType] ?? asset.type}</dd>
            <dt className="text-slate-400">Card</dt>
            <dd className="font-semibold text-ink">{item?.label ?? "Not linked"}</dd>
            <dt className="text-slate-400">Uploaded by</dt>
            <dd className="font-semibold text-ink">{uploaderName}</dd>
            <dt className="text-slate-400">Date</dt>
            <dd className="font-semibold text-ink">{formatDate(asset.uploadedAt)}</dd>
          </dl>
        </div>
      ) : null}
    </Dialog>
  );
}
