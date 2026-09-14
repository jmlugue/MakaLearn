"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useStudentMode } from "@/features/student-mode/student-mode-context";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)).toUpperCase();
}

type Placement = "up" | "right" | "up-end";

/**
 * Account button with a small menu: Profile, Settings, and Sign out.
 * `placement` decides where the menu opens: above (expanded sidebar), to the right (collapsed rail),
 * or above aligned right (mobile bottom bar).
 */
export function ProfileMenu({
  compact = false,
  placement = "up",
  onOpenChange
}: {
  compact?: boolean;
  placement?: Placement;
  onOpenChange?: (open: boolean) => void;
}) {
  const { user, signOut } = useAuthUser();
  const { isStudentMode } = useStudentMode();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  useEffect(() => {
    if (!open) return;
    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const avatar = (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-black text-blue-700 ring-2 ring-white">
      {initialsOf(user.name)}
    </span>
  );

  const itemClass =
    "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700 focus-visible:bg-blue-50 focus-visible:outline-none";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={compact ? `Account menu for ${user.name}` : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
          compact ? "justify-center p-1" : "border border-white/80 bg-white/55 p-2 pr-3 shadow-sm hover:bg-white/80",
          open && !compact && "bg-white/85"
        )}
      >
        {avatar}
        {compact ? null : (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{user.name}</span>
              <span className="block text-xs capitalize text-slate-600">{isStudentMode ? "Student mode" : user.role}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          </>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-56 rounded-xl border border-blue-100 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]",
            placement === "up" && "bottom-full left-0 mb-2 w-full min-w-56",
            placement === "right" && "bottom-0 left-full ml-3",
            placement === "up-end" && "bottom-full right-0 mb-2"
          )}
        >
          <div className="border-b border-blue-50 px-3 pb-2 pt-1.5">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <div className="pt-1">
            <Link href="/profile" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <UserRound className="h-4 w-4" aria-hidden="true" /> Profile
            </Link>
            <Link href="/settings" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <Settings className="h-4 w-4" aria-hidden="true" /> Settings
            </Link>
            <div className="my-1 border-t border-blue-50" />
            <button
              type="button"
              role="menuitem"
              className={cn(itemClass, "text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50")}
              onClick={() => {
                setOpen(false);
                signOut();
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
