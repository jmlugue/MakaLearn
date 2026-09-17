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
  /** Shows the first-time tour, the page intros, and the hover explanations. */
  guideMode: boolean;
};

type UserSettingsContextValue = {
  preferences: Preferences;
  loaded: boolean;
  /** Saves one or more preferences. Resolves true when saved, false when it failed and was reverted. */
  updatePreferences: (next: Partial<Preferences>) => Promise<boolean>;
  /** Guide keys this user has already been shown ("welcome", "content", ...). */
  guideSeen: string[];
  /** Records that a guide key has been shown, so it does not come back. */
  markGuideSeen: (key: string) => Promise<void>;
  /** Clears every seen key, so the tour and the page intros play again. */
  resetGuide: () => Promise<boolean>;
};

const defaultPreferences: Preferences = {
  textSize: "default",
  highContrast: false,
  reduceMotion: false,
  audioGuidance: true,
  guideMode: true
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

// The seen list is also mirrored per browser. A database that has not had the Guide mode migration run
// yet cannot store it, and without this mirror the tour would reappear on every load.
const GUIDE_SEEN_KEY = "makalearn.guide-seen";

function readGuideSeen(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(`${GUIDE_SEEN_KEY}.${userId}`);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : [];
  } catch {
    return [];
  }
}

function writeGuideSeen(userId: string, keys: string[]) {
  try {
    window.localStorage.setItem(`${GUIDE_SEEN_KEY}.${userId}`, JSON.stringify(keys));
  } catch {
    // Without storage the guide simply shows again on the next visit.
  }
}

/** Union of the stored and remote lists, so a key dismissed anywhere stays dismissed. */
function mergeSeen(remote: string[], local: string[]) {
  return Array.from(new Set([...remote, ...local]));
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

/** Loads the signed-in user's accessibility preferences once and applies them on every page. */
export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthState();
  const { notify } = useToast();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [guideSeen, setGuideSeen] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const preferencesRef = useRef(preferences);
  const guideSeenRef = useRef<string[]>([]);
  const userId = user?.id ?? null;

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    guideSeenRef.current = guideSeen;
  }, [guideSeen]);

  useEffect(() => {
    let active = true;
    setLoaded(false);

    if (!userId) {
      setPreferences(defaultPreferences);
      setGuideSeen([]);
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
            audioGuidance: settings.audioGuidance,
            guideMode: settings.guideMode
          });
          setGuideSeen(mergeSeen(settings.guideSeen, readGuideSeen(userId)));
        } else {
          setGuideSeen(readGuideSeen(userId));
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
          guideMode: merged.guideMode,
          guideSeen: guideSeenRef.current,
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

  /** Writes the seen list without touching preferences, and keeps the current ones intact. */
  const saveGuideSeen = useCallback(
    async (nextSeen: string[]) => {
      if (!userId) return false;
      setGuideSeen(nextSeen);
      guideSeenRef.current = nextSeen;
      writeGuideSeen(userId, nextSeen);
      const current = preferencesRef.current;

      try {
        await upsertUserSettings({
          userId,
          largeText: current.textSize !== "default",
          highContrast: current.highContrast,
          reduceMotion: current.reduceMotion,
          audioGuidance: current.audioGuidance,
          guideMode: current.guideMode,
          guideSeen: nextSeen,
          theme: current.highContrast ? "high-contrast" : "soft-blue"
        });
        return true;
      } catch {
        // The browser copy above already holds the change, so the guide stays dismissed either way.
        // Reverting here would re-open the tour immediately, so it deliberately does not.
        return false;
      }
    },
    [userId]
  );

  const markGuideSeen = useCallback(
    async (key: string) => {
      if (guideSeenRef.current.includes(key)) return;
      await saveGuideSeen([...guideSeenRef.current, key]);
    },
    [saveGuideSeen]
  );

  const resetGuide = useCallback(() => saveGuideSeen([]), [saveGuideSeen]);

  const value = useMemo(
    () => ({ preferences, loaded, updatePreferences, guideSeen, markGuideSeen, resetGuide }),
    [guideSeen, loaded, markGuideSeen, preferences, resetGuide, updatePreferences]
  );

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
