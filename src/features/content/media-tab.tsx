"use client";

import { ReactNode, useMemo, useState } from "react";
import { Film, Image as ImageIcon, ImageOff, Layers, PlayCircle, Volume2, type LucideIcon } from "lucide-react";
import { Select } from "@/components/ui/form";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { EmptyState } from "@/components/common/empty-state";
import { formatDate } from "@/lib/utils";
import { SearchInput } from "@/features/admin/admin-shared";
import { AudioButton, isVideoUrl } from "@/features/content/content-media";
import { nameFor, sortLabels, sortRecords, type SortOrder, type Tone } from "@/features/content/content-shared";
import type { LearningItem, MediaAsset } from "@/types";

export type LibraryMediaType = Exclude<MediaAsset["type"], "learner-photo">;

export const mediaTypeMeta: Record<LibraryMediaType, { label: string; single: string; icon: LucideIcon; tone: Tone }> = {
  "symbol-image": { label: "Images", single: "Image", icon: ImageIcon, tone: "indigo" },
  "gesture-media": { label: "Gesture videos", single: "Gesture video", icon: Film, tone: "sky" },
  "audio-file": { label: "Audio", single: "Audio", icon: Volume2, tone: "blue" }
};

function isVideoAsset(asset: MediaAsset) {
  return isVideoUrl(asset.publicUrl ?? "") || /\.(mov|mp4|webm|m4v)$/i.test(asset.fileName);
}

export function MediaTab({
  media,
  itemById,
  userNames,
  onOpenAsset
}: {
  media: MediaAsset[];
  itemById: Map<string, LearningItem>;
  userNames: Map<string, string>;
  onOpenAsset: (asset: MediaAsset) => void;
}) {
  const [filter, setFilter] = useState<LibraryMediaType | null>(null);
  const [sort, setSort] = useState<SortOrder>("newest");
  const [search, setSearch] = useState("");

  const cardLabel = (asset: MediaAsset) => (asset.relatedItemId ? itemById.get(asset.relatedItemId)?.label : undefined);

  const sorted = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = media.filter((asset) => {
      if (filter && asset.type !== filter) return false;
      if (!query) return true;
      return [asset.title, asset.fileName, cardLabel(asset) ?? "", nameFor(userNames, asset.uploadedBy)].join(" ").toLowerCase().includes(query);
    });
    return sortRecords(list, sort, (asset) => asset.fileName, (asset) => asset.uploadedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cardLabel only reads itemById.
  }, [filter, itemById, media, search, sort, userNames]);

  const visuals = sorted.filter((asset) => asset.type !== "audio-file");
  const audio = sorted.filter((asset) => asset.type === "audio-file");
  const countOf = (type: LibraryMediaType) => media.filter((asset) => asset.type === type).length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <UnderlineTabs
          id="media-types"
          label="Media type"
          className="min-w-0 flex-1"
          value={filter ?? "all"}
          onChange={(next) => setFilter(next === "all" ? null : (next as LibraryMediaType))}
          options={[
            { value: "all", label: "All", icon: Layers, count: media.length },
            ...(Object.keys(mediaTypeMeta) as LibraryMediaType[]).map((type) => ({
              value: type,
              label: mediaTypeMeta[type].label,
              icon: mediaTypeMeta[type].icon,
              count: countOf(type)
            }))
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <SearchInput label="Search media" placeholder="Search files, materials, or uploader" value={search} onChange={setSearch} />
        <div className="w-44">
          <Select aria-label="Sort media" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}>
            {(Object.keys(sortLabels) as SortOrder[]).map((key) => (
              <option key={key} value={key}>
                {sortLabels[key]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {!sorted.length ? (
        <EmptyState
          icon={ImageOff}
          title={media.length ? "No media found" : "No media yet"}
          description={media.length ? "Try another search or type." : "Files uploaded to materials show up here."}
        />
      ) : null}

      {visuals.length ? (
        <MediaPanel icon={ImageIcon} title={filter === "gesture-media" ? "Gesture videos" : filter === "symbol-image" ? "Images" : "Images and videos"} count={visuals.length}>
          <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {visuals.map((asset) => {
              const url = asset.publicUrl ?? "";
              const video = isVideoAsset(asset);
              return (
                <button key={asset.id} type="button" onClick={() => onOpenAsset(asset)} className="group text-left focus-visible:outline-none" aria-label={`Open ${asset.fileName}`}>
                  <span className="relative grid aspect-square place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition group-hover:-translate-y-0.5 group-hover:border-blue-300 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-blue-300">
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
                    <span
                      className={
                        asset.type === "gesture-media"
                          ? "absolute left-1.5 top-1.5 rounded-full bg-sky-500 px-1.5 text-[9px] font-bold uppercase text-white"
                          : "absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-300 ring-2 ring-white"
                      }
                    >
                      {asset.type === "gesture-media" ? "Video" : null}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs font-semibold text-slate-600 group-hover:text-blue-700">{cardLabel(asset) ?? asset.fileName}</span>
                </button>
              );
            })}
          </div>
        </MediaPanel>
      ) : null}

      {audio.length ? (
        <MediaPanel icon={Volume2} title="Audio" count={audio.length}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs font-bold uppercase tracking-[0.06em] text-slate-400">
                <tr>
                  <th className="w-12 px-4 py-2" aria-label="Play" />
                  <th className="px-2 py-2">File</th>
                  <th className="hidden px-2 py-2 sm:table-cell">Material</th>
                  <th className="hidden px-2 py-2 md:table-cell">Uploaded by</th>
                  <th className="hidden px-4 py-2 text-right sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {audio.map((asset) => (
                  <tr key={asset.id} onClick={() => onOpenAsset(asset)} className="cursor-pointer transition hover:bg-blue-50/50">
                    <td className="px-4 py-2" onClick={(event) => event.stopPropagation()}>
                      <AudioButton value={asset.publicUrl} label={asset.fileName} />
                    </td>
                    <td className="max-w-[14rem] px-2 py-2">
                      <button type="button" onClick={() => onOpenAsset(asset)} className="block max-w-full truncate font-semibold text-ink hover:text-blue-700">
                        {asset.fileName}
                      </button>
                    </td>
                    <td className="hidden px-2 py-2 text-slate-600 sm:table-cell">{cardLabel(asset) ?? <span className="text-slate-400">None</span>}</td>
                    <td className="hidden px-2 py-2 text-slate-600 md:table-cell">{nameFor(userNames, asset.uploadedBy)}</td>
                    <td className="hidden whitespace-nowrap px-4 py-2 text-right text-xs text-slate-400 sm:table-cell">{formatDate(asset.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MediaPanel>
      ) : null}
    </section>
  );
}

function MediaPanel({ icon: Icon, title, count, children }: { icon: LucideIcon; title: string; count: number; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fff] shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-100 text-blue-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="font-bold text-ink">{title}</p>
        <span className="rounded-full bg-slate-200/70 px-2 text-xs font-bold text-slate-600">{count}</span>
      </div>
      {children}
    </div>
  );
}
