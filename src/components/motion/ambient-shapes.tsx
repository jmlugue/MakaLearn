"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AmbientShapes({ light = false }: { light?: boolean }) {
  const reduceMotion = useReducedMotion();
  const animation = reduceMotion
    ? undefined
    : {
        y: [0, -18, 0],
        rotate: [0, 8, 0],
        scale: [1, 1.04, 1]
      };

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <motion.span
        className={`absolute -right-12 top-16 h-44 w-44 rounded-[3.5rem] border ${light ? "border-white/20 bg-white/10" : "border-blue-200/50 bg-blue-300/20"} backdrop-blur-sm`}
        animate={animation}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{ transform: "rotate(18deg)" }}
      />
      <motion.span
        className={`absolute -bottom-20 left-8 h-52 w-52 rounded-full border-[2rem] ${light ? "border-cyan-200/10" : "border-indigo-200/25"}`}
        animate={reduceMotion ? undefined : { y: [0, 14, 0], x: [0, 10, 0], rotate: [0, -6, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />
      <motion.span
        className={`absolute left-[54%] top-[19%] h-16 w-16 rounded-2xl ${light ? "bg-white/10" : "bg-cyan-200/20"} backdrop-blur-md`}
        animate={reduceMotion ? undefined : { y: [0, -12, 0], rotate: [8, -8, 8] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
      />
    </div>
  );
}
