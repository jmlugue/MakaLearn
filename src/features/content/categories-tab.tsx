"use client";

import { FolderOpen, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { CardImage } from "@/features/content/content-media";
import { KindBadge, type ContentKind } from "@/features/content/content-shared";
import type { Category, LearningItem } from "@/types";

export function CategoriesTab({
  categories,
  items,
  onOpenCategory,
  onNewCategory,
  onEditCategory,
  onDeleteCategory
}: {
  categories: Category[];
  items: LearningItem[];
  onOpenCategory: (category: Category, kind: ContentKind) => void;
  onNewCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button onClick={onNewCategory}>
          <FolderPlus className="h-4 w-4" aria-hidden="true" />
          New category
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((category) => {
          const categoryItems = items.filter((item) => item.categoryId === category.id);
          const gestureCount = categoryItems.filter((item) => item.contentType === "gesture").length;
          const kind: ContentKind = categoryItems.length && gestureCount === categoryItems.length ? "gesture" : "pecs";
          const covers = categoryItems.slice(0, 4);
          const count = categoryItems.length;

          return (
            <div
              key={category.id}
              className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_14px_30px_rgba(37,99,235,0.12)]"
            >
              <button
                type="button"
                onClick={() => onOpenCategory(category, kind)}
                aria-label={`Show ${category.name} cards`}
                className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300"
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
                      No cards yet
                    </span>
                  )}
                </span>
                <span className="block p-3 pr-14">
                  <span className="block truncate font-bold text-ink group-hover:text-blue-700">{category.name}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {count} {count === 1 ? "card" : "cards"}
                    </span>
                    {gestureCount ? <KindBadge kind="gesture" className="px-1.5 text-[9px]" /> : null}
                  </span>
                  {category.description ? <span className="mt-1 block truncate text-xs text-slate-400">{category.description}</span> : null}
                </span>
              </button>
              <div className="absolute bottom-3 right-2">
                <DropdownMenu
                  label={`${category.name} actions`}
                  items={[
                    { label: "Edit", icon: Pencil, onSelect: () => onEditCategory(category) },
                    { label: count ? "Delete (in use)" : "Delete", icon: Trash2, tone: "danger", disabled: count > 0, onSelect: () => onDeleteCategory(category) }
                  ]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
