"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { adminNavItem, baseNavItems } from "@/components/layout/nav-items";
import { useDemoUser } from "@/features/auth/use-demo-user";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useDemoUser();
  const items = user.role === "admin" ? [...baseNavItems.slice(0, 5), adminNavItem] : baseNavItems.slice(0, 5);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 border-t border-blue-100 bg-white/95 px-2 py-2 shadow-soft backdrop-blur lg:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold",
              active ? "bg-blue-600 text-white" : "text-slate-600"
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
