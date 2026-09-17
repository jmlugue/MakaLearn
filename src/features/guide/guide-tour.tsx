"use client";

import { useEffect, useRef, useState } from "react";
import { GuideStepsDialog } from "@/features/guide/guide-steps-dialog";
import { welcomeStepsFor } from "@/features/guide/guide-content";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useUserSettings } from "@/features/settings/user-settings-context";

const WELCOME_KEY = "welcome";

/**
 * The one-time welcome tour. Mounted once in the app shell, so signing in shows it exactly once rather
 * than once per page.
 */
export function GuideTour() {
  const { user } = useAuthUser();
  const { preferences, loaded, guideSeen, markGuideSeen } = useUserSettings();
  const [open, setOpen] = useState(false);
  // Closing is final for this session, whatever the saved list later says. Without this, a save that
  // cannot reach the database would let the effect below re-open the tour on the next render.
  const dismissedRef = useRef(false);

  useEffect(() => {
    // Replay in Settings empties the list, which also lifts the session guard so the tour can return.
    if (guideSeen.length === 0) dismissedRef.current = false;
    if (dismissedRef.current) return;
    if (loaded && preferences.guideMode && !guideSeen.includes(WELCOME_KEY)) setOpen(true);
  }, [guideSeen, loaded, preferences.guideMode]);

  function close() {
    dismissedRef.current = true;
    setOpen(false);
    markGuideSeen(WELCOME_KEY).catch(() => undefined);
  }

  // Admins do a teacher's job too, so their tour is the teacher one plus the admin steps.
  const steps = welcomeStepsFor(user.role);

  return <GuideStepsDialog open={open} title="Welcome to MakaLearn" steps={steps} finishLabel="Start using MakaLearn" onClose={close} />;
}
