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

export type ContentView = "items" | "media";
export type ItemsFilter = "all" | "pecs" | "gesture" | "missing-image" | "missing-audio";
type MediaFilter = "all" | MediaAsset["type"];

const PAGE_SIZE = 20;

const mediaTypeLabels: Record<MediaAsset["type"], string> = {
  "symbol-image": "Symbol images",
  "gesture-media": "Gesture media",
  "audio-file": "Audio",
  "learner-photo": "Learner photos"
};

function isImageFile(asset: MediaAsset) {
  if (asset.type === "symbol-image" || asset.type === "learner-photo") return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(asset.fileName);
}

function nameFor(users: AppUser[], id: string) {
  return users.find((candidate) => candidate.id === id)?.name ?? "MakaLearn user";
}

/** Teacher-managed content: learning items and uploaded media, with filters in a side panel. */
export function ContentSection({
  items,
  media,
  users,
  categories,
  initialView = "items",
  onItemSaved,
  onItemDeleted,
  onMediaDeleted
}: {
  items: LearningItem[];
  media: MediaAsset[];
  users: AppUser[];
  categories: Category[];
  initialView?: ContentView;
  onItemSaved: (item: LearningItem) => void;
  onItemDeleted: (item: LearningItem, deletedMedia: boolean) => void;
  onMediaDeleted: (asset: MediaAsset) => void;
}) {
  const [view, setView] = useState<ContentView>(initialView);
  const [search, setSearch] = useState("");
  const [itemsFilter, setItemsFilter] = useState<ItemsFilter>("all");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [person, setPerson] = useState("all");
  const [page, setPage] = useState(1);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [openMediaId, setOpenMediaId] = useState<string | null>(null);
  const openItem = openItemId ? items.find((item) => item.id === openItemId) ?? null : null;
  const openMedia = openMediaId ? media.find((asset) => asset.id === openMediaId) ?? null : null;

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    setPage(1);
  }, [itemsFilter, mediaFilter, person, search, view]);

  const itemCounts = useMemo(
    () => ({
      all: items.length,
      pecs: items.filter((item) => item.contentType === "pecs").length,
      gesture: items.filter((item) => item.contentType === "gesture").length,
      "missing-image": items.filter((item) => item.contentType === "pecs" && !item.symbolImageUrl).length,
      "missing-audio": items.filter((item) => !item.audioUrl).length
    }),
    [items]
  );

  const mediaCounts = useMemo(() => {
    const counts: Record<MediaFilter, number> = { all: media.length, "symbol-image": 0, "gesture-media": 0, "audio-file": 0, "learner-photo": 0 };
    media.forEach((asset) => {
      counts[asset.type] += 1;
    });
    return counts;
  }, [media]);

  const people = useMemo(() => {
    const ids = new Set(view === "items" ? items.map((item) => item.createdBy) : media.map((asset) => asset.uploadedBy));
    return Array.from(ids)
      .map((id) => ({ id, name: nameFor(users, id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items, media, users, view]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => {
        if (itemsFilter === "pecs" || itemsFilter === "gesture") return item.contentType === itemsFilter;
        if (itemsFilter === "missing-image") return item.contentType === "pecs" && !item.symbolImageUrl;
        if (itemsFilter === "missing-audio") return !item.audioUrl;
        return true;
      })
      .filter((item) => person === "all" || item.createdBy === person)
      .filter((item) => !term || item.label.toLowerCase().includes(term) || item.tags.some((tag) => tag.toLowerCase().includes(term)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [items, itemsFilter, person, search]);

  const filteredMedia = useMemo(() => {
    const term = search.trim().toLowerCase();
    return media
      .filter((asset) => mediaFilter === "all" || asset.type === mediaFilter)
      .filter((asset) => person === "all" || asset.uploadedBy === person)
      .filter((asset) => !term || asset.title.toLowerCase().includes(term) || asset.fileName.toLowerCase().includes(term))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [media, mediaFilter, person, search]);

  const total = view === "items" ? filteredItems.length : filteredMedia.length;
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
            setPerson("all");
          }}
          options={[
            { value: "items", label: "Items" },
            { value: "media", label: "Media" }
          ]}
        />

        {view === "items" ? (
          <>
            <FilterGroup title="Type">
              <FilterOption label="All items" count={itemCounts.all} selected={itemsFilter === "all"} onSelect={() => setItemsFilter("all")} />
              <FilterOption label="PECS cards" count={itemCounts.pecs} selected={itemsFilter === "pecs"} onSelect={() => setItemsFilter("pecs")} />
              <FilterOption label="Gestures" count={itemCounts.gesture} selected={itemsFilter === "gesture"} onSelect={() => setItemsFilter("gesture")} />
            </FilterGroup>
            <FilterGroup title="Needs attention">
              <FilterOption
                label="Missing image"
                count={itemCounts["missing-image"]}
                tone="warning"
                selected={itemsFilter === "missing-image"}
                onSelect={() => setItemsFilter("missing-image")}
              />
              <FilterOption
                label="Missing audio"
                count={itemCounts["missing-audio"]}
                tone="warning"
                selected={itemsFilter === "missing-audio"}
                onSelect={() => setItemsFilter("missing-audio")}
              />
            </FilterGroup>
          </>
        ) : (
          <FilterGroup title="Type">
            <FilterOption label="All media" count={mediaCounts.all} selected={mediaFilter === "all"} onSelect={() => setMediaFilter("all")} />
            {(Object.keys(mediaTypeLabels) as MediaAsset["type"][]).map((type) => (
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

        <FilterGroup title={view === "items" ? "Created by" : "Uploaded by"}>
          <Select aria-label={view === "items" ? "Filter by creator" : "Filter by uploader"} value={person} onChange={(event) => setPerson(event.target.value)}>
            <option value="all">Everyone</option>
            {people.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </Select>
        </FilterGroup>
      </Panel>

      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={view === "items" ? "Search label or tag" : "Search file name"}
            label={view === "items" ? "Search learning items" : "Search media"}
          />
          <p className="text-sm font-semibold text-slate-500">
            {total} {view === "items" ? (total === 1 ? "item" : "items") : total === 1 ? "file" : "files"}
          </p>
        </div>

        {view === "items" ? (
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
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Media</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <EmptyRow colSpan={5}>No learning items match.</EmptyRow>
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
                        item.contentType === "pecs" ? "bg-blue-100 text-blue-700" : "bg-sky-100 text-sky-700"
                      )}
                    >
                      {item.contentType === "pecs" ? "PECS card" : "Gesture"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <MediaChip present={Boolean(item.symbolImageUrl || item.gestureMediaUrl)} label="Image or video" icon={ImageIcon} />
                      <MediaChip present={Boolean(item.audioUrl)} label="Audio" icon={Volume2} />
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
                {mediaTypeLabels[asset.type]}
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
