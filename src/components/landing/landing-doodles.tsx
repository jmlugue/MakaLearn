"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Hand-drawn accent used under the hero tagline. Decorative: aria-hidden, and it
 * inherits `currentColor` so the caller sets the tone with a text-* class.
 */
export function UnderlineDoodle({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      viewBox="0 0 300 14"
      preserveAspectRatio="none"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <motion.path
        d="M 4 9 C 70 2 170 2 296 7"
        initial={reduceMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}
