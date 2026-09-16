"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Hand, Image as ImageIcon, Play, Pointer, Shield, UserRound, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuideScene as SceneName } from "@/features/guide/guide-content";

/**
 * The small looping animations inside a guide step. They show the action instead of describing it, so
 * each step can stay one line. With reduced motion on, every scene renders in its finished state.
 */
export function GuideScene({ scene }: { scene: SceneName }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="grid h-36 w-full place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-100/70 via-blue-50/80 to-sky-50/90 p-4 ring-1 ring-blue-100">
      {scene === "cards" ? <CardsScene still={Boolean(reduceMotion)} /> : null}
      {scene === "lesson" ? <LessonScene still={Boolean(reduceMotion)} /> : null}
      {scene === "activity" ? <ActivityScene still={Boolean(reduceMotion)} /> : null}
      {scene === "student" ? <StudentScene still={Boolean(reduceMotion)} /> : null}
      {scene === "admin" ? <AdminScene still={Boolean(reduceMotion)} /> : null}
      {scene === "media" ? <MediaScene still={Boolean(reduceMotion)} /> : null}
      {scene === "category" ? <CategoryScene still={Boolean(reduceMotion)} /> : null}
      {scene === "gesture" ? <GestureScene still={Boolean(reduceMotion)} /> : null}
    </div>
  );
}

const loop = { repeat: Infinity, repeatDelay: 0.8, duration: 0.5 };
const tile = "grid h-14 w-14 place-items-center rounded-xl border border-blue-100 bg-[#fff] shadow-sm";

/** Three cards land one after another, and the last one speaks. */
function CardsScene({ still }: { still: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className={tile}
          initial={still ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={still ? { duration: 0 } : { ...loop, delay: index * 0.18, repeatDelay: 1.4 }}
        >
          <ImageIcon className="h-6 w-6 text-indigo-400" aria-hidden="true" />
        </motion.span>
      ))}
      <motion.span
        className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-white shadow-sm"
        initial={still ? false : { scale: 0.85 }}
        animate={{ scale: still ? 1 : [0.85, 1.1, 0.85] }}
        transition={still ? { duration: 0 } : { repeat: Infinity, duration: 1.6 }}
      >
        <Volume2 className="h-4 w-4" aria-hidden="true" />
      </motion.span>
    </div>
  );
}

/** Cards slide into a lesson box. */
function LessonScene({ still }: { still: boolean }) {
  return (
    <div className="flex w-full items-center justify-center gap-4">
      <div className="flex gap-2">
        {[0, 1].map((index) => (
          <motion.span
            key={index}
            className="grid h-11 w-11 place-items-center rounded-lg border border-blue-100 bg-[#fff] shadow-sm"
            initial={still ? false : { x: -14, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={still ? { duration: 0 } : { ...loop, delay: index * 0.2, repeatDelay: 1.6 }}
          >
            <ImageIcon className="h-5 w-5 text-indigo-400" aria-hidden="true" />
          </motion.span>
        ))}
      </div>
      <motion.div
        className="rounded-2xl border-2 border-dashed border-blue-300 bg-white/70 px-4 py-3 text-center"
        animate={still ? {} : { borderColor: ["#93c5fd", "#2563eb", "#93c5fd"] }}
        transition={still ? { duration: 0 } : { repeat: Infinity, duration: 2.4 }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Lesson</p>
        <p className="mt-1 text-sm font-semibold text-ink">Snack time</p>
      </motion.div>
    </div>
  );
}

/** A cursor taps the right card and it turns green. */
function ActivityScene({ still }: { still: boolean }) {
  return (
    <div className="relative">
      <p className="text-center text-sm font-black text-ink">Eat</p>
      <div className="mt-2 flex gap-2">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className={cn(tile, "border-2")}
            animate={
              still
                ? index === 1
                  ? { borderColor: "#34d399", backgroundColor: "#ecfdf5" }
                  : {}
                : index === 1
                  ? { borderColor: ["#dbeafe", "#dbeafe", "#34d399", "#34d399", "#dbeafe"], backgroundColor: ["#ffffff", "#ffffff", "#ecfdf5", "#ecfdf5", "#ffffff"] }
                  : {}
            }
            transition={still ? { duration: 0 } : { repeat: Infinity, duration: 3, times: [0, 0.4, 0.5, 0.85, 1] }}
          >
            {index === 1 ? (
              <motion.span
                animate={still ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }}
                transition={still ? { duration: 0 } : { repeat: Infinity, duration: 3, times: [0, 0.4, 0.5, 0.85, 1] }}
              >
                <Check className="h-6 w-6 text-emerald-500" aria-hidden="true" />
              </motion.span>
            ) : (
              <ImageIcon className="h-6 w-6 text-indigo-300" aria-hidden="true" />
            )}
          </motion.span>
        ))}
      </div>
      {still ? null : (
        <motion.span
          className="pointer-events-none absolute left-0 top-0 text-blue-700 drop-shadow"
          animate={{ x: [92, 92, 70, 70, 92], y: [76, 76, 44, 44, 76] }}
          transition={{ repeat: Infinity, duration: 3, times: [0, 0.25, 0.45, 0.85, 1], ease: "easeInOut" }}
          aria-hidden="true"
        >
          <Pointer className="h-6 w-6 fill-white" />
        </motion.span>
      )}
    </div>
  );
}

