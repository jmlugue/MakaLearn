"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useToast } from "@/components/common/toast-provider";
import { useAuthState } from "@/features/auth/use-auth-user";
import { fetchUserSettings, upsertUserSettings } from "@/lib/supabase/app-data";

export type TextSize = "default" | "large" | "extra-large";

export type Preferences = {
  textSize: TextSize;
  highContrast: boolean;
  reduceMotion: boolean;
  audioGuidance: boolean;
};

type UserSettingsContextValue = {
  preferences: Preferences;
  loaded: boolean;
  /** Saves one or more preferences. Resolves true when saved, false when it failed and was reverted. */
  updatePreferences: (next: Partial<Preferences>) => Promise<boolean>;
};

const defaultPreferences: Preferences = {
  textSize: "default",
  highContrast: false,
  reduceMotion: false,
  audioGuidance: true
};

// The database only stores `large_text` as a boolean, so "Extra large" is kept per browser and
// saved to the database as large. On another device it falls back to Large until chosen again.
const EXTRA_LARGE_KEY = "makalearn.extra-large-text";

function readExtraLarge(userId: string) {
  try {
    return window.localStorage.getItem(`${EXTRA_LARGE_KEY}.${userId}`) === "true";
  } catch {
    return false;
  }
}

function writeExtraLarge(userId: string, value: boolean) {
  try {
    window.localStorage.setItem(`${EXTRA_LARGE_KEY}.${userId}`, String(value));
  } catch {
    // Falls back to Large on the next visit.
  }
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

/** Loads the signed-in user's accessibility preferences once and applies them on every page. */
export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthState();
  const { notify } = useToast();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loaded, setLoaded] = useState(false);
  const preferencesRef = useRef(preferences);
  const userId = user?.id ?? null;

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    let active = true;
    setLoaded(false);

    if (!userId) {
      setPreferences(defaultPreferences);
      return undefined;
    }

    fetchUserSettings(userId)
      .then((settings) => {
        if (!active) return;
        if (settings) {
          setPreferences({
            textSize: settings.largeText ? (readExtraLarge(userId) ? "extra-large" : "large") : "default",
            highContrast: settings.highContrast || settings.theme === "high-contrast",
            reduceMotion: settings.reduceMotion,
            audioGuidance: settings.audioGuidance
          });
        }
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("large-text", preferences.textSize === "large");
    root.classList.toggle("extra-large-text", preferences.textSize === "extra-large");
    root.classList.toggle("high-contrast", preferences.highContrast);
    root.classList.toggle("reduce-motion", preferences.reduceMotion);
  }, [preferences]);

  const updatePreferences = useCallback(
    async (next: Partial<Preferences>) => {
      if (!userId) return false;
      const previous = preferencesRef.current;
      const merged = { ...previous, ...next };
      setPreferences(merged);

      try {
        await upsertUserSettings({
          userId,
          largeText: merged.textSize !== "default",
          highContrast: merged.highContrast,
          reduceMotion: merged.reduceMotion,
          audioGuidance: merged.audioGuidance,
          // Theme is no longer a separate choice; keep the stored value in step with High contrast.
          theme: merged.highContrast ? "high-contrast" : "soft-blue"
        });
        writeExtraLarge(userId, merged.textSize === "extra-large");
        return true;
      } catch (error) {
        setPreferences(previous);
        notify({
          title: "Setting not saved",
          description: error instanceof Error ? error.message : "The setting could not be saved.",
          tone: "error"
        });
        return false;
      }
    },
    [notify, userId]
  );

  const value = useMemo(() => ({ preferences, loaded, updatePreferences }), [loaded, preferences, updatePreferences]);

  return (
    <UserSettingsContext.Provider value={value}>
      {/* framer-motion ignores the CSS class, so the in-app Reduce motion switch is passed to it here. */}
      <MotionConfig reducedMotion={preferences.reduceMotion ? "always" : "user"}>{children}</MotionConfig>
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings() {
  const value = useContext(UserSettingsContext);
  if (!value) {
    throw new Error("useUserSettings must be used inside UserSettingsProvider");
  }
  return value;
}
