"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

  const refreshProfile = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setUser(null);
      setError("Sign in is not available yet. Ask an administrator to finish account setup.");
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const sessionResult = await supabase.auth.getSession();
    const sessionUser = sessionResult.data.session?.user;

    if (!sessionUser) {
      setUser(null);
      setError("");
      setLoading(false);
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id,name,email,role,status")
      .eq("id", sessionUser.id)
      .single();

    if (profileError || !data) {
      setUser(null);
      setError("Your account exists, but no MakaLearn profile was found for it.");
      setLoading(false);
      return;
    }

    setUser(mapProfile(data));
    setError("");
    setLoading(false);
  }, []);

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
    if (user) {
      await insertAuditLog({
        category: "auth",
        action: "logout",
        actor: user,
        targetType: "session",
        targetTitle: "Sign out",
        detail: `${user.name} signed out.`
      }).catch(() => undefined);
    }
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearStudentModePreference();
    setUser(null);
    router.replace("/login");
  }, [router, user]);

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
