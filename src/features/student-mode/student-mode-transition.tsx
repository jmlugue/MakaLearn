"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export type StudentModeSwitch = "enter" | "exit";

const copy: Record<StudentModeSwitch, { title: string; line: string }> = {
  enter: { title: "Student mode", line: "Let's learn!" },
  exit: { title: "Teacher view", line: "Welcome back" }
};

// Small flat shapes in red, yellow, and blue that pop in around the logo.
const shapes = [
  { className: "left-[14%] top-[20%] h-10 w-10 rounded-full bg-brand-yellow", delay: 0.05 },
  { className: "right-[16%] top-[26%] h-8 w-8 rotate-12 rounded-lg bg-brand-red", delay: 0.12 },
  { className: "bottom-[22%] left-[22%] h-7 w-7 rotate-45 rounded-md bg-white/80", delay: 0.18 },
  { className: "bottom-[18%] right-[20%] h-12 w-12 rounded-full bg-brand-yellow/80", delay: 0.1 }
];

/** Full-screen card shown for about a second when Student mode is switched on or off, so the change is obvious. */
export function StudentModeTransition({ mode }: { mode: StudentModeSwitch | null }) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {mode ? (
        <motion.div
          key={mode}
          className="fixed inset-0 z-[300] grid place-items-center overflow-hidden bg-blue-600 px-6 text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.25 }}
          role="status"
          aria-live="assertive"
        >
          {!reduceMotion
            ? shapes.map((shape) => (
                <motion.span
                  key={shape.className}
                  className={`absolute ${shape.className}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 14, delay: shape.delay }}
                  aria-hidden="true"
                />
              ))
            : null}
          <div className="relative flex flex-col items-center">
            <motion.span
              className="grid h-28 w-28 place-items-center overflow-hidden rounded-[2rem] bg-[#fff] p-2 shadow-[0_24px_60px_rgba(15,23,42,0.28)]"
              initial={reduceMotion ? false : { scale: 0.6, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 16 }}
            >
              <Image src="/makalearn_logo_mark.png" alt="" width={160} height={160} className="h-full w-full object-contain" priority />
            </motion.span>
            <motion.p
              className="mt-6 text-4xl font-black tracking-[-0.03em] sm:text-5xl"
              initial={reduceMotion ? false : { y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {copy[mode].title}
            </motion.p>
            <motion.p
              className="mt-2 text-lg font-bold text-blue-100"
              initial={reduceMotion ? false : { y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {copy[mode].line}
            </motion.p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
