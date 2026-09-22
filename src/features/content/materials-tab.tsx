"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { EmptyState } from "@/components/common/empty-state";
import { SearchInput } from "@/features/admin/admin-shared";
import { CardTile } from "@/features/content/card-tile";
import { CategoryPills, kindMeta, type ContentKind } from "@/features/content/content-shared";
import { GuideTip } from "@/features/guide/guide-tip";
import type { Category, LearningItem } from "@/types";

const PAGE_SIZE = 25;

export function MaterialsTab({
  items,
  categories,
  kind,
  onKindChange,
  categoryId,
  onCategoryChange,
  search,
  onSearchChange,
  onOpenItem,
  onAdd,
  canAdd = true
}: {
  items: LearningItem[];
  categories: Category[];
  kind: ContentKind;
  onKindChange: (kind: ContentKind) => void;
  categoryId: string;
  onCategoryChange: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenItem: (item: LearningItem) => void;
  onAdd: () => void;
  canAdd?: boolean;
}) {
  const [page, setPage] = useState(1);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const kindItems = useMemo(() => items.filter((item) => item.contentType === kind), [items, kind]);
  const usedCategories = useMemo(() => {
    const used = new Set(kindItems.map((item) => item.categoryId));
    return categories.filter((category) => used.has(category.id));
  }, [categories, kindItems]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return kindItems.filter((item) => {
      if (categoryId !== "all" && item.categoryId !== categoryId) return false;
      if (!query) return true;
      // Material search is intentionally label-only and prefix-based. This keeps
      // a search such as "s" focused on cards whose labels start with "s";
      // descriptions, tags, and category names should not produce false matches.
      return item.label.trim().toLowerCase().startsWith(query);
    });
  }, [categoryId, kindItems, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => setPage(1), [kind, categoryId, search]);

  const pecsCount = items.filter((item) => item.contentType === "pecs").length;

  return (
    <section className="space-y-4">
      <GuideTip id="content.types">
        <UnderlineTabs
        id="material-types"
        label="Material type"
        value={kind}
        onChange={onKindChange}
        options={(["pecs", "gesture"] as ContentKind[]).map((option) => ({
          value: option,
          label: kindMeta[option].plural,
          icon: kindMeta[option].icon,
          count: option === "pecs" ? pecsCount : items.length - pecsCount
        }))}
        />
      </GuideTip>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          {usedCategories.length ? (
            <GuideTip id="content.categories">
              <CategoryPills categories={usedCategories} value={categoryId} onChange={onCategoryChange} />
            </GuideTip>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SearchInput
            label="Search materials"
            placeholder={kind === "pecs" ? "Search PECS cards" : "Search gestures"}
            value={search}
            onChange={onSearchChange}
          />
          {canAdd ? (
            <GuideTip id="content.addMaterial">
              <Button onClick={onAdd}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {kindMeta[kind].addLabel}
              </Button>
            </GuideTip>
          ) : null}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {paged.map((item) => (
            <CardTile key={item.id} item={item} category={categoryById.get(item.categoryId)} onOpen={() => onOpenItem(item)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Layers}
          title={kindItems.length ? "Nothing found" : kind === "pecs" ? "No PECS cards yet" : "No gestures yet"}
          description={kindItems.length ? "Try another search or category." : canAdd ? `Use ${kindMeta[kind].addLabel} to create the first one.` : "No materials are available yet."}
        />
      )}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-500">
            {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="min-w-14 text-center text-sm font-bold text-blue-700">
              {currentPage} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
