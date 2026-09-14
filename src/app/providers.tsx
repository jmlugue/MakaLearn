"use client";

import { ReactNode } from "react";
import { ToastProvider } from "@/components/common/toast-provider";
import { AuthProvider } from "@/features/auth/use-auth-user";
import { UserSettingsProvider } from "@/features/settings/user-settings-context";
import { StudentModeProvider } from "@/features/student-mode/student-mode-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <UserSettingsProvider>
          <StudentModeProvider>{children}</StudentModeProvider>
        </UserSettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
