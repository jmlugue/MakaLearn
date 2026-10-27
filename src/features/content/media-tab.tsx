"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Film, Image as ImageIcon, ImageOff, Layers, Volume2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadError } from "@/components/common/load-error";
import { LoadingState } from "@/components/common/loading-state";
import { fetchMediaPage, fetchMediaCounts } from "@/lib/supabase/media";
import { MEDIA_PAGE_SIZE } from "@/lib/supabase/media-library-query";
import { Select } from "@/components/ui/form";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { EmptyState } from "@/components/common/empty-state";
import { cn, formatDate } from "@/lib/utils";
import { FilterSelect, SearchInput } from "@/features/admin/admin-shared";
import { AudioButton, isVideoUrl } from "@/features/content/content-media";
import { kindTone, nameFor, sortLabels, type SortOrder, type Tone } from "@/features/content/content-shared";
import { GuideTip } from "@/features/guide/guide-tip";
import type { LearningItem, MediaAsset } from "@/types";

export type LibraryMediaType = MediaAsset["type"];

type TypeFilter = "all" | "symbol-image" | "audio-file";

/** Finds files that no material points at any more, so the library can be tidied up. */
type LinkFilter = "all" | "linked" | "unlinked";

const linkLabels: Record<LinkFilter, string> = {
  all: "All",
  linked: "Yes",
  unlinked: "No"
};

/** "gesture-media" is kept only so older video files can still be listed and deleted. */
export const mediaTypeMeta: Record<LibraryMediaType, { label: string; single: string; icon: LucideIcon; tone: Tone }> = {
  "symbol-image": { label: "Card images", single: "Card image", icon: ImageIcon, tone: "indigo" },
  "activity-image": { label: "Activity pictures", single: "Activity picture", icon: ImageIcon, tone: "sky" },
  "gesture-media": { label: "Old videos", single: "Old video", icon: Film, tone: "sky" },
  "audio-file": { label: "Audio", single: "Audio", icon: Volume2, tone: "blue" }
};

function isVideoAsset(asset: MediaAsset) {
  return isVideoUrl(asset.publicUrl ?? "") || /\.(mov|mp4|webm|m4v)$/i.test(asset.fileName);
}

