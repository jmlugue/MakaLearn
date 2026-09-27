"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { StudentModeTransition, type StudentModeSwitch } from "@/features/student-mode/student-mode-transition";

// How long the switch card stays up. The route change happens underneath it.
const SWITCH_MS = 1100;

type StudentModeContextValue = {
  isStudentMode: boolean;
  isStudentNavOpen: boolean;
  /** `startAt` opens Student mode on that page (Help's Go there) instead of the playground with the menu open. */
  enterStudentMode: (startAt?: string) => void;
  /** The page Student mode should open on, read once by the route guard in AppShell. */
  takeStudentStartRoute: () => string | null;
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
  const startRouteRef = useRef<string | null>(null);

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

  function enterStudentMode(startAt?: string) {
    const target = typeof startAt === "string" ? startAt : null;
    startRouteRef.current = target;
    setSwitching("enter");
    setIsStudentMode(true);
    // Going straight to a page keeps the menu closed so the page is visible.
    setIsStudentNavOpen(!target);
  }

  const takeStudentStartRoute = useCallback(() => {
    const target = startRouteRef.current;
    startRouteRef.current = null;
    return target;
  }, []);

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
    () => ({ isStudentMode, isStudentNavOpen, enterStudentMode, exitStudentMode, openStudentNav, closeStudentNav, takeStudentStartRoute }),
    [isStudentMode, isStudentNavOpen, takeStudentStartRoute]
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
