"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type TabOption<T extends string> = { value: T; label: string; count?: number };

/** Text tabs with a blue underline that slides to the selected tab. */
export function UnderlineTabs<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  id = "tabs"
}: {
  label: string;
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  id?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-6 overflow-x-auto border-b border-slate-200 clean-scrollbar", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative shrink-0 whitespace-nowrap pb-3 pt-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              selected ? "text-blue-700" : "text-slate-500 hover:text-slate-800"
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cn("ml-1.5 rounded-full px-1.5 text-xs font-bold", selected ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500")}>
                {option.count}
              </span>
            ) : null}
            {selected ? (
              <motion.span
                layoutId={`${id}-underline`}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
