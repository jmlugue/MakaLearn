"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { FileAudio, FileVideo, Image as ImageIcon, ImageOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn, formatDate } from "@/lib/utils";
import { EmptyRow, Panel, SearchInput } from "@/features/admin/admin-shared";
import { ItemDetailDialog, MediaDetailDialog } from "@/features/admin/content-detail-dialog";
import type { AppUser, Category, LearningItem, MediaAsset } from "@/types";

export type ContentView = "materials" | "media";
export type ItemsFilter = "all" | "pecs" | "gesture";
// "incomplete" is materials-only: it keeps only materials missing an image or audio (newest first).
type ContentSort = "newest" | "oldest" | "name-asc" | "name-desc" | "incomplete";
// Learner photos are not part of the admin media view.
type AdminMediaType = Exclude<MediaAsset["type"], "learner-photo">;
type MediaFilter = "all" | AdminMediaType;

const PAGE_SIZE = 20;

const mediaTypeLabels: Record<AdminMediaType, string> = {
  "symbol-image": "Symbol images",
  "gesture-media": "Gesture media",
  "audio-file": "Audio"
};

function isImageFile(asset: MediaAsset) {
  if (asset.type === "symbol-image") return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(asset.fileName);
}

/** PECS cards need an image; every material needs audio. Gestures use fixed references, so no image check. */
function missingMediaTags(item: LearningItem) {
  const tags: string[] = [];
  if (item.contentType === "pecs" && !item.symbolImageUrl) tags.push("No image");
  if (!item.audioUrl) tags.push("No audio");
  return tags;
}

function isMissingMedia(item: LearningItem) {
  return missingMediaTags(item).length > 0;
}

function nameFor(users: AppUser[], id: string) {
  return users.find((candidate) => candidate.id === id)?.name ?? "MakaLearn user";
}

