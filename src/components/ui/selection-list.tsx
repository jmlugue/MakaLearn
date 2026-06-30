"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SelectionOption = {
  value: string;
  label: string;
  description?: string;
};

export function SelectionList({
  label,
  helper,
  options,
  selectedValues,
  onChange,
  emptyText = "No items selected yet.",
  maxSelected,
  maxSelectedMessage
}: {
  label: string;
  helper: string;
  options: SelectionOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  emptyText?: string;
  maxSelected?: number;
  maxSelectedMessage?: string;
}) {
  function toggle(value: string) {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    if (maxSelected && selectedValues.length >= maxSelected) return;

    onChange([...selectedValues, value]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <Badge className="bg-blue-50 text-blue-700">
          {selectedValues.length}{maxSelected ? `/${maxSelected}` : ""} selected
        </Badge>
      </div>
      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-blue-100 bg-white p-2 clean-scrollbar">
        <div className="grid gap-2">
          {options.map((option) => {
            const selected = selectedValues.includes(option.value);
            const disabled = Boolean(maxSelected && !selected && selectedValues.length >= maxSelected);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                disabled={disabled}
                className={cn(
                  "flex min-h-14 items-start gap-3 rounded-lg border p-3 text-left transition",
                  selected ? "border-blue-500 bg-skywash" : "border-blue-50 bg-white hover:border-blue-200 hover:bg-[#f8fbff]",
                  disabled && "cursor-not-allowed opacity-50 hover:border-blue-50 hover:bg-white"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border",
                    selected ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-white"
                  )}
                >
                  {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{option.label}</span>
                  {option.description ? <span className="mt-1 block text-xs leading-5 text-slate-500">{option.description}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {maxSelected && selectedValues.length >= maxSelected
          ? (maxSelectedMessage ?? `You can select up to ${maxSelected} items.`)
          : selectedValues.length
            ? "Select again to remove an item. More items may be available by scrolling."
            : emptyText}
      </p>
    </div>
  );
}
