"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Hand, Image as ImageIcon, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category, LearningItem } from "@/types";
import { entityColors } from "@/lib/entity-colors";

export type ContentKind = "pecs" | "gesture";

export const GESTURE_CATEGORY_ID = "cat-gestures";

/** Inputs inside Content pop-ups: a solid border so fields stand out on the glass dialog. */
export const fieldClass = "border-blue-100 bg-[#fff] hover:border-blue-300";

/** White glass box used inside pop-ups. */
export const glassBoxClass = "rounded-2xl border border-blue-100/80 bg-white/80 shadow-[0_8px_24px_rgba(37,99,235,0.06)]";

export type Tone = "blue" | "sky" | "indigo";

/** Blue-family tones only. PECS is soft periwinkle blue, gestures sky blue; icons also tell them apart. */
export const toneClasses: Record<Tone, { accent: string; badge: string; soft: string; border: string; icon: string; text: string }> = {
  blue: {
    accent: "bg-blue-600",
    badge: "bg-blue-100 text-blue-800",
    soft: "bg-blue-50",
    border: "border-blue-200",
    icon: "bg-blue-100 text-blue-700",
    text: "text-blue-700"
  },
  sky: {
    accent: "bg-sky-400",
    badge: "bg-sky-100 text-sky-800",
    soft: "bg-sky-50",
    border: "border-sky-200",
    icon: "bg-sky-100 text-sky-700",
    text: "text-sky-700"
  },
  indigo: {
    accent: "bg-indigo-300",
    badge: "bg-indigo-100 text-indigo-800",
    soft: "bg-indigo-50",
    border: "border-indigo-200",
    icon: "bg-indigo-100 text-indigo-700",
    text: "text-indigo-700"
  }
};

export const kindMeta: Record<ContentKind, { label: string; plural: string; addLabel: string; icon: LucideIcon; tone: Tone }> = {
  pecs: { label: "PECS", plural: "PECS cards", addLabel: "Add PECS card", icon: ImageIcon, tone: "indigo" },
  gesture: { label: "Gesture", plural: "Gestures", addLabel: "Add gesture", icon: Hand, tone: "sky" }
};

/** A material's colors. Shared with Activities and Admin (`src/lib/entity-colors.ts`). */
export function kindTone(kind: ContentKind) {
  return entityColors[kind];
}

/** Soft category presets. Teachers can also pick any custom color. */
export const categoryTints = [
  { value: "#dbeafe", label: "Blue" },
  { value: "#e0f2fe", label: "Sky" },
  { value: "#ccfbf1", label: "Teal" },
  { value: "#d1fae5", label: "Green" },
  { value: "#ecfccb", label: "Lime" },
  { value: "#fef3c7", label: "Yellow" },
  { value: "#ffedd5", label: "Orange" },
  { value: "#fee2e2", label: "Coral" },
  { value: "#ffe4e6", label: "Rose" },
  { value: "#fce7f3", label: "Pink" },
  { value: "#ede9fe", label: "Lavender" },
  { value: "#e2e8f0", label: "Slate" }
];

