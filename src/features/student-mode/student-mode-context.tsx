"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type StudentModeContextValue = {
  isStudentMode: boolean;
  enterStudentMode: () => void;
  exitStudentMode: () => void;
};

const StudentModeContext = createContext<StudentModeContextValue | null>(null);
export function clearStudentModePreference() {
  // Student Mode is intentionally session-only during the Supabase-only migration.
}

export function StudentModeProvider({ children }: { children: ReactNode }) {
  const [isStudentMode, setIsStudentMode] = useState(false);

  function enterStudentMode() {
    setIsStudentMode(true);
  }

  function exitStudentMode() {
    setIsStudentMode(false);
    clearStudentModePreference();
  }

  const value = useMemo(
    () => ({ isStudentMode, enterStudentMode, exitStudentMode }),
    [isStudentMode]
  );

  return <StudentModeContext.Provider value={value}>{children}</StudentModeContext.Provider>;
}

export function useStudentMode() {
  const value = useContext(StudentModeContext);
  if (!value) {
    throw new Error("useStudentMode must be used inside StudentModeProvider");
  }

  return value;
}
