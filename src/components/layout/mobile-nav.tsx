"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminNavItem, helpNavItem, mainNavItems, studentNavItems } from "@/components/layout/nav-items";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useStudentMode } from "@/features/student-mode/student-mode-context";
import { ProfileMenu } from "@/components/layout/profile-menu";

const tabClass = "flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthUser();
  const { isStudentMode, enterStudentMode, exitStudentMode } = useStudentMode();
  const items = isStudentMode
    ? studentNavItems
    : [...(user.role === "admin" ? [adminNavItem] : []), ...mainNavItems];

  return (
    <nav className="glass-panel-strong fixed bottom-2 left-2 right-2 z-40 flex items-center gap-2 rounded-2xl border px-2 py-2 lg:hidden">
      {/* Links scroll sideways on narrow phones; the account menu stays pinned so its popup is not clipped. */}
      <div className="clean-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                tabClass,
                active ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-white/70"
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={isStudentMode ? exitStudentMode : enterStudentMode}
          className={cn(tabClass, "text-slate-600 hover:bg-white/70")}
        >
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          <span>{isStudentMode ? "Exit mode" : "Student"}</span>
        </button>
        {isStudentMode ? null : (
          <Link
            href={helpNavItem.href}
            aria-current={pathname === helpNavItem.href ? "page" : undefined}
            className={cn(
              tabClass,
              pathname === helpNavItem.href
                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md"
                : "text-slate-600 hover:bg-white/70"
            )}
          >
            <helpNavItem.icon className="h-5 w-5" aria-hidden="true" />
            <span>{helpNavItem.label}</span>
          </Link>
        )}
      </div>
      <div className="shrink-0 border-l border-blue-100 pl-2">
        <ProfileMenu compact placement="up-end" />
      </div>
    </nav>
  );
}