/** A stronger shade of a (usually pale) category color, for small dots and text accents. */
export function tintDot(color: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;
  const value = parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  hue = Math.round(hue * 60 + 360) % 360;
  const lightness = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  return `hsl(${hue} ${Math.round(Math.min(1, saturation) * 70)}% 48%)`;
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
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", entityColors[kind].badge, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

/** Big title inside a pop-up (used with Dialog `hideHeader`), with a row of badges or a subtitle below. */
export function PopupTitle({ title, children, className }: { title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("pr-10", className)}>
      <p className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-3xl">{title}</p>
      {children ? <div className="mt-2 flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

const MORE_WIDTH = 112;
const GAP = 8;

/**
 * Category filter pills on a single row. Pills that do not fit move into a "+N more" menu with search.
 * A selected category from the menu is swapped into the row so the choice stays visible.
 */
export function CategoryPills({
  categories,
  value,
  onChange
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
}) {
  const options = useMemo(() => [{ id: "all", name: "All", color: "", description: "", createdBy: "" } as Category, ...categories], [categories]);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fitCount, setFitCount] = useState(options.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    function compute() {
      if (!container || !measure) return;
      const widths = Array.from(measure.children).map((child) => (child as HTMLElement).offsetWidth);
      const available = container.clientWidth;
      const total = widths.reduce((sum, width) => sum + width + GAP, 0);
      if (total <= available) {
        setFitCount(widths.length);
        return;
      }
      let used = MORE_WIDTH;
      let count = 0;
      for (const width of widths) {
        if (used + width + GAP > available) break;
        used += width + GAP;
        count += 1;
      }
      setFitCount(Math.max(1, count));
    }

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    return () => observer.disconnect();
  }, [options]);

  let visible = options.slice(0, fitCount);
  const selectedIndex = options.findIndex((option) => option.id === value);
  if (selectedIndex >= fitCount && fitCount > 1) {
    visible = [...options.slice(0, fitCount - 1), options[selectedIndex]];
  }
  const hidden = options.filter((option) => !visible.includes(option));

  return (
    <div ref={containerRef} className="relative">
      {/* Invisible copy of every pill, used only to measure widths. */}
      <div ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 flex gap-2 whitespace-nowrap">
        {options.map((option) => (
          <Pill key={option.id} category={option} selected={false} onClick={() => undefined} tabIndex={-1} />
        ))}
      </div>
      <div className="flex gap-2" role="group" aria-label="Filter by category">
        {visible.map((option) => (
          <Pill key={option.id} category={option} selected={option.id === value} onClick={() => onChange(option.id)} />
        ))}
        {hidden.length ? <MorePill categories={hidden} onSelect={onChange} /> : null}
      </div>
    </div>
  );
}

function Pill({ category, selected, onClick, tabIndex }: { category: Category; selected: boolean; onClick: () => void; tabIndex?: number }) {
  return (
    <button
      type="button"
      tabIndex={tabIndex}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
        selected ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-[#fff] text-slate-600 hover:border-blue-300 hover:text-blue-700"
      )}
    >
      {category.color ? (
        <span className={cn("h-2.5 w-2.5 rounded-full", selected && "ring-2 ring-white/70")} style={{ backgroundColor: tintDot(category.color) }} />
      ) : null}
      {category.name}
    </button>
  );
}

function MorePill({ categories, onSelect }: { categories: Category[]; onSelect: (id: string) => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const width = 240;
      setPosition({ top: rect.bottom + 6, left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) });
    }
    function close(event: Event) {
      if (event.type === "keydown" && (event as KeyboardEvent).key !== "Escape") return;
      if (event.type === "mousedown" && (menuRef.current?.contains(event.target as Node) || buttonRef.current?.contains(event.target as Node))) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const term = query.trim().toLowerCase();
  const matches = categories.filter((category) => !term || category.name.toLowerCase().includes(term));

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
        className="inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-slate-300 bg-[#fff] px-3 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        +{categories.length} more
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              style={{ top: position.top, left: position.left }}
              className="fixed z-[200] w-60 rounded-2xl border border-slate-200 bg-[#fff] p-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search categories"
                  aria-label="Search categories"
                  className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <div className="mt-1 max-h-60 overflow-y-auto clean-scrollbar">
                {matches.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      onSelect(category.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tintDot(category.color) }} />
                    <span className="truncate">{category.name}</span>
                  </button>
                ))}
                {!matches.length ? <p className="px-2.5 py-3 text-sm text-slate-400">No match.</p> : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

/** Small uppercase label used for sections inside pop-ups. */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-xs font-bold uppercase tracking-[0.08em] text-blue-700/70", className)}>{children}</p>;
}

/** Visible red outline delete button for pop-up footers. */
export const deleteButtonClass = "mr-auto border border-red-200 bg-white/80 text-red-600 hover:border-red-300 hover:bg-red-50";

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

export function nameFor(names: Map<string, string>, id: string) {
  return names.get(id) ?? "MakaLearn user";
}

export type SortOrder = "newest" | "oldest" | "name-asc" | "name-desc";

export const sortLabels: Record<SortOrder, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  "name-asc": "Name (A to Z)",
  "name-desc": "Name (Z to A)"
};

export function sortRecords<T>(records: T[], order: SortOrder, nameOf: (record: T) => string, dateOf: (record: T) => string | undefined) {
  return [...records].sort((a, b) => {
    if (order === "name-asc") return nameOf(a).localeCompare(nameOf(b), undefined, { sensitivity: "base" });
    if (order === "name-desc") return nameOf(b).localeCompare(nameOf(a), undefined, { sensitivity: "base" });
    const byDate = (dateOf(a) ?? "").localeCompare(dateOf(b) ?? "");
    return order === "oldest" ? byDate : -byDate;
  });
}
