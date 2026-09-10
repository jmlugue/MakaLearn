"use client";

import { ReactNode } from "react";
import { ToastProvider } from "@/components/common/toast-provider";
import { AuthProvider } from "@/features/auth/use-auth-user";
import { StudentModeProvider } from "@/features/student-mode/student-mode-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <StudentModeProvider>{children}</StudentModeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
