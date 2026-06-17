"use client";

import { ChangeEvent, useId, useRef, useState } from "react";
import { FileUp, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FileUpload({
  label,
  accept,
  hint,
  storageNote,
  icon: Icon = FileUp,
  compact = false
}: {
  label: string;
  accept: string;
  hint: string;
  storageNote: string;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setFileName(event.target.files?.[0]?.name ?? "");
  }

  function removeFile() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setFileName("");
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-blue-200 bg-white p-3 transition hover:border-blue-300 hover:bg-skywash",
        compact ? "p-3" : "p-4"
      )}
    >
      <input ref={inputRef} id={id} type="file" accept={accept} onChange={handleChange} className="sr-only" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <label
          htmlFor={id}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className="group flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-blue-100 bg-[#f8fbff] text-blue-700 group-hover:border-blue-300">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink">{label}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">{fileName || hint}</span>
          </span>
        </label>
        <div className="flex shrink-0 gap-2">
          <label
            htmlFor={id}
            className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-ink shadow-sm transition hover:bg-skywash"
          >
            {fileName ? "Change" : "Choose"}
          </label>
          {fileName ? (
            <Button type="button" variant="ghost" size="icon" onClick={removeFile} aria-label={`Remove ${label}`}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
      {/* Future Supabase Storage: wire this control to the bucket noted below. */}
      <p className="mt-2 text-xs leading-5 text-slate-500">{storageNote}</p>
    </div>
  );
}
