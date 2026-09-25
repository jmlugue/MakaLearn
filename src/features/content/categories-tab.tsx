"use client";

import { useMemo, useState } from "react";
import { FolderOpen, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/common/empty-state";
import { SearchInput } from "@/features/admin/admin-shared";
import { CardImage } from "@/features/content/content-media";
import { KindBadge, tintDot } from "@/features/content/content-shared";
import { GuideTip } from "@/features/guide/guide-tip";
import type { Category, LearningItem } from "@/types";

type CategorySort = "name-asc" | "name-desc" | "most" | "newest";

const sortOptions: Record<CategorySort, string> = {
  "name-asc": "Name (A to Z)",
  "name-desc": "Name (Z to A)",
  most: "Most materials",
  newest: "Newest first"
};

export function CategoriesTab({
  categories,
  items,
  canCreate,
  onOpenCategory,
  onNewCategory
}: {
  categories: Category[];
  items: LearningItem[];
  canCreate: boolean;
  onOpenCategory: (category: Category) => void;
  onNewCategory: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CategorySort>("name-asc");

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, LearningItem[]>();
    items.forEach((item) => map.set(item.categoryId, [...(map.get(item.categoryId) ?? []), item]));
    return map;
  }, [items]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = categories.filter((category) => !query || [category.name, category.description].join(" ").toLowerCase().includes(query));
    return [...matches].sort((a, b) => {
      if (sort === "name-desc") return b.name.localeCompare(a.name);
      if (sort === "most") return (itemsByCategory.get(b.id)?.length ?? 0) - (itemsByCategory.get(a.id)?.length ?? 0);
      if (sort === "newest") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      return a.name.localeCompare(b.name);
    });
  }, [categories, itemsByCategory, search, sort]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput label="Search categories" placeholder="Search categories" value={search} onChange={setSearch} />
        <div className="w-44">
          <Select aria-label="Sort categories" value={sort} onChange={(event) => setSort(event.target.value as CategorySort)}>
            {(Object.keys(sortOptions) as CategorySort[]).map((key) => (
              <option key={key} value={key}>
                {sortOptions[key]}
              </option>
            ))}
          </Select>
        </div>
        {canCreate ? (
          <GuideTip id="content.addCategory">
            <Button className="ml-auto" onClick={onNewCategory}>
              <FolderPlus className="h-4 w-4" aria-hidden="true" />
              New category
            </Button>
          </GuideTip>
        ) : null}
      </div>

      {visible.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((category) => {
            const categoryItems = itemsByCategory.get(category.id) ?? [];
            const gestureCount = categoryItems.filter((item) => item.contentType === "gesture").length;
            const covers = categoryItems.slice(0, 4);
            const count = categoryItems.length;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onOpenCategory(category)}
                className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-[#fff] text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(37,99,235,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                <span className="grid grid-cols-4 gap-1.5 p-3" style={{ backgroundColor: category.color }}>
                  {covers.length ? (
                    Array.from({ length: 4 }, (_, index) => {
                      const item = covers[index];
                      return (
                        <span key={item?.id ?? `empty-${index}`} className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-[#fff]/85">
                          {item ? <CardImage value={item.symbolImageUrl} label={item.label} className="p-0.5 text-[9px] leading-tight" /> : null}
                        </span>
                      );
                    })
                  ) : (
                    <span className="col-span-4 flex aspect-[4/1] items-center justify-center gap-2 text-sm font-semibold text-slate-500">
                      <FolderOpen className="h-4 w-4" aria-hidden="true" />
                      Empty
                    </span>
                  )}
                </span>
                <span className="block p-3">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tintDot(category.color) }} />
                    <span className="truncate font-bold text-ink group-hover:text-blue-700">{category.name}</span>
                  </span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {count} {count === 1 ? "material" : "materials"}
                    </span>
                    {gestureCount ? <KindBadge kind="gesture" className="px-1.5 text-[9px]" /> : null}
                  </span>
                  {category.description ? <span className="mt-1 block truncate text-xs text-slate-400">{category.description}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={FolderOpen} title="No categories found" description="Try another search." />
      )}
    </section>
  );
}
