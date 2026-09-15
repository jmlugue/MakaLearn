"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageOff, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/common/empty-state";
import { formatDate } from "@/lib/utils";
import { SearchInput } from "@/features/admin/admin-shared";
import { AudioButton, isVideoUrl } from "@/features/content/content-media";
import type { LearningItem, MediaAsset } from "@/types";

export type LibraryMediaType = Exclude<MediaAsset["type"], "learner-photo">;
type MediaFilter = "all" | LibraryMediaType;
type MediaSort = "newest" | "oldest" | "name-asc" | "name-desc";

const STEP = 48;

export const mediaTypeLabels: Record<LibraryMediaType, string> = {
  "symbol-image": "Image",
  "gesture-media": "Gesture media",
  "audio-file": "Audio"
};

export function MediaTab({
  media,
  itemById,
  onOpenAsset
}: {
  media: MediaAsset[];
  itemById: Map<string, LearningItem>;
  onOpenAsset: (asset: MediaAsset) => void;
}) {
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<MediaSort>("newest");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(STEP);

  const sorted = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = media.filter((asset) => {
      if (filter !== "all" && asset.type !== filter) return false;
      if (!query) return true;
      const card = asset.relatedItemId ? itemById.get(asset.relatedItemId)?.label ?? "" : "";
      return [asset.title, asset.fileName, card].join(" ").toLowerCase().includes(query);
    });
    return [...list].sort((a, b) => {
      if (sort === "newest") return b.uploadedAt.localeCompare(a.uploadedAt);
      if (sort === "oldest") return a.uploadedAt.localeCompare(b.uploadedAt);
      const byName = a.fileName.localeCompare(b.fileName, undefined, { sensitivity: "base" });
      return sort === "name-asc" ? byName : -byName;
    });
  }, [filter, itemById, media, search, sort]);

  useEffect(() => setLimit(STEP), [filter, search, sort]);

  const shown = sorted.slice(0, limit);
  const visuals = shown.filter((asset) => asset.type !== "audio-file");
  const audio = shown.filter((asset) => asset.type === "audio-file");
  const countOf = (type: LibraryMediaType) => media.filter((asset) => asset.type === type).length;
  const cardLabel = (asset: MediaAsset) => (asset.relatedItemId ? itemById.get(asset.relatedItemId)?.label : undefined);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Media type"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: media.length },
            { value: "symbol-image", label: "Images", count: countOf("symbol-image") },
            { value: "gesture-media", label: "Gesture media", count: countOf("gesture-media") },
            { value: "audio-file", label: "Audio", count: countOf("audio-file") }
          ]}
        />
        <SearchInput label="Search media" placeholder="Search files or cards" value={search} onChange={setSearch} />
        <div className="ml-auto w-44">
          <Select aria-label="Sort media" value={sort} onChange={(event) => setSort(event.target.value as MediaSort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name-asc">Name (A to Z)</option>
            <option value="name-desc">Name (Z to A)</option>
          </Select>
        </div>
      </div>

      {!sorted.length ? (
        <EmptyState
          icon={ImageOff}
          title={media.length ? "No media found" : "No media yet"}
          description={media.length ? "Try another search or type." : "Files uploaded to cards show up here."}
        />
      ) : null}

      {visuals.length ? (
        <div>
          {filter === "all" ? <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Images and videos</p> : null}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {visuals.map((asset) => {
              const url = asset.publicUrl ?? "";
              const video = isVideoUrl(url) || /\.(mov|mp4|webm|m4v)$/i.test(asset.fileName);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onOpenAsset(asset)}
                  className="group text-left focus-visible:outline-none"
                  aria-label={`Open ${asset.fileName}`}
                >
                  <span className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border border-blue-100 bg-[#fff] shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-blue-300 group-focus-visible:ring-2 group-focus-visible:ring-blue-300">
                    {video ? (
                      <>
                        <video src={url} preload="metadata" muted playsInline className="h-full w-full bg-slate-900 object-cover" />
                        <PlayCircle className="absolute h-8 w-8 text-white drop-shadow" aria-hidden="true" />
                      </>
                    ) : url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" loading="lazy" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <ImageOff className="h-6 w-6 text-slate-300" aria-hidden="true" />
                    )}
                    {asset.type === "gesture-media" ? (
                      <span className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-white" aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-xs font-semibold text-slate-600 group-hover:text-blue-700">
                    {cardLabel(asset) ?? asset.fileName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {audio.length ? (
        <div>
          {filter === "all" ? <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Audio</p> : null}
          <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] shadow-sm">
            {audio.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 px-3 py-2 transition hover:bg-blue-50/40">
                <AudioButton value={asset.publicUrl} label={asset.fileName} />
                <button type="button" onClick={() => onOpenAsset(asset)} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{asset.fileName}</span>
                  <span className="hidden w-32 truncate text-sm text-slate-500 sm:block">{cardLabel(asset) ?? "No card"}</span>
                  <span className="w-24 shrink-0 text-right text-xs text-slate-400">{formatDate(asset.uploadedAt)}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {sorted.length > limit ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setLimit(limit + STEP)}>
            Show more ({sorted.length - limit} left)
          </Button>
        </div>
      ) : null}
    </section>
  );
}
