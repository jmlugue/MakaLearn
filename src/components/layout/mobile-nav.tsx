"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminNavItem, baseNavItems } from "@/components/layout/nav-items";
import { useAuthUser } from "@/features/auth/use-auth-user";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuthUser();
  const items = user.role === "admin" ? [...baseNavItems.slice(0, 5), adminNavItem] : baseNavItems.slice(0, 5);

  return (
    <nav className="glass-panel-strong fixed bottom-2 left-2 right-2 z-40 grid grid-cols-6 rounded-2xl border px-2 py-2 lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition",
              active ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-white/70"
            )}
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
