"use client";

import { ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { guideTips } from "@/features/guide/guide-content";
import { useUserSettings } from "@/features/settings/user-settings-context";

const SHOW_DELAY_MS = 250;
const BUBBLE_WIDTH = 240;
const CURSOR_OFFSET = 18;

type Point = { x: number; y: number };

/**
 * Wraps a control with a hover explanation, shown only while Guide mode is on. The bubble follows the
 * cursor, and anchors to the element instead when it is reached by keyboard. When Guide mode is off the
 * child renders exactly as it would without this wrapper.
 */
export function GuideTip({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  const { preferences } = useUserSettings();
  const text = guideTips[id];
  const enabled = preferences.guideMode && Boolean(text);

  const tipId = useId();
  const holderRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<number | null>(null);
  const [point, setPoint] = useState<Point | null>(null);

  const hide = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPoint(null);
  }, []);

  useEffect(() => () => hide(), [hide]);

  // A tip must never outlive the reason it is on screen.
  useEffect(() => {
    if (!point) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [hide, point]);

  useEffect(() => {
    if (!enabled) hide();
  }, [enabled, hide]);

  if (!enabled) return <>{children}</>;

  function clamp(x: number, y: number): Point {
    const left = Math.max(8, Math.min(x, window.innerWidth - BUBBLE_WIDTH - 8));
    const top = Math.max(8, Math.min(y, window.innerHeight - 8));
    return { x: left, y: top };
  }

  function schedule(next: Point) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setPoint(next), SHOW_DELAY_MS);
  }

  return (
    <>
      <span
        ref={holderRef}
        className={cn("contents", className)}
        aria-describedby={point ? tipId : undefined}
        onPointerEnter={(event) => {
          // Touch has no hover, and the page intro already covers the same ground there.
          if (event.pointerType === "touch") return;
          schedule(clamp(event.clientX + CURSOR_OFFSET, event.clientY + CURSOR_OFFSET));
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "touch" || !point) return;
          setPoint(clamp(event.clientX + CURSOR_OFFSET, event.clientY + CURSOR_OFFSET));
        }}
        onPointerLeave={hide}
        onPointerDown={hide}
        onFocusCapture={() => {
          const box = holderRef.current?.firstElementChild?.getBoundingClientRect();
          if (box) schedule(clamp(box.left, box.bottom + 8));
        }}
        onBlurCapture={hide}
      >
        {children}
      </span>
      {point
        ? createPortal(
            <span
              id={tipId}
              role="tooltip"
              style={{ top: point.y, left: point.x, width: BUBBLE_WIDTH }}
              className="pointer-events-none fixed z-[300] flex items-start gap-2 rounded-2xl border border-white/90 bg-gradient-to-br from-white/95 via-blue-50/90 to-sky-50/85 p-3 text-xs font-medium leading-5 text-slate-700 shadow-[0_16px_40px_rgba(30,64,175,0.22)] backdrop-blur-xl"
            >
              <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden="true" />
              {text}
            </span>,
            document.body
          )
        : null}
    </>
  );
}
