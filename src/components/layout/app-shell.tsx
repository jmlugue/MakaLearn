"use client";

import { ReactNode } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/common/toast-provider";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <Sidebar />
      <main className="min-h-screen px-4 pb-24 pt-5 md:px-6 lg:ml-72 lg:px-8 lg:pb-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <MobileNav />
    </ToastProvider>
  );
}