/** The teacher view shrinking into the big, simple layout a learner gets. */
function StudentScene({ still }: { still: boolean }) {
  return (
    <motion.div
      className="rounded-2xl border-2 border-blue-300 bg-[#fff] p-3 shadow-sm"
      animate={still ? {} : { scale: [1, 1.05, 1] }}
      transition={still ? { duration: 0 } : { repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
    >
      <div className="flex gap-2">
        {[0, 1].map((index) => (
          <motion.span
            key={index}
            className="grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 ring-2 ring-blue-100"
            animate={still ? {} : { backgroundColor: index === 0 ? ["#eff6ff", "#dbeafe", "#eff6ff"] : ["#eff6ff", "#eff6ff", "#eff6ff"] }}
            transition={still ? { duration: 0 } : { repeat: Infinity, duration: 2.6 }}
          >
            <ImageIcon className="h-7 w-7 text-indigo-400" aria-hidden="true" />
          </motion.span>
        ))}
      </div>
      <p className="mt-2 text-center text-xs font-bold uppercase tracking-wide text-blue-700">Student mode</p>
    </motion.div>
  );
}

/** Account rows being checked off in the admin panel. */
function AdminScene({ still }: { still: boolean }) {
  return (
    <div className="w-full max-w-[15rem] overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] shadow-sm">
      <div className="flex items-center gap-2 border-b border-blue-50 bg-blue-50/70 px-3 py-2">
        <Shield className="h-4 w-4 text-blue-700" aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-wide text-blue-700">Accounts</span>
      </div>
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-2 px-3 py-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-blue-700">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="h-2 flex-1 rounded-full bg-blue-100" />
          <motion.span
            className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 text-emerald-600"
            initial={still ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={still ? { duration: 0 } : { duration: 0.3, delay: index * 0.25, repeat: Infinity, repeatDelay: 1.9 }}
          >
            <Check className="h-3 w-3" aria-hidden="true" />
          </motion.span>
        </div>
      ))}
    </div>
  );
}

/** A grid of files filling in. */
function MediaScene({ still }: { still: boolean }) {
  const icons = [ImageIcon, Play, Volume2, ImageIcon, Play, ImageIcon];
  return (
    <div className="grid grid-cols-3 gap-2">
      {icons.map((Icon, index) => (
        <motion.span
          key={index}
          className="grid h-11 w-11 place-items-center rounded-lg border border-blue-100 bg-[#fff] shadow-sm"
          initial={still ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={still ? { duration: 0 } : { duration: 0.35, delay: index * 0.1, repeat: Infinity, repeatDelay: 1.8 }}
        >
          <Icon className="h-5 w-5 text-blue-400" aria-hidden="true" />
        </motion.span>
      ))}
    </div>
  );
}

/** Coloured category folders. */
function CategoryScene({ still }: { still: boolean }) {
  const colors = ["#dbeafe", "#fef3c7", "#d1fae5", "#ede9fe"];
  return (
    <div className="flex items-end gap-3">
      {colors.map((color, index) => (
        <motion.span
          key={color}
          className="grid h-16 w-14 place-items-end rounded-xl p-2 shadow-sm"
          style={{ backgroundColor: color }}
          initial={still ? false : { y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={still ? { duration: 0 } : { duration: 0.4, delay: index * 0.12, repeat: Infinity, repeatDelay: 1.8 }}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white/80" />
        </motion.span>
      ))}
    </div>
  );
}

/** A hand signing inside a camera frame. */
function GestureScene({ still }: { still: boolean }) {
  return (
    <div className="grid h-24 w-40 place-items-center rounded-2xl border-2 border-dashed border-sky-300 bg-white/70">
      <motion.span
        className="text-sky-600"
        animate={still ? {} : { rotate: [-12, 12, -12] }}
        transition={still ? { duration: 0 } : { repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
      >
        <Hand className="h-10 w-10" aria-hidden="true" />
      </motion.span>
    </div>
  );
}
