"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MotionConfig } from "framer-motion";
import { useToast } from "@/components/common/toast-provider";
import { useAuthState } from "@/features/auth/use-auth-user";
import { fetchUserSettings, patchUserPreferences } from "@/lib/supabase/app-data";

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
  /** Clears every seen key, so the tour and the page intros play again. Hidden activities stay hidden. */
  resetGuide: () => Promise<boolean>;
  /** Activities this teacher hid from Student mode (the eye icon on an activity card). */
  hiddenActivityIds: string[];
  setActivityHidden: (activityId: string, hidden: boolean) => Promise<void>;
};

/**
 * Hidden-from-Student-mode activities are saved in the same per-account list as the Guide mode keys
 * (`user_settings.guide_seen`), as "hide-activity:<id>". That list already exists on the live database, so the eye
 * icon needs no database change (owner's choice, Sep 30). It is per teacher: each teacher decides what their own
 * Student mode shows. Replaying the tour keeps these entries.
 */
const HIDDEN_ACTIVITY_PREFIX = "hide-activity:";

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
  return Array.from(new Set([...remote, ...local.filter((key) => !key.startsWith(HIDDEN_ACTIVITY_PREFIX))]));
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

// Load account preferences and apply text size, contrast, and motion settings across pages.
export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthState();
  const { notify } = useToast();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [guideSeen, setGuideSeen] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const preferencesRef = useRef(preferences);
  const guideSeenRef = useRef<string[]>([]);
  const userId = user?.id ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const preferenceRevision = useRef(0);
  const preferenceRevisions = useRef(new Map<string, number>());
  const savedPreferencesRef = useRef({ ...preferences });
  const savedHiddenRef = useRef(new Set<string>());
  const visibilityRevisions = useRef(new Map<string, number>());

  // Queue local writes. The database also applies partial patches under a row lock across devices.
  const persistPatch = useCallback((accountId: string, patch: Record<string, boolean | string>) => {
    const operation = saveQueue.current.catch(() => undefined).then(() => {
      if (userIdRef.current !== accountId) throw new Error("Account changed.");
      return patchUserPreferences(patch);
    });
    saveQueue.current = operation;
    return operation;
  }, []);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    guideSeenRef.current = guideSeen;
  }, [guideSeen]);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    preferenceRevisions.current.clear();
    preferencesRef.current = { ...defaultPreferences };
    guideSeenRef.current = [];
    setPreferences({ ...defaultPreferences });
    setGuideSeen([]);
    savedPreferencesRef.current = { ...defaultPreferences };
    savedHiddenRef.current = new Set();

    if (!userId) {
      setPreferences(defaultPreferences);
      setGuideSeen([]);
      return undefined;
    }

    fetchUserSettings(userId)
      .then((settings) => {
        if (!active) return;
        if (settings) {
          const savedPreferences: Preferences = {
            textSize: settings.largeText ? (readExtraLarge(userId) ? "extra-large" : "large") : "default",
            highContrast: settings.highContrast || settings.theme === "high-contrast",
            reduceMotion: settings.reduceMotion,
            audioGuidance: settings.audioGuidance,
            guideMode: settings.guideMode
          };
          preferencesRef.current = savedPreferences;
          savedPreferencesRef.current = { ...savedPreferences };
          savedHiddenRef.current = new Set(settings.guideSeen.filter((key) => key.startsWith(HIDDEN_ACTIVITY_PREFIX)));
          setPreferences(savedPreferences);
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
      const merged = { ...preferencesRef.current, ...next };
      const revision = ++preferenceRevision.current;
      Object.keys(next).forEach((key) => preferenceRevisions.current.set(key, revision));
      preferencesRef.current = merged;
      setPreferences(merged);
      const fields = { textSize: "large_text", highContrast: "high_contrast", reduceMotion: "reduce_motion", audioGuidance: "audio_guidance", guideMode: "guide_mode" } as const;
      const patch = Object.fromEntries(Object.entries(next).map(([key, value]) => [fields[key as keyof Preferences], key === "textSize" ? value !== "default" : value])) as Record<string, boolean>;
      try {
        await persistPatch(userId, patch);
        if (userIdRef.current !== userId) return false;
        Object.assign(savedPreferencesRef.current, next);
        if (next.textSize !== undefined) writeExtraLarge(userId, next.textSize === "extra-large");
        return true;
      } catch {
        if (userIdRef.current !== userId) return false;
        // Roll back only the failed fields whose values have not been changed again.
        const restored = { ...preferencesRef.current };
        for (const key of Object.keys(next) as Array<keyof Preferences>) {
          if (preferenceRevisions.current.get(key) === revision) Object.assign(restored, { [key]: savedPreferencesRef.current[key] });
        }
        preferencesRef.current = restored;
        setPreferences(restored);
        notify({ title: "Setting not saved", description: "Please try that change again.", tone: "error" });
        return false;
      }
    }, [notify, persistPatch, userId]
  );

  const applySeen = useCallback((accountId: string, keys: string[]) => {
    guideSeenRef.current = keys;
    setGuideSeen(keys);
    writeGuideSeen(accountId, keys);
  }, []);

  const markGuideSeen = useCallback(async (key: string) => {
    if (!userId || guideSeenRef.current.includes(key)) return;
    applySeen(userId, [...guideSeenRef.current, key]);
    // A dismissal remains local on failure, so the welcome tour never immediately reopens.
    await persistPatch(userId, { guide_key: key, guide_seen: true }).catch(() => undefined);
  }, [applySeen, persistPatch, userId]);

  const resetGuide = useCallback(async () => {
    if (!userId) return false;
    try {
      await persistPatch(userId, { guide_reset: true });
      if (userIdRef.current !== userId) return false;
      applySeen(userId, guideSeenRef.current.filter((key) => key.startsWith(HIDDEN_ACTIVITY_PREFIX)));
      return true;
    } catch {
      if (userIdRef.current === userId) notify({ title: "Tour not reset", description: "Please try again.", tone: "error" });
      return false;
    }
  }, [applySeen, notify, persistPatch, userId]);

  const hiddenActivityIds = useMemo(
    () => guideSeen.filter((key) => key.startsWith(HIDDEN_ACTIVITY_PREFIX)).map((key) => key.slice(HIDDEN_ACTIVITY_PREFIX.length)), [guideSeen]
  );

  const setActivityHidden = useCallback(async (activityId: string, hidden: boolean) => {
    if (!userId) return;
    const key = `${HIDDEN_ACTIVITY_PREFIX}${activityId}`;
    const revision = (visibilityRevisions.current.get(key) ?? 0) + 1;
    visibilityRevisions.current.set(key, revision);
    const setHidden = (value: boolean) => {
      const others = guideSeenRef.current.filter((entry) => entry !== key);
      applySeen(userId, value ? [...others, key] : others);
    };
    setHidden(hidden);
    try {
      await persistPatch(userId, { guide_key: key, guide_seen: hidden });
      if (userIdRef.current === userId) {
        if (hidden) savedHiddenRef.current.add(key);
        else savedHiddenRef.current.delete(key);
      }
    } catch {
      if (userIdRef.current !== userId) return;
      if (visibilityRevisions.current.get(key) === revision) setHidden(savedHiddenRef.current.has(key));
      notify({ title: "Visibility not saved", description: "Please try changing it again.", tone: "error" });
    }
  }, [applySeen, notify, persistPatch, userId]);

  const value = useMemo(
    () => ({ preferences, loaded, updatePreferences, guideSeen, markGuideSeen, resetGuide, hiddenActivityIds, setActivityHidden }),
    [guideSeen, hiddenActivityIds, loaded, markGuideSeen, preferences, resetGuide, setActivityHidden, updatePreferences]
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
