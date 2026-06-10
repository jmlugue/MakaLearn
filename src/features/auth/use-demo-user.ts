"use client";

import { useEffect, useMemo, useState } from "react";
import { demoUsers } from "@/data/mock-data";
import type { AppUser, UserRole } from "@/types";

const storageKey = "makalearn-demo-user";

export function useDemoUser() {
  const [user, setUserState] = useState<AppUser>(demoUsers[1]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const next = demoUsers.find((candidate) => candidate.id === stored);
      if (next) setUserState(next);
    }
  }, []);

  const api = useMemo(
    () => ({
      user,
      setUserByRole(role: UserRole) {
        const next = demoUsers.find((candidate) => candidate.role === role) ?? demoUsers[1];
        window.localStorage.setItem(storageKey, next.id);
        setUserState(next);
      }
    }),
    [user]
  );

  return api;
}
