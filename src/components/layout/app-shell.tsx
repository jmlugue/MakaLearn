"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { ToastProvider } from "@/components/common/toast-provider";
import { AuthProvider, useAuthState } from "@/features/auth/use-auth-user";
import { StudentModeProvider, useStudentMode } from "@/features/student-mode/student-mode-context";
import { studentRouteHrefs } from "@/components/layout/nav-items";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/common/loading-state";
import { PageTransition } from "@/components/motion/page-transition";

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
  const { isStudentMode } = useStudentMode();

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
      <Sidebar />
      <main className="app-canvas min-h-screen px-4 pb-24 pt-5 md:px-6 lg:ml-72 lg:px-8 lg:pb-10 lg:pt-7">
        <div className="mx-auto max-w-7xl">
          <PageTransition key={pathname}>{children}</PageTransition>
        </div>
      </main>
      <MobileNav />
    </>
  );
}
