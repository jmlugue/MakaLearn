"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { StudentModeTransition, type StudentModeSwitch } from "@/features/student-mode/student-mode-transition";

// How long the switch card stays up. The route change happens underneath it.
const SWITCH_MS = 1100;

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
  const [switching, setSwitching] = useState<StudentModeSwitch | null>(null);

  useEffect(() => {
    if (!switching) return;
    const timer = window.setTimeout(() => setSwitching(null), SWITCH_MS);
    return () => window.clearTimeout(timer);
  }, [switching]);

  useEffect(() => {
    function handleClearStudentMode() {
      setIsStudentMode(false);
      setIsStudentNavOpen(false);
    }

    window.addEventListener(CLEAR_STUDENT_MODE_EVENT, handleClearStudentMode);
    return () => window.removeEventListener(CLEAR_STUDENT_MODE_EVENT, handleClearStudentMode);
  }, []);

  function enterStudentMode() {
    setSwitching("enter");
    setIsStudentMode(true);
    setIsStudentNavOpen(true);
  }

  function exitStudentMode() {
    setSwitching("exit");
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

  return (
    <StudentModeContext.Provider value={value}>
      {children}
      {/* Lives above AppShell so it survives the route change it covers. */}
      <StudentModeTransition mode={switching} />
    </StudentModeContext.Provider>
  );
}

export function useStudentMode() {
  const value = useContext(StudentModeContext);
  if (!value) {
    throw new Error("useStudentMode must be used inside StudentModeProvider");
  }

  return value;
}
