"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, FolderOpen, Palette, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/features/admin/admin-shared";
import { CardImage } from "@/features/content/content-media";
import { KindBadge, PopupTitle, categoryTints, deleteButtonClass, fieldClass, glassBoxClass, kindTone, tintDot } from "@/features/content/content-shared";
import type { Category, LearningItem } from "@/types";

export type CategoryFormValues = { name: string; description: string; color: string };
export type CategoryDialogState = { category: Category | null; mode: "view" | "edit" };

export function CategoryDialog({
  state,
  items,
  canManage,
  onClose,
  onModeChange,
  onSave,
  onDelete,
  onOpenItem
}: {
  state: CategoryDialogState | null;
  items: LearningItem[];
  canManage: boolean;
  onClose: () => void;
  onModeChange: (mode: "view" | "edit") => void;
  /** Resolves true when saved. */
  onSave: (values: CategoryFormValues) => Promise<boolean>;
  onDelete: (category: Category) => void;
  onOpenItem: (item: LearningItem) => void;
}) {
  const category = state?.category ?? null;
  const editing = state?.mode === "edit";
  const categoryItems = category ? items.filter((item) => item.categoryId === category.id) : [];
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setSearch(""), [category?.id]);

  const query = search.trim().toLowerCase();
  const visible = categoryItems.filter((item) => !query || item.label.toLowerCase().includes(query));

  return (
    <Dialog
      open={Boolean(state)}
      onClose={saving ? () => undefined : onClose}
      title={editing ? (category ? "Edit category" : "New category") : category?.name ?? ""}
      className="max-w-3xl"
      hideHeader
      footer={
        category && !editing && canManage ? (
          <>
            <Button
              type="button"
              variant="ghost"
              className={deleteButtonClass}
              disabled={categoryItems.length > 0}
              title={categoryItems.length ? "Move its materials to another category first." : undefined}
              onClick={() => onDelete(category)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
            <Button type="button" onClick={() => onModeChange("edit")}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit
            </Button>
          </>
        ) : null
      }
    >
      {state && editing ? <PopupTitle title={category ? "Edit category" : "New category"} className="mb-5" /> : null}
      {state && editing ? (
        <CategoryForm
          key={category?.id ?? "new"}
          category={category}
          saving={saving}
          onCancel={() => (category ? onModeChange("view") : onClose())}
          onSubmit={async (values) => {
            setSaving(true);
            const saved = await onSave(values);
            setSaving(false);
            if (saved) {
              if (category) onModeChange("view");
              else onClose();
            }
          }}
        />
      ) : null}

      {category && !editing ? (
        <div className="space-y-4">
          <div className="flex items-start gap-4 pr-10">
            <span
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl ring-4 ring-white shadow-sm"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            >
              <span className="h-5 w-5 rounded-full" style={{ backgroundColor: tintDot(category.color) }} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-3xl">{category.name}</p>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                  {categoryItems.length} {categoryItems.length === 1 ? "material" : "materials"}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{category.description || "No description."}</p>
            </div>
          </div>

          {categoryItems.length ? (
            <>
              <SearchInput label={`Search in ${category.name}`} placeholder={`Search in ${category.name}`} value={search} onChange={setSearch} />
              <div className="grid max-h-[22rem] grid-cols-3 gap-2 overflow-y-auto rounded-2xl bg-gradient-to-br from-blue-50/80 to-sky-50/60 p-2 ring-1 ring-blue-100 clean-scrollbar sm:grid-cols-4 md:grid-cols-5">
                {visible.map((item) => {
                  const tone = kindTone(item.contentType);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenItem(item)}
                      className="flex flex-col overflow-hidden rounded-xl border border-blue-100 bg-[#fff] text-left transition hover:-translate-y-0.5 hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                    >
                      <span className={cn("block h-1", tone.accent)} aria-hidden="true" />
                      <span className={cn("relative m-1.5 block aspect-square overflow-hidden rounded-lg", tone.soft)}>
                        <span className="absolute inset-1">
                          <CardImage value={item.symbolImageUrl} label={item.label} className="text-xs" />
                        </span>
                      </span>
                      <span className="flex items-center gap-1 px-2 pb-2">
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{item.label}</span>
                        <KindBadge kind={item.contentType} className="px-1 text-[8px]" />
                      </span>
                    </button>
                  );
                })}
                {!visible.length ? <p className="col-span-full py-8 text-center text-sm text-slate-500">Nothing matches.</p> : null}
              </div>
            </>
          ) : (
            <div className="grid place-items-center rounded-2xl border-2 border-dashed border-blue-200 bg-white/60 py-10 text-center">
              <FolderOpen className="h-8 w-8 text-blue-300" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-slate-500">No materials in this category yet.</p>
            </div>
          )}
          {categoryItems.length ? <p className="text-xs text-slate-400">Delete is available once no materials use this category.</p> : null}
        </div>
      ) : null}
    </Dialog>
  );
}

function CategoryForm({
  category,
  saving,
  onCancel,
  onSubmit
}: {
  category: Category | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: CategoryFormValues) => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [color, setColor] = useState(category?.color ?? categoryTints[0].value);
  const [error, setError] = useState("");
  const isPreset = categoryTints.some((tint) => tint.value.toLowerCase() === color.toLowerCase());

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Add a category name.");
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim(), color });
  }

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="space-y-4">
        <div>
          <Label htmlFor="category-name">Name</Label>
          <Input
            id="category-name"
            className={fieldClass}
            value={name}
            placeholder="Snack time"
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
        </div>
        <div>
          <Label htmlFor="category-description">Description</Label>
          <Textarea
            id="category-description"
            className={cn(fieldClass, "min-h-20")}
            value={description}
            placeholder="Optional"
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-700">Color</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Category color">
            {categoryTints.map((tint) => {
              const selected = color.toLowerCase() === tint.value.toLowerCase();
              return (
                <button
                  key={tint.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={tint.label}
                  title={tint.label}
                  onClick={() => setColor(tint.value)}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                    selected ? "border-blue-600 scale-110" : "border-white shadow-sm hover:scale-105"
                  )}
                  style={{ backgroundColor: tint.value }}
                >
                  {selected ? <Check className="h-4 w-4" style={{ color: tintDot(tint.value) }} aria-hidden="true" /> : null}
                </button>
              );
            })}
            <label
              title="Custom color"
              className={cn(
                "relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 transition",
                !isPreset ? "border-blue-600 scale-110" : "border-dashed border-slate-300 hover:border-blue-300"
              )}
              style={!isPreset ? { backgroundColor: color } : undefined}
            >
              <Palette className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span className="sr-only">Custom color</span>
              <input type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#dbeafe"} onChange={(event) => setColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>
        </fieldset>
        <FieldError message={error} />
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Preview</p>
        <div className={cn("overflow-hidden", glassBoxClass)}>
          <div className="grid grid-cols-4 gap-1.5 p-3" style={{ backgroundColor: color }}>
            {Array.from({ length: 4 }, (_, index) => (
              <span key={index} className="aspect-square rounded-lg bg-[#fff]/85" />
            ))}
          </div>
          <div className="flex items-center gap-2 p-3">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tintDot(color) }} />
            <span className="truncate font-bold text-ink">{name || "Category name"}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 md:col-span-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : category ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
