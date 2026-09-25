"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MenuItem =
  | { type?: "item"; label: string; icon?: LucideIcon; onSelect: () => void; tone?: "default" | "danger"; disabled?: boolean }
  | { type: "separator" };

const MENU_WIDTH = 224;

/**
 * ⋯ button that opens a small action menu. The menu is portalled to <body> with fixed positioning
 * so tables with overflow never clip it. Closes on outside click, Esc, scroll, or after choosing an item.
 */
export function DropdownMenu({
  label,
  items,
  disabled,
  trigger
}: {
  label: string;
  items: MenuItem[];
  disabled?: boolean;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; openUp: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const estimatedHeight = items.length * 42 + 16;
    const openUp = rect.bottom + estimatedHeight > window.innerHeight - 8;
    setPosition({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
      openUp
    });
  }, [items.length, open]);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function close() {
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    if (open && position) {
      // preventScroll: a focus-triggered scroll would fire the scroll listener and close the menu.
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus({ preventScroll: true });
    }
  }, [open, position]);

  function moveFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      setOpen(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const entries = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);
    const index = entries.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (index + 1) % entries.length : (index - 1 + entries.length) % entries.length;
    entries[next]?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        {trigger ?? <MoreHorizontal className="h-5 w-5" aria-hidden="true" />}
      </button>

      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              onKeyDown={moveFocus}
              style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
              className={cn(
                "fixed z-[140] rounded-xl border border-blue-100 bg-[#fff] p-1.5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.16)]",
                position.openUp && "-translate-y-full"
              )}
            >
              {items.map((item, index) =>
                item.type === "separator" ? (
                  <div key={`separator-${index}`} className="my-1 border-t border-slate-100" />
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      setOpen(false);
                      item.onSelect();
                    }}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                      item.tone === "danger"
                        ? "text-red-600 hover:bg-red-50 focus-visible:bg-red-50"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700 focus-visible:bg-blue-50"
                    )}
                  >
                    {item.icon ? <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                    {item.label}
                  </button>
                )
              )}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
