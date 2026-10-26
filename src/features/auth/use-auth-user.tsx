"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { insertAuditLog } from "@/lib/audit-logs";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { clearStudentModePreference } from "@/features/student-mode/student-mode-context";
import type { AppUser } from "@/types";

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  error: string;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
const INACTIVITY_CHANNEL_NAME = "makalearn-auth-activity";

function mapProfile(row: {
  id: string;
  name: string;
  email: string;
  role: AppUser["role"];
  status: AppUser["status"];
}): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasCompletedInitialCheck = useRef(false);
  const currentUser = useRef<AppUser | null>(null);

  const setCurrentUser = useCallback((nextUser: AppUser | null) => {
    currentUser.current = nextUser;
    setUser(nextUser);
  }, []);

  const finishProfileRefresh = useCallback(() => {
    hasCompletedInitialCheck.current = true;
    setLoading(false);
  }, []);

  // Load the account's role and status from its saved profile after checking the session.
  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCurrentUser(null);
      setError("Sign in is not available yet. Ask an administrator to finish account setup.");
      finishProfileRefresh();
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      finishProfileRefresh();
      return;
    }

    if (!hasCompletedInitialCheck.current) {
      setLoading(true);
    }

    let sessionResult;
    try {
      sessionResult = await supabase.auth.getSession();
    } catch {
      if (currentUser.current) {
        setError("");
      } else {
        setError("MakaLearn could not check your account session. Try again.");
      }
      finishProfileRefresh();
      return;
    }

    const sessionUser = sessionResult.data.session?.user;

    if (!sessionUser) {
      setCurrentUser(null);
      setError("");
      finishProfileRefresh();
      return;
    }

    let profileResult;
    try {
      profileResult = await supabase
        .from("profiles")
        .select("id,name,email,role,status")
        .eq("id", sessionUser.id)
        .single();
    } catch {
      profileResult = null;
    }

    if (!profileResult) {
      if (currentUser.current) {
        setError("");
      } else {
        setCurrentUser(null);
        setError("MakaLearn could not load your account profile. Try again.");
      }
      finishProfileRefresh();
      return;
    }

    const { data, error: profileError } = profileResult;

    if (profileError || !data) {
      if (currentUser.current) {
        setError("");
      } else {
        setCurrentUser(null);
        setError("Your account exists, but no MakaLearn profile was found for it.");
      }
      finishProfileRefresh();
      return;
    }

    if (data.status !== "active") {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setError("This MakaLearn account is not active. Ask an administrator to reactivate it.");
      finishProfileRefresh();
      return;
    }

    setCurrentUser(mapProfile(data));
    setError("");
    finishProfileRefresh();
  }, [finishProfileRefresh, setCurrentUser]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    refreshProfile();

    if (!supabase) return undefined;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      refreshProfile();
    });

    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    const signedInUser = currentUser.current;
    if (signedInUser) {
      await insertAuditLog({
        category: "auth",
        action: "logout",
        actor: signedInUser,
        targetType: "session",
        targetTitle: "Sign out",
        detail: `${signedInUser.name} signed out.`
      }).catch(() => undefined);
    }
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearStudentModePreference();
    setCurrentUser(null);
    router.replace("/login");
  }, [router, setCurrentUser]);

  // End the authenticated session after five quiet minutes. BroadcastChannel keeps
  // activity in another MakaLearn tab from expiring this tab's session.
  useEffect(() => {
    if (!user?.id) return undefined;
    const userId = user.id;

    let lastActivityAt = Date.now();
    let timeoutId: number | undefined;
    let signingOutForInactivity = false;
    const channel = typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(INACTIVITY_CHANNEL_NAME);

    const scheduleSignOut = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityAt));
      timeoutId = window.setTimeout(() => {
        if (signingOutForInactivity) return;
        signingOutForInactivity = true;
        void signOut();
      }, remaining);
    };

    const recordActivity = () => {
      lastActivityAt = Date.now();
      channel?.postMessage({ userId, activityAt: lastActivityAt });
      scheduleSignOut();
    };

    const handleBroadcast = (event: MessageEvent<{ userId?: string; activityAt?: number }>) => {
      if (event.data?.userId === userId && typeof event.data.activityAt === "number") {
        lastActivityAt = Math.max(lastActivityAt, event.data.activityAt);
        scheduleSignOut();
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "touchstart", "wheel", "scroll"];
    const handleActivity = () => recordActivity();

    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    channel?.addEventListener("message", handleBroadcast);
    scheduleSignOut();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      channel?.removeEventListener("message", handleBroadcast);
      channel?.close();
    };
  }, [signOut, user?.id]);

  const value = useMemo(
    () => ({ user, loading, error, refreshProfile, signOut }),
    [error, loading, refreshProfile, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthState() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuthState must be used inside AuthProvider");
  }
  return value;
}

export function useAuthUser() {
  const value = useAuthState();
  if (!value.user) {
    throw new Error("useAuthUser must be used after authentication has loaded.");
  }
  return {
    user: value.user,
    refreshProfile: value.refreshProfile,
    signOut: value.signOut
  };
}

