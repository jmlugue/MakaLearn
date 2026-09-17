"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { GuideScene } from "@/features/guide/guide-scene";
import type { GuideStep } from "@/features/guide/guide-content";

/**
 * The stepped pop-up behind both the welcome tour and a page's "Show me". One animated scene, a short
 * title, and one line per step.
 */
export function GuideStepsDialog({
  open,
  title,
  steps,
  finishLabel = "Got it",
  onClose
}: {
  open: boolean;
  title: string;
  steps: GuideStep[];
  finishLabel?: string;
  /** Called on Skip, on Finish, and on dismiss. All three mean "do not show this again". */
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  if (!step) return null;

  const Icon = step.icon;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-lg"
      hideHeader
      footer={
        <>
          {!last ? (
            <Button type="button" variant="ghost" className="mr-auto" onClick={onClose}>
              Skip
            </Button>
          ) : null}
          {index > 0 ? (
            <Button type="button" variant="outline" onClick={() => setIndex(index - 1)}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          ) : null}
          {last ? (
            <Button type="button" onClick={onClose}>
              <Check className="h-4 w-4" aria-hidden="true" />
              {finishLabel}
            </Button>
          ) : (
            <Button type="button" onClick={() => setIndex(index + 1)}>
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </>
      }
    >
      <div className="pr-10">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-blue-700/70">{title}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={reduceMotion ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.22 }}
          >
            <div className="mt-2 flex items-center gap-2.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-ink">{step.title}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
            <div className="mt-4">
              <GuideScene scene={step.scene} />
            </div>
          </motion.div>
        </AnimatePresence>

        {steps.length > 1 ? (
          <div className="mt-4 flex items-center justify-center gap-1.5" aria-label={`Step ${index + 1} of ${steps.length}`}>
            {steps.map((candidate, position) => (
              <button
                key={candidate.title}
                type="button"
                aria-label={`Go to ${candidate.title}`}
                aria-current={position === index}
                onClick={() => setIndex(position)}
                className={cn(
                  "h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                  position === index ? "w-6 bg-blue-600" : "w-2 bg-blue-200 hover:bg-blue-300"
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
