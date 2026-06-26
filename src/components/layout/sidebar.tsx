"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminNavItem, baseNavItems, studentNavItems } from "@/components/layout/nav-items";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useStudentMode } from "@/features/student-mode/student-mode-context";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuthUser();
  const { isStudentMode, enterStudentMode, exitStudentMode } = useStudentMode();
  const items = isStudentMode ? studentNavItems : user.role === "admin" ? [...baseNavItems, adminNavItem] : baseNavItems;

  return (
    <aside className="glass-panel-strong fixed bottom-4 left-4 top-4 z-30 hidden w-64 rounded-[1.75rem] border p-4 lg:flex lg:flex-col">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <BrandLogo />
      </Link>
      <nav className="flex flex-1 flex-col gap-1.5">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)]"
                  : "text-slate-700 hover:translate-x-0.5 hover:bg-white/70 hover:text-blue-700"
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="rounded-2xl border border-white/80 bg-white/55 p-3 shadow-sm backdrop-blur-xl">
        <p className="text-sm font-semibold text-ink">{isStudentMode ? "Student mode" : user.name}</p>
        <p className="text-xs capitalize text-slate-600">
          {isStudentMode ? "Guided access" : user.role}
        </p>
      </div>
      {isStudentMode ? (
        <Button variant="secondary" className="mt-3 justify-start" onClick={exitStudentMode}>
          <GraduationCap className="h-4 w-4" aria-hidden="true" />
          Exit student mode
        </Button>
      ) : (
        <>
          <Button variant="secondary" className="mt-3 justify-start" onClick={enterStudentMode}>
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Enter student mode
          </Button>
          <Button variant="ghost" className="mt-2 justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </>
      )}
    </aside>
  );
}
