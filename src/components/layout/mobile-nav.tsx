"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminNavItem, baseNavItems, studentNavItems } from "@/components/layout/nav-items";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useStudentMode } from "@/features/student-mode/student-mode-context";

export function MobileNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuthUser();
  const { isStudentMode, enterStudentMode, exitStudentMode } = useStudentMode();
  const items = isStudentMode ? studentNavItems : user.role === "admin" ? [adminNavItem, ...baseNavItems] : baseNavItems;

  return (
    <nav className="glass-panel-strong fixed bottom-2 left-2 right-2 z-40 flex gap-2 overflow-x-auto rounded-2xl border px-2 py-2 lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold transition",
              active ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-white/70"
            )}
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      {isStudentMode ? (
        <button
          type="button"
          onClick={exitStudentMode}
          className="flex min-h-14 min-w-20 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold text-slate-600 transition hover:bg-white/70"
        >
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          <span>Exit mode</span>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={enterStudentMode}
            className="flex min-h-14 min-w-20 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold text-slate-600 transition hover:bg-white/70"
          >
            <GraduationCap className="h-5 w-5" aria-hidden="true" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-14 min-w-16 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-semibold text-slate-600 transition hover:bg-white/70"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            <span>Exit</span>
          </button>
        </>
      )}
    </nav>
  );
}