/** Teacher-managed content: materials (learning items) and uploaded media, with filters in a side panel. */
export function ContentSection({
  items,
  media,
  users,
  categories,
  initialView = "materials",
  openItemRequest = null,
  onItemSaved,
  onItemDeleted,
  onMediaDeleted
}: {
  items: LearningItem[];
  media: MediaAsset[];
  users: AppUser[];
  categories: Category[];
  initialView?: ContentView;
  /** Opens a material's pop-up when set (sent from the Home "Latest materials" tile). */
  openItemRequest?: { id: string; at: number } | null;
  onItemSaved: (item: LearningItem) => void;
  onItemDeleted: (item: LearningItem, deletedMedia: boolean) => void;
  onMediaDeleted: (asset: MediaAsset) => void;
}) {
  const [view, setView] = useState<ContentView>(initialView);
  const [search, setSearch] = useState("");
  const [itemsFilter, setItemsFilter] = useState<ItemsFilter>("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [sort, setSort] = useState<ContentSort>("newest");
  const adminMedia = useMemo(() => media.filter((asset) => asset.type !== "learner-photo"), [media]);
  const [page, setPage] = useState(1);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [openMediaId, setOpenMediaId] = useState<string | null>(null);
  const openItem = openItemId ? items.find((item) => item.id === openItemId) ?? null : null;
  const openMedia = openMediaId ? adminMedia.find((asset) => asset.id === openMediaId) ?? null : null;

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (openItemRequest) setOpenItemId(openItemRequest.id);
  }, [openItemRequest]);

  useEffect(() => {
    setPage(1);
  }, [itemsFilter, mediaFilter, sort, search, view]);

  const itemCounts = useMemo(
    () => ({
      all: items.length,
      pecs: items.filter((item) => item.contentType === "pecs").length,
      gesture: items.filter((item) => item.contentType === "gesture").length
    }),
    [items]
  );

  const mediaCounts = useMemo(() => {
    const counts: Record<MediaFilter, number> = { all: adminMedia.length, "symbol-image": 0, "gesture-media": 0, "audio-file": 0 };
    adminMedia.forEach((asset) => {
      counts[asset.type as AdminMediaType] += 1;
    });
    return counts;
  }, [adminMedia]);

  // Search also matches the creator/uploader name, so no person dropdown is needed as accounts grow.
  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = items
      .filter((item) => itemsFilter === "all" || item.contentType === itemsFilter)
      .filter((item) => sort !== "incomplete" || isMissingMedia(item))
      .filter(
        (item) =>
          !term ||
          item.label.toLowerCase().includes(term) ||
          item.tags.some((tag) => tag.toLowerCase().includes(term)) ||
          nameFor(users, item.createdBy).toLowerCase().includes(term)
      );
    return [...matches].sort((a, b) => {
      if (sort === "oldest") return a.updatedAt.localeCompare(b.updatedAt);
      if (sort === "name-asc") return a.label.localeCompare(b.label);
      if (sort === "name-desc") return b.label.localeCompare(a.label);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [items, itemsFilter, search, sort, users]);

  const filteredMedia = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matches = adminMedia
      .filter((asset) => mediaFilter === "all" || asset.type === mediaFilter)
      .filter(
        (asset) =>
          !term ||
          asset.title.toLowerCase().includes(term) ||
          asset.fileName.toLowerCase().includes(term) ||
          nameFor(users, asset.uploadedBy).toLowerCase().includes(term)
      );
    return [...matches].sort((a, b) => {
      const nameA = a.title || a.fileName;
      const nameB = b.title || b.fileName;
      if (sort === "oldest") return a.uploadedAt.localeCompare(b.uploadedAt);
      if (sort === "name-asc") return nameA.localeCompare(nameB);
      if (sort === "name-desc") return nameB.localeCompare(nameA);
      return b.uploadedAt.localeCompare(a.uploadedAt);
    });
  }, [adminMedia, mediaFilter, search, sort, users]);

  const total = view === "materials" ? filteredItems.length : filteredMedia.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageMedia = filteredMedia.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <Panel className="space-y-5 p-4 lg:sticky lg:top-7">
        <SegmentedControl
          label="Content view"
          className="flex w-full [&>button]:flex-1 [&>button]:justify-center"
          value={view}
          onChange={(next) => {
            setView(next);
            setSearch("");
            if (sort === "incomplete") setSort("newest");
          }}
          options={[
            { value: "materials", label: "Materials" },
            { value: "media", label: "Media" }
          ]}
        />

        {view === "materials" ? (
          <>
            <FilterGroup title="Type">
              <FilterOption label="All materials" count={itemCounts.all} selected={itemsFilter === "all"} onSelect={() => setItemsFilter("all")} />
              <FilterOption label="PECS cards" count={itemCounts.pecs} selected={itemsFilter === "pecs"} onSelect={() => setItemsFilter("pecs")} />
              <FilterOption label="Gestures" count={itemCounts.gesture} selected={itemsFilter === "gesture"} onSelect={() => setItemsFilter("gesture")} />
            </FilterGroup>
          </>
        ) : (
          <FilterGroup title="Type">
            <FilterOption label="All media" count={mediaCounts.all} selected={mediaFilter === "all"} onSelect={() => setMediaFilter("all")} />
            {(Object.keys(mediaTypeLabels) as AdminMediaType[]).map((type) => (
              <FilterOption
                key={type}
                label={mediaTypeLabels[type]}
                count={mediaCounts[type]}
                selected={mediaFilter === type}
                onSelect={() => setMediaFilter(type)}
              />
            ))}
          </FilterGroup>
        )}
      </Panel>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={view === "materials" ? "Search label, tag, or creator" : "Search file name or uploader"}
            label={view === "materials" ? "Search materials" : "Search media"}
          />
          <div className="w-52">
            <Select aria-label={view === "materials" ? "Sort materials" : "Sort media"} value={sort} onChange={(event) => setSort(event.target.value as ContentSort)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name-asc">Name (ascending)</option>
              <option value="name-desc">Name (descending)</option>
              {view === "materials" ? <option value="incomplete">Incomplete media</option> : null}
            </Select>
          </div>
          <p className="ml-auto text-sm font-semibold text-slate-500">
            {total} {view === "materials" ? (total === 1 ? "material" : "materials") : total === 1 ? "file" : "files"}
          </p>
        </div>

        {view === "materials" ? (
          <ItemsTable items={pageItems} users={users} onOpen={(item) => setOpenItemId(item.id)} />
        ) : (
          <MediaGrid media={pageMedia} users={users} onOpen={(asset) => setOpenMediaId(asset.id)} />
        )}

        {pageCount > 1 ? (
          <div className="flex items-center justify-end gap-2 text-xs">
            <Button type="button" variant="secondary" size="sm" onClick={() => setPage((current) => current - 1)} disabled={page === 1}>
              Previous
            </Button>
            <span className="font-semibold text-slate-600">
              Page {page} of {pageCount}
            </span>
            <Button type="button" variant="secondary" size="sm" onClick={() => setPage((current) => current + 1)} disabled={page === pageCount}>
              Next
            </Button>
          </div>
        ) : null}
      </div>

      <ItemDetailDialog
        item={openItem}
        users={users}
        categories={categories}
        onClose={() => setOpenItemId(null)}
        onSaved={onItemSaved}
        onDeleted={(item, deletedMedia) => {
          setOpenItemId(null);
          onItemDeleted(item, deletedMedia);
        }}
      />
      <MediaDetailDialog
        asset={openMedia}
        users={users}
        items={items}
        onClose={() => setOpenMediaId(null)}
        onDeleted={(asset) => {
          setOpenMediaId(null);
          onMediaDeleted(asset);
        }}
        onOpenItem={(item) => {
          setOpenMediaId(null);
          setOpenItemId(item.id);
        }}
      />
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterOption({
  label,
  count,
  selected,
  onSelect,
  tone = "default"
}: {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
  tone?: "default" | "warning";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
        selected ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-2 text-xs font-bold",
          selected ? "bg-white/20 text-white" : tone === "warning" && count > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ItemsTable({ items, users, onOpen }: { items: LearningItem[]; users: AppUser[]; onOpen: (item: LearningItem) => void }) {
  return (
    <Panel>
      <div className="overflow-x-auto clean-scrollbar">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-blue-100 bg-[#f8fbff] text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Material</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Media</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <EmptyRow colSpan={5}>No materials match.</EmptyRow>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onOpen(item)}
                  className="cursor-pointer border-t border-slate-100 first:border-t-0 hover:bg-blue-50/60"
                >
                  <td className="px-4 py-3">
                    {/* The label is a real button so keyboard users can open the pop-up; the whole row also responds to clicks. */}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(item);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-blue-100 bg-[#f8fbff]">
                        {item.symbolImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.symbolImageUrl} alt="" className="h-full w-full object-contain p-1" />
                        ) : (
                          <ImageOff className="h-5 w-5 text-slate-300" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{item.label}</span>
                        {item.tags.length ? <span className="block truncate text-xs text-slate-500">{item.tags.slice(0, 3).join(", ")}</span> : null}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        item.contentType === "pecs" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {item.contentType === "pecs" ? "PECS card" : "Gesture"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <MediaChip present={Boolean(item.symbolImageUrl || item.gestureMediaUrl)} label="Image or video" icon={ImageIcon} />
                      <MediaChip present={Boolean(item.audioUrl)} label="Audio" icon={Volume2} />
                      {missingMediaTags(item).map((tag) => (
                        <span key={tag} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          {tag}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{nameFor(users, item.createdBy)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(item.updatedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** Small icon chip: green when the media is attached, grey when it is missing. */
function MediaChip({ present, label, icon: Icon }: { present: boolean; label: string; icon: typeof ImageIcon }) {
  return (
    <span
      title={`${label}: ${present ? "added" : "missing"}`}
      className={cn("grid h-7 w-7 place-items-center rounded-md", present ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-300")}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">
        {label} {present ? "added" : "missing"}
      </span>
    </span>
  );
}

function MediaGrid({ media, users, onOpen }: { media: MediaAsset[]; users: AppUser[]; onOpen: (asset: MediaAsset) => void }) {
  if (media.length === 0) {
    return <Panel className="px-4 py-10 text-center text-sm font-semibold text-slate-500">No media files match.</Panel>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {media.map((asset) => {
        const Icon = asset.type === "audio-file" ? FileAudio : FileVideo;
        return (
          <button
            key={asset.id}
            type="button"
            onClick={() => onOpen(asset)}
            className="group flex flex-col overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <span className="relative grid aspect-[4/3] w-full place-items-center bg-[#f8fbff]">
              {isImageFile(asset) && asset.publicUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.publicUrl} alt={asset.title} className="h-full w-full object-contain p-3" />
              ) : (
                <Icon className="h-10 w-10 text-blue-300" aria-hidden="true" />
              )}
              <span className="absolute left-2 top-2 rounded-full bg-[#fff]/90 px-2 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                {mediaTypeLabels[asset.type as AdminMediaType]}
              </span>
            </span>
            <span className="flex w-full min-w-0 flex-1 flex-col gap-0.5 border-t border-blue-100 p-3">
              <span className="block truncate text-sm font-semibold text-ink" title={asset.fileName}>
                {asset.title || asset.fileName}
              </span>
              <span className="block truncate text-xs text-slate-500">
                {nameFor(users, asset.uploadedBy)} · {formatDate(asset.uploadedAt)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
