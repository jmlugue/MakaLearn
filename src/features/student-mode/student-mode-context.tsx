"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type StudentModeContextValue = {
  isStudentMode: boolean;
  isStudentNavOpen: boolean;
  enterStudentMode: () => void;
  exitStudentMode: () => void;
  openStudentNav: () => void;
  closeStudentNav: () => void;
};

const StudentModeContext = createContext<StudentModeContextValue | null>(null);
const CLEAR_STUDENT_MODE_EVENT = "makalearn:clear-student-mode";

export function clearStudentModePreference() {
  // Student Mode is intentionally session-only during the Supabase-only migration.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CLEAR_STUDENT_MODE_EVENT));
  }
}

export function StudentModeProvider({ children }: { children: ReactNode }) {
  const [isStudentMode, setIsStudentMode] = useState(false);
  // Keep the menu state above individual pages so navigation cannot reopen it
  // when a new AppShell mounts for the destination route.
  const [isStudentNavOpen, setIsStudentNavOpen] = useState(false);

  useEffect(() => {
    function handleClearStudentMode() {
      setIsStudentMode(false);
      setIsStudentNavOpen(false);
    }

    window.addEventListener(CLEAR_STUDENT_MODE_EVENT, handleClearStudentMode);
    return () => window.removeEventListener(CLEAR_STUDENT_MODE_EVENT, handleClearStudentMode);
  }, []);

  function enterStudentMode() {
    setIsStudentMode(true);
    setIsStudentNavOpen(true);
  }

  function exitStudentMode() {
    setIsStudentMode(false);
    setIsStudentNavOpen(false);
    clearStudentModePreference();
  }

  function openStudentNav() {
    setIsStudentNavOpen(true);
  }

  function closeStudentNav() {
    setIsStudentNavOpen(false);
  }

  const value = useMemo(
    () => ({ isStudentMode, isStudentNavOpen, enterStudentMode, exitStudentMode, openStudentNav, closeStudentNav }),
    [isStudentMode, isStudentNavOpen]
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
