"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { GuideStepsDialog } from "@/features/guide/guide-steps-dialog";
import { pageGuideFor } from "@/features/guide/guide-content";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { useUserSettings } from "@/features/settings/user-settings-context";

/**
 * The one-line intro shown the first time a page is opened with Guide mode on. "Show me" opens the same
 * stepped pop-up as the welcome tour, scoped to this page. Dismissing or finishing retires it for good.
 */
export function GuideBanner({ pageKey }: { pageKey: string }) {
  const { preferences, loaded, guideSeen, markGuideSeen } = useUserSettings();
  const { user } = useAuthUser();
  const reduceMotion = useReducedMotion();
  const [stepsOpen, setStepsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Replay in Settings empties the list, which also clears this page's local dismissal.
  useEffect(() => {
    if (guideSeen.length === 0) setDismissed(false);
  }, [guideSeen]);

  const guide = pageGuideFor(pageKey, user.role);
  const show = loaded && preferences.guideMode && Boolean(guide) && !guideSeen.includes(pageKey) && !dismissed;

  function retire() {
    setDismissed(true);
    setStepsOpen(false);
    markGuideSeen(pageKey).catch(() => undefined);
  }

  if (!guide) return null;

  return (
    <>
      {show ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.25 }}
          className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/90 bg-gradient-to-br from-white/95 via-blue-50/85 to-sky-50/80 p-3 shadow-[0_10px_28px_rgba(30,64,175,0.12)] backdrop-blur-xl"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
            <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium leading-6 text-slate-700">{guide.line}</p>
          <button
            type="button"
            onClick={() => setStepsOpen(true)}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            Show me
          </button>
          <button
            type="button"
            onClick={retire}
            aria-label="Hide this introduction"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-white/70 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
      ) : null}
      <GuideStepsDialog open={stepsOpen} title={guide.title} steps={guide.steps} onClose={retire} />
    </>
  );
}
