"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lockScroll, unlockScroll } from "@/components/ui/dialog";
import { GuideTip } from "@/features/guide/guide-tip";
import { ActivityTypeBadge } from "@/features/activities/activity-type-badge";
import { cn } from "@/lib/utils";
import type { ActivityType } from "@/types";

const toolButtonClass =
  "inline-flex min-h-10 items-center gap-2 px-3.5 text-sm font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-none";

/**
 * Full-screen stage for the teacher's player: plain blue glass with a top bar, above the sidebar. It is
 * rendered through a portal so the page transition's transform cannot trap it.
 */
export function ActivityPlayerScreen({
  title,
  type,
  progress,
  children,
  onExit,
  onReset,
  onEdit
}: {
  title: string;
  type: ActivityType;
  /** Questions done out of the total, shown as text and a bar. */
  progress?: { current: number; total: number };
  children: ReactNode;
  onExit: () => void;
  onReset: () => void;
  /** Hidden when the teacher cannot edit this activity. */
  onEdit?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  // Uses the same counted lock as pop-ups. With its own saved value, closing the player and the score
  // pop-up together restored "hidden" last and left the library unable to scroll.
  useEffect(() => {
    setMounted(true);
    lockScroll();
    return unlockScroll;
  }, []);

  // Esc leaves the player, unless a pop-up (the editor) is open and should take it first.
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || document.querySelector("[role='dialog']")) return;
      onExit();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.7),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(186,230,253,0.6),transparent_40%),linear-gradient(135deg,#eef6ff,#f8fbff_50%,#e3eeff)]"
      role="region"
      data-scroll-lock=""
      aria-label={`${title} player`}
    >
      <GuideTip id="activities.teacherBar">
        <header className="flex flex-wrap items-center gap-3 border-b border-white/80 bg-white/70 px-4 py-3 shadow-[0_8px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl sm:px-6">
          <Button type="button" variant="outline" onClick={onExit}>
            <X className="h-4 w-4" aria-hidden="true" />
            Exit
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="truncate text-lg font-extrabold tracking-[-0.02em] text-ink">{title}</p>
            <ActivityTypeBadge type={type} className="hidden shrink-0 sm:inline-flex" />
          </div>
          {progress ? (
            <span className="inline-flex items-baseline gap-1 rounded-full bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm">
              <span className="text-base font-black">{progress.current}</span> of {progress.total} done
            </span>
          ) : null}
          {/* Restart and Edit sit together as one control, so they read as a pair and not as loose links. */}
          <div className="inline-flex overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
            <button type="button" onClick={onReset} aria-label="Restart" title="Start again from question 1" className={toolButtonClass}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Restart</span>
            </button>
            {onEdit ? (
              <button type="button" onClick={onEdit} aria-label="Edit" title="Edit this activity" className={cn(toolButtonClass, "border-l border-blue-200")}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            ) : null}
          </div>
        </header>
      </GuideTip>
      <div className="h-2 w-full bg-blue-100/70" aria-hidden="true">
        <div
          className="h-full rounded-r-full bg-blue-600 transition-[width] duration-500"
          style={{ width: `${progress && progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
        />
      </div>
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>,
    document.body
  );
}
