"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, Input, Label, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { categoryTints } from "@/features/content/content-shared";
import type { Category } from "@/types";

export type CategoryFormValues = { name: string; description: string; color: string };

export function CategoryFormDialog({
  open,
  category,
  onClose,
  onSave
}: {
  open: boolean;
  /** Set when editing; null when creating. */
  category: Category | null;
  onClose: () => void;
  onSave: (values: CategoryFormValues) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(categoryTints[0].value);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setColor(category?.color ?? categoryTints[0].value);
    setError("");
  }, [category, open]);

  // Older categories may use a color outside the 4 tints. Show it as "Current" until changed.
  const customColor = category && !categoryTints.some((tint) => tint.value.toLowerCase() === category.color.toLowerCase()) ? category.color : null;
  const swatches = customColor ? [...categoryTints, { value: customColor, label: "Current", dot: customColor }] : categoryTints;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Add a category name.");
      return;
    }
    setSaving(true);
    const saved = await onSave({ name: name.trim(), description: description.trim(), color });
    setSaving(false);
    if (saved) onClose();
  }

  return (
    <Dialog open={open} onClose={saving ? () => undefined : onClose} title={category ? "Edit category" : "New category"}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="category-name">Name</Label>
          <Input
            id="category-name"
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
            value={description}
            placeholder="Optional"
            className="min-h-20"
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-700">Color</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Category color">
            {swatches.map((tint) => {
              const selected = color.toLowerCase() === tint.value.toLowerCase();
              return (
                <button
                  key={tint.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setColor(tint.value)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                    selected ? "border-blue-600 text-ink" : "border-blue-100 text-slate-600 hover:border-blue-300"
                  )}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full border border-black/5" style={{ backgroundColor: tint.value }}>
                    {selected ? <Check className="h-3.5 w-3.5 text-slate-700" aria-hidden="true" /> : null}
                  </span>
                  {tint.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        <FieldError message={error} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : category ? "Save changes" : "Create category"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
