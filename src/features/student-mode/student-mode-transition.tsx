"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export type StudentModeSwitch = "enter" | "exit";

const copy: Record<StudentModeSwitch, { title: string; line: string }> = {
  enter: { title: "Student mode", line: "Let's learn!" },
  exit: { title: "Teacher view", line: "Welcome back" }
};

// Student mode is playful: bright red, yellow, green, and sky shapes pop in, with a four-color band at the
// bottom. Teacher view stays calm: plain blue with a few faint white shapes.
const shapes: Record<StudentModeSwitch, Array<{ className: string; delay: number }>> = {
  enter: [
    { className: "left-[10%] top-[14%] h-16 w-16 rounded-full bg-yellow-400", delay: 0.05 },
    { className: "right-[12%] top-[18%] h-12 w-12 rotate-12 rounded-xl bg-red-500", delay: 0.12 },
    { className: "left-[20%] bottom-[24%] h-10 w-10 rotate-45 rounded-lg bg-emerald-400", delay: 0.18 },
    { className: "right-[18%] bottom-[22%] h-20 w-20 rounded-full bg-sky-300", delay: 0.1 },
    { className: "left-[42%] top-[8%] h-6 w-6 rounded-full bg-emerald-300", delay: 0.22 },
    { className: "right-[36%] bottom-[12%] h-8 w-8 rotate-12 rounded-md bg-yellow-400/90", delay: 0.26 },
    { className: "left-[6%] top-[52%] h-8 w-8 rounded-full bg-red-500/90", delay: 0.3 },
    { className: "right-[6%] top-[50%] h-7 w-7 rotate-45 rounded-md bg-white/85", delay: 0.2 }
  ],
  exit: [
    { className: "left-[14%] top-[20%] h-10 w-10 rounded-full bg-white/20", delay: 0.05 },
    { className: "right-[16%] top-[26%] h-8 w-8 rotate-12 rounded-lg bg-white/15", delay: 0.12 },
    { className: "bottom-[20%] right-[20%] h-12 w-12 rounded-full bg-white/20", delay: 0.1 }
  ]
};

const bandColors = ["bg-red-500", "bg-yellow-400", "bg-emerald-400", "bg-sky-300"];

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
          {mode === "enter" ? (
            <div className="absolute inset-x-0 bottom-0 flex h-3" aria-hidden="true">
              {bandColors.map((color) => (
                <span key={color} className={`h-full flex-1 ${color}`} />
              ))}
            </div>
          ) : null}
          {!reduceMotion
            ? shapes[mode].map((shape) => (
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
