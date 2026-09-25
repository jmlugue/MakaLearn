"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PillTabOption<T extends string> = { value: T; label: string; icon: LucideIcon; count?: number };

/** Page section tabs as a white pill group. The selected tab is solid blue, and the blue pill slides between tabs. */
export function PillTabs<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  id = "pill-tabs"
}: {
  label: string;
  options: PillTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  id?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-blue-100 bg-[#fff] p-1.5 shadow-sm clean-scrollbar",
        className
      )}
    >
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
              "relative inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              selected ? "text-white" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
            )}
          >
            {selected ? (
              <motion.span
                layoutId={`${id}-pill`}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                className="absolute inset-0 rounded-xl bg-blue-600 shadow-[0_8px_18px_rgba(37,99,235,0.25)]"
                aria-hidden="true"
              />
            ) : null}
            <option.icon className="relative h-4 w-4" aria-hidden="true" />
            <span className="relative">{option.label}</span>
            {option.count !== undefined ? (
              <span className={cn("relative rounded-full px-2 text-xs font-bold", selected ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700")}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
