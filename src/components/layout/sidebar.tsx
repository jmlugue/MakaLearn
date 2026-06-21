"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminNavItem, baseNavItems } from "@/components/layout/nav-items";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuthUser();
  const items = user.role === "admin" ? [...baseNavItems, adminNavItem] : baseNavItems;

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 border-r border-blue-100 bg-white/92 p-5 shadow-soft backdrop-blur lg:flex lg:flex-col">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <BrandLogo />
      </Link>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition",
                active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-900/10"
                  : "text-slate-700 hover:bg-skywash hover:text-blue-700"
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="rounded-lg border border-blue-100 bg-[#f7fbff] p-3">
        <p className="text-sm font-semibold text-ink">{user.name}</p>
        <p className="text-xs capitalize text-slate-600">{user.role}</p>
      </div>
      <Button variant="ghost" className="mt-3 justify-start" onClick={signOut}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </Button>
    </aside>
  );
}
