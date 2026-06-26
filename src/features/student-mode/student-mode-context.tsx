"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type StudentModeContextValue = {
  isStudentMode: boolean;
  enterStudentMode: () => void;
  exitStudentMode: () => void;
};

const StudentModeContext = createContext<StudentModeContextValue | null>(null);
const STUDENT_MODE_STORAGE_KEY = "makalearn-student-mode";

export function StudentModeProvider({ children }: { children: ReactNode }) {
  const [isStudentMode, setIsStudentMode] = useState(false);

  useEffect(() => {
    setIsStudentMode(window.localStorage.getItem(STUDENT_MODE_STORAGE_KEY) === "true");
  }, []);

  function enterStudentMode() {
    setIsStudentMode(true);
    window.localStorage.setItem(STUDENT_MODE_STORAGE_KEY, "true");
  }

  function exitStudentMode() {
    setIsStudentMode(false);
    window.localStorage.removeItem(STUDENT_MODE_STORAGE_KEY);
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
