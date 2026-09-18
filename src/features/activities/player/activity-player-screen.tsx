"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuideTip } from "@/features/guide/guide-tip";
import { ActivityTypeBadge } from "@/features/activities/activity-type-badge";
import type { ActivityType } from "@/types";

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
  /** Short progress text, for example "2 / 5". */
  progress?: string;
  children: ReactNode;
  onExit: () => void;
  onReset: () => void;
  /** Hidden when the teacher cannot edit this activity. */
  onEdit?: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
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
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-gradient-to-br from-[#eef6ff] via-[#f8fbff] to-[#e3eeff]"
      role="region"
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
          {progress ? <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 ring-1 ring-blue-100">{progress}</span> : null}
          <Button type="button" variant="ghost" onClick={onReset} aria-label="Restart">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Restart</span>
          </Button>
          {onEdit ? (
            <Button type="button" variant="ghost" onClick={onEdit} aria-label="Edit">
              <Pencil className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          ) : null}
        </header>
      </GuideTip>
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>,
    document.body
  );
}