export function MediaTab({
  revision,
  counts,
  itemById,
  userNames,
  onOpenAsset
}: {
  revision: number;
  counts?: Awaited<ReturnType<typeof fetchMediaCounts>>;
  itemById: Map<string, LearningItem>;
  userNames: Map<string, string>;
  onOpenAsset: (asset: MediaAsset) => void;
}) {
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [link, setLink] = useState<LinkFilter>("all");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const request = useMemo(() => {
    const query = search.trim().toLowerCase();
    return { page, revision, attempt, filters: { type: filter, link, sort, search,
      itemIds: query ? [...itemById.values()].filter((item) => item.label.toLowerCase().includes(query)).map((item) => item.id) : [],
      userIds: query ? [...userNames].filter(([, name]) => name.toLowerCase().includes(query)).map(([id]) => id) : []
    } };
  }, [filter, link, sort, search, page, revision, itemById, userNames, attempt]);
  const [result, setResult] = useState<{ request: typeof request; assets: MediaAsset[]; count: number; failed?: boolean }>();
  // Hide old records in the same render as a page/filter change, before the request effect runs.
  const loading = result?.request !== request;
  const failed = !loading && Boolean(result?.failed);

  useEffect(() => {
    let active = true;
    // Debounce searches and discard responses from an older page or filter.
    const timer = setTimeout(() => {
      fetchMediaPage(request.filters, request.page).then((next) => {
        if (!active) return;
        const lastPage = Math.max(1, Math.ceil(next.count / MEDIA_PAGE_SIZE));
        if (page > lastPage) { setPage(lastPage); return; }
        setResult({ ...next, request });
      }).catch(() => { if (active) setResult({ request, assets: [], count: 0, failed: true }); });
    }, search ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [request, page, search]);

  const cardLabel = (asset: MediaAsset) => (asset.relatedItemId ? itemById.get(asset.relatedItemId)?.label : undefined);
  const sorted = loading || failed ? [] : result?.assets ?? [];
  const visuals = sorted.filter((asset) => asset.type !== "audio-file");
  const audio = sorted.filter((asset) => asset.type === "audio-file");
  const total = result?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / MEDIA_PAGE_SIZE));
  const pagination = !loading && !failed && total > 0 ? (
    <nav aria-label="Media pages" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white/70 p-3">
      <p role="status" className="text-sm text-slate-600">{(page - 1) * MEDIA_PAGE_SIZE + 1} to {Math.min(page * MEDIA_PAGE_SIZE, total)} of {total} files</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <span className="text-sm font-semibold text-slate-600">Page {page} of {pages}</span>
        <Button type="button" variant="outline" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</Button>
      </div>
    </nav>
  ) : null;

  return (
    <section className="space-y-4">
      <GuideTip id="content.mediaTypes">
        <UnderlineTabs
          id="media-type"
          label="Media type"
          value={filter}
          onChange={(value) => { setFilter(value); setPage(1); }}
          options={[
            { value: "all", label: "All", icon: Layers, count: counts?.all },
            { value: "symbol-image", label: "Images", icon: ImageIcon, count: counts?.images },
            { value: "audio-file", label: "Audio", icon: Volume2, count: counts?.audio }
          ]}
        />
      </GuideTip>
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <FilterSelect
          label="Linked"
          className="w-full"
          value={link}
          onChange={(value) => { setLink(value); setPage(1); }}
          options={(Object.keys(linkLabels) as LinkFilter[]).map((key) => ({ value: key, label: linkLabels[key] }))}
        />
        <div className="flex min-w-0 flex-wrap items-center gap-2 [&>div:first-child]:sm:max-w-none">
          <SearchInput label="Search media" placeholder="Search files, materials, or uploader" value={search} onChange={(value) => { setSearch(value); setPage(1); }} />
          <div className="w-44">
            <Select aria-label="Sort media" value={sort} onChange={(event) => { setSort(event.target.value as SortOrder); setPage(1); }}>
              {(Object.keys(sortLabels) as SortOrder[]).map((key) => (
                <option key={key} value={key}>
                  {sortLabels[key]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {loading ? <LoadingState label="Loading media" /> : null}
      {failed ? <LoadError label="media" onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {pagination}
      {!loading && !failed && !sorted.length ? (
        <EmptyState
          icon={ImageOff}
          title={search || link !== "all" || filter !== "all" ? "No media found" : "No media yet"}
          description={search || link !== "all" || filter !== "all" ? "Try another search or filter." : "Files uploaded to materials show up here."}
        />
      ) : null}

      {visuals.length ? (
        <MediaPanel icon={ImageIcon} title="Images and videos on this page" count={visuals.length}>
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
            {visuals.map((asset) => {
              const url = asset.publicUrl ?? "";
              const linked = asset.relatedItemId ? itemById.get(asset.relatedItemId) : undefined;
              const tone = kindTone(linked?.contentType ?? "pecs");
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onOpenAsset(asset)}
                  aria-label={`Open ${asset.fileName}`}
                  title={linked?.label ?? asset.fileName}
                  className={cn(
                    "group flex min-w-0 flex-col overflow-hidden rounded-xl border p-1.5 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                    tone.soft,
                    tone.border,
                    tone.hoverBorder
                  )}
                >
                  <span className="relative block w-full shrink-0 pb-[100%] overflow-hidden rounded-lg bg-[#fff]">
                    {isVideoAsset(asset) ? (
                      <Film className="absolute inset-0 m-auto h-6 w-6 text-slate-300" aria-label="Old video file" />
                    ) : url ? (
                      // Placed absolutely so a tall picture is never cut off at the bottom.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" loading="lazy" className="absolute inset-1 h-[calc(100%-0.5rem)] w-[calc(100%-0.5rem)] object-contain" />
                    ) : (
                      <ImageOff className="absolute inset-0 m-auto h-6 w-6 text-slate-300" aria-hidden="true" />
                    )}
                  </span>
                  {asset.cleanupPending ? <span className="mt-1 rounded-lg bg-amber-50 px-1 py-1 text-xs font-semibold text-amber-800">Cleanup needed</span> : null}
                </button>
              );
            })}
          </div>
        </MediaPanel>
      ) : null}

      {audio.length ? (
        <MediaPanel icon={Volume2} title="Audio on this page" count={audio.length}>
          <div className="relative overflow-x-auto">
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
                      {asset.cleanupPending ? <span className="block text-xs font-semibold text-amber-800">Cleanup needed</span> : null}
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
      {total > MEDIA_PAGE_SIZE ? pagination : null}
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
