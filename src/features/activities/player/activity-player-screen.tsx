"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, RotateCcw, X } from "lucide-react";
import { GuideTip } from "@/features/guide/guide-tip";

const barButtonClass =
  "grid h-12 w-12 place-items-center rounded-2xl border-4 border-white bg-white/90 text-blue-700 shadow-[0_10px_24px_rgba(37,99,235,0.18)] backdrop-blur transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200";

/**
 * Full-screen stage for the teacher's player. It sits above the sidebar through a portal, so the page
 * transition's transform cannot trap the player's own `fixed` layouts. The teacher bar takes the top-left
 * slot that Student mode gives to its logo button.
 */
export function ActivityPlayerScreen({
  title,
  children,
  onExit,
  onReset,
  onEdit
}: {
  title: string;
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

  // Esc leaves the player, unless a pop-up (result or editor) is open and should take it first.
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
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-[#dff5ff] p-2" role="region" aria-label={`${title} player`}>
      {children}
      <GuideTip id="activities.teacherBar">
        <nav aria-label="Teacher controls" className="fixed left-3 top-3 z-[55] flex flex-col gap-2 sm:left-4">
          <button type="button" onClick={onExit} className={barButtonClass} aria-label="Exit to library" title="Exit to library">
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
          <button type="button" onClick={onReset} className={barButtonClass} aria-label="Restart activity" title="Restart activity">
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </button>
          {onEdit ? (
            <button type="button" onClick={onEdit} className={barButtonClass} aria-label="Edit activity" title="Edit activity">
              <Pencil className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
        </nav>
      </GuideTip>
    </div>,
    document.body
  );
}
