"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Persistent, retryable feedback uses the same quiet panels as the rest of the app. */
export function LoadError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div role="alert" className="my-4 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-white/90 p-4 shadow-sm">
      <TriangleAlert className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm font-semibold text-ink">Couldn&apos;t load {label}. Please try again.</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}><RefreshCw className="h-4 w-4" aria-hidden="true" />Retry</Button>
    </div>
  );
}
