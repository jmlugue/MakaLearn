"use client";

import { Hand, Image as ImageIcon, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, LearningItem } from "@/types";

export type ContentKind = "pecs" | "gesture";

export const GESTURE_CATEGORY_ID = "cat-gestures";

/** PECS is blue, gestures are green, everywhere in the Content page. */
export const kindMeta: Record<ContentKind, { label: string; plural: string; icon: LucideIcon; accent: string; badge: string }> = {
  pecs: { label: "PECS", plural: "PECS cards", icon: ImageIcon, accent: "bg-blue-500", badge: "bg-blue-50 text-blue-700" },
  gesture: { label: "Gesture", plural: "Gestures", icon: Hand, accent: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700" }
};

/** Category colors are limited to the 4 soft tints of the landing palette. `dot` is the stronger shade for small markers. */
export const categoryTints = [
  { value: "#dbeafe", label: "Blue", dot: "#3b82f6" },
  { value: "#d1fae5", label: "Green", dot: "#10b981" },
  { value: "#fef3c7", label: "Yellow", dot: "#f59e0b" },
  { value: "#fee2e2", label: "Red", dot: "#f87171" }
];

export function tintDot(color: string) {
  return categoryTints.find((tint) => tint.value.toLowerCase() === color.toLowerCase())?.dot ?? color;
}

export function CategoryChip({ category, className }: { category?: Category; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600", className)}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: category ? tintDot(category.color) : "#cbd5e1" }} />
      <span className="truncate">{category?.name ?? "Uncategorized"}</span>
    </span>
  );
}

export function KindBadge({ kind, className }: { kind: ContentKind; className?: string }) {
  const meta = kindMeta[kind];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", meta.badge, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Category filter chips. "all" shows every category. */
export function CategoryChips({
  categories,
  value,
  onChange
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  const options = [{ id: "all", name: "All", color: "" }, ...categories];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 clean-scrollbar" role="group" aria-label="Filter by category">
      {options.map((category) => {
        const selected = value === category.id;
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(category.id)}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              selected ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-blue-100 bg-[#fff] text-slate-600 hover:border-blue-300 hover:text-blue-700"
            )}
          >
            {category.color ? (
              <span
                className={cn("h-2.5 w-2.5 rounded-full", selected && "ring-2 ring-white/70")}
                style={{ backgroundColor: tintDot(category.color) }}
              />
            ) : null}
            {category.name}
          </button>
        );
      })}
    </div>
  );
}

const fixedGestureLabels = new Set(["I want to go to toilet", "I want to eat food", "I want to drink water", "Help", "Yes", "No", "Sit down"]);

export function isFixedGesture(item: LearningItem) {
  return item.contentType === "gesture" && (item.tags.includes("fixed") || fixedGestureLabels.has(item.label));
}

export function createLearningItemInstruction(contentType: ContentKind, label: string, description: string) {
  if (contentType === "gesture") {
    return `Use the ${label} reference during guided gesture practice. ${description}`;
  }
  return `Use the ${label} card during guided PECS practice. ${description}`;
}

/** Lesson steps are stored one per line in `instructions`. Older lessons are one paragraph, so split those by sentence. */
export function splitSteps(instructions: string) {
  const lines = instructions.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 1) return lines;
  return lines[0].split(/(?<=[.!?])\s+(?=[A-Z])/).map((line) => line.trim()).filter(Boolean);
}

export function nameFor(names: Map<string, string>, id: string) {
  return names.get(id) ?? "MakaLearn user";
}
