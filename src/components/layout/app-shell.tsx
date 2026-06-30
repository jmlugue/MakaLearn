"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { GraduationCap, X } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/common/toast-provider";
import { AuthProvider, useAuthState } from "@/features/auth/use-auth-user";
import { StudentModeProvider, useStudentMode } from "@/features/student-mode/student-mode-context";
import { studentNavItems, studentRouteHrefs } from "@/components/layout/nav-items";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/loading-state";
import { PageTransition } from "@/components/motion/page-transition";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/layout/brand-logo";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <StudentModeProvider>
          <AuthenticatedShell>{children}</AuthenticatedShell>
        </StudentModeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, error } = useAuthState();
  const { isStudentMode, exitStudentMode } = useStudentMode();
  const [studentNavOpen, setStudentNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && !error) {
      router.replace("/login");
    }
  }, [error, loading, router, user]);

  useEffect(() => {
    if (!loading && user && isStudentMode && !studentRouteHrefs.includes(pathname)) {
      router.replace("/playground");
    }
  }, [isStudentMode, loading, pathname, router, user]);

  useEffect(() => {
    setStudentNavOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <LoadingState label="Checking your MakaLearn account" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <Card className="max-w-md">
          <CardTitle>Sign in required</CardTitle>
          <CardDescription className="mt-2">
            {error || "Use your teacher or admin account to open MakaLearn."}
          </CardDescription>
          <Link href="/login" className="mt-4 inline-flex">
            <Button>Go to sign in</Button>
          </Link>
        </Card>
      </main>
    );
  }

  if (isStudentMode && !studentRouteHrefs.includes(pathname)) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <LoadingState label="Opening student mode" />
      </main>
    );
  }

  return (
    <>
      {isStudentMode ? null : <Sidebar />}
      {isStudentMode ? (
        <>
          <button
            type="button"
            onClick={() => setStudentNavOpen(true)}
            className="fixed left-4 top-3 z-[70] rounded-2xl shadow-[0_12px_30px_rgba(37,99,235,0.18)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100"
            aria-label="Open student navigation"
            aria-expanded={studentNavOpen}
          >
            <BrandLogo markClassName="h-12 w-12 rounded-2xl" />
          </button>
          {studentNavOpen ? (
            <div className="fixed inset-0 z-[80] bg-slate-950/35 backdrop-blur-sm" role="presentation" onClick={() => setStudentNavOpen(false)}>
              <aside
                className="glass-panel-strong absolute bottom-3 left-3 top-3 flex w-72 max-w-[calc(100vw-1.5rem)] flex-col rounded-[1.75rem] border p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
                aria-label="Student navigation"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-6 flex items-center justify-between gap-3">
                  <BrandLogo markClassName="h-14 w-14 rounded-2xl" />
                  <button
                    type="button"
                    onClick={() => setStudentNavOpen(false)}
                    className="grid h-11 w-11 place-items-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-sm transition hover:bg-skywash"
                    aria-label="Close student navigation"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <nav className="grid gap-2">
                  {studentNavItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex min-h-16 items-center gap-3 rounded-2xl px-4 text-lg font-black transition",
                          active
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)]"
                            : "bg-white/70 text-slate-700 hover:bg-white hover:text-blue-700"
                        )}
                      >
                        <item.icon className="h-7 w-7" aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <Button type="button" variant="secondary" className="mt-auto min-h-14 justify-start rounded-2xl text-base" onClick={exitStudentMode}>
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  Exit student mode
                </Button>
              </aside>
            </div>
          ) : null}
        </>
      ) : null}
      <main
        className={cn(
          "app-canvas min-h-screen",
          isStudentMode
            ? cn("px-2 pb-2 sm:px-3 sm:pb-3 lg:px-4", pathname === "/gesture-practice" ? "pt-2 sm:pt-3" : "pt-20")
            : "px-4 pb-24 pt-5 md:px-6 lg:ml-72 lg:px-8 lg:pb-10 lg:pt-7"
        )}
      >
        <div className={cn("mx-auto", isStudentMode ? "w-full max-w-none" : "max-w-7xl")}>
          <PageTransition key={pathname}>{children}</PageTransition>
        </div>
      </main>
      {isStudentMode ? null : <MobileNav />}
    </>
  );
}
