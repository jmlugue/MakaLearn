"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminNavItem, helpNavItem, mainNavItems, studentNavItems } from "@/components/layout/nav-items";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useStudentMode } from "@/features/student-mode/student-mode-context";
import { BrandLogo } from "@/components/layout/brand-logo";
import { ProfileMenu } from "@/components/layout/profile-menu";

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 220;

type NavItem = (typeof mainNavItems)[number];

const itemBaseClass =
  "flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-xl pl-[18px] pr-3 text-left text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300";
const itemIdleClass = "text-slate-700 hover:bg-white/70 hover:text-blue-700";

/**
 * Icon rail that expands on hover (or keyboard focus) and floats over the page, so page content never shifts.
 * Icons keep the same position in both states; only the labels fade in.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthUser();
  const { isStudentMode, enterStudentMode, exitStudentMode } = useStudentMode();
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const expanded = hovered || focusWithin || menuOpen;

  const topItems = isStudentMode ? studentNavItems : user.role === "admin" ? [adminNavItem, ...mainNavItems] : mainNavItems;

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  // Collapse after navigating so the rail does not stay open over the new page.
  useEffect(() => {
    setHovered(false);
    setFocusWithin(false);
  }, [pathname]);

  function scheduleHover(next: boolean) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setHovered(next), next ? OPEN_DELAY_MS : CLOSE_DELAY_MS);
  }

  // Keyboard focus expands the rail; a mouse click leaves focus on a link and should not keep it open.
  function handleFocus(event: React.FocusEvent<HTMLElement>) {
    if (event.target.matches(":focus-visible")) setFocusWithin(true);
  }

  function label(text: string) {
    return (
      <span className={cn("whitespace-nowrap transition-opacity duration-200", expanded ? "opacity-100" : "opacity-0")}>
        {text}
      </span>
    );
  }

  function renderItem(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          itemBaseClass,
          active ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)]" : itemIdleClass
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {label(item.label)}
      </Link>
    );
  }

  return (
    <aside
      onMouseEnter={() => scheduleHover(true)}
      onMouseLeave={() => scheduleHover(false)}
      onFocus={handleFocus}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false);
      }}
      className={cn(
        "glass-panel-strong fixed bottom-4 left-4 top-4 z-40 hidden flex-col rounded-[1.75rem] border px-3 py-4 transition-[width,box-shadow] duration-200 ease-out lg:flex",
        expanded ? "w-64 shadow-[0_26px_70px_rgba(30,64,175,0.22)]" : "w-20"
      )}
      aria-label="Main navigation"
    >
      <Link href="/" aria-label="MakaLearn home" className="mb-6 ml-1 flex w-12 items-center">
        <BrandLogo markClassName="h-12 w-12" />
      </Link>

      <nav className="flex flex-1 flex-col gap-1.5">
        {topItems.map(renderItem)}
        <button
          type="button"
          onClick={isStudentMode ? exitStudentMode : enterStudentMode}
          className={cn(itemBaseClass, itemIdleClass)}
        >
          <GraduationCap className="h-5 w-5 shrink-0" aria-hidden="true" />
          {label(isStudentMode ? "Exit student mode" : "Student mode")}
        </button>
      </nav>

      <div className="mb-3 flex flex-col gap-1.5 border-t border-blue-100/80 pt-3">{renderItem(helpNavItem)}</div>

      <ProfileMenu compact={!expanded} placement="up" onOpenChange={setMenuOpen} />
    </aside>
  );
}
