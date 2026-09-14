"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type KidPose = "hello" | "help" | "yes" | "eat";
type KidTone = "blue" | "teal" | "amber" | "coral";

// `badge` is a faint wash painted on the circle behind each kid, not on the figure.
const tones: Record<KidTone, { fill: string; stroke: string; chip: string; badge: string }> = {
  blue: { fill: "#dbeafe", stroke: "#1d4ed8", chip: "bg-blue-50 text-blue-700", badge: "rgba(59,130,246,0.14)" },
  teal: { fill: "#ccfbf1", stroke: "#0f766e", chip: "bg-teal-50 text-accent-teal", badge: "rgba(20,184,166,0.14)" },
  amber: { fill: "#fef3c7", stroke: "#b45309", chip: "bg-amber-50 text-accent-amber", badge: "rgba(245,158,11,0.14)" },
  coral: { fill: "#ffe4e6", stroke: "#be123c", chip: "bg-rose-50 text-accent-coral", badge: "rgba(244,63,94,0.12)" }
};

/**
 * Hands are drawn with separated fingers rather than as plain circles, because at
 * this size a circle reads as a ball and the gesture becomes unreadable.
 */
function OpenHand({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d="M -6 3 Q -6 -5 -1 -5 L 5 -5 Q 9 -5 9 0 L 9 5 Q 9 9 3 9 L -1 9 Q -6 9 -6 3 Z" />
      <path d="M -3 -5 L -4 -13" />
      <path d="M 1 -5 L 1 -14" />
      <path d="M 5 -5 L 6 -13" />
      <path d="M 9 0 L 15 -4" />
    </g>
  );
}

function FlatHand({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d="M -11 -3 L 8 -3 Q 12 -3 12 1 Q 12 5 8 5 L -11 5 Q -14 5 -14 1 Q -14 -3 -11 -3 Z" />
      <path d="M -4 -3 L -4 5" />
      <path d="M 2 -3 L 2 5" />
    </g>
  );
}

function Fist({ x, y, rotate = 0 }: { x: number; y: number; rotate?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <path d="M -7 -6 L 5 -6 Q 9 -6 9 -1 L 9 3 Q 9 8 4 8 L -6 8 Q -10 8 -10 3 L -10 -2 Q -10 -6 -7 -6 Z" />
      <path d="M -4 -6 L -4 1" />
      <path d="M 1 -6 L 1 1" />
    </g>
  );
}

function Pose({ pose }: { pose: KidPose }) {
  switch (pose) {
    // Open hand raised beside the head, with a wave arc.
    case "hello":
      return (
        <>
          <path d="M 34 96 L 28 68 L 32 50" />
          <OpenHand x={33} y={44} rotate={-8} />
          <path d="M 88 94 L 95 112" />
          <path d="M 48 34 A 18 18 0 0 1 56 22" strokeWidth={4} opacity={0.7} />
        </>
      );
    // Closed hand resting on a flat palm, lifting upward.
    case "help":
      return (
        <>
          <path d="M 30 98 L 50 96" />
          <FlatHand x={64} y={96} />
          <path d="M 94 98 L 76 84" />
          <Fist x={66} y={80} rotate={-10} />
          <path d="M 88 70 L 88 50 M 82 57 L 88 49 L 94 57" strokeWidth={4} opacity={0.7} />
        </>
      );
    // Closed hand nodding forward from the wrist.
    case "yes":
      return (
        <>
          <path d="M 38 96 L 44 72" />
          <Fist x={45} y={62} rotate={6} />
          <path d="M 88 94 L 94 110" />
          <path d="M 30 58 A 16 16 0 0 1 36 46" strokeWidth={4} opacity={0.7} />
        </>
      );
    // Fingers brought together toward the mouth.
    case "eat":
      return (
        <>
          <path d="M 36 98 L 48 72" />
          <OpenHand x={53} y={60} rotate={38} />
          <path d="M 90 96 L 96 112" />
          <path d="M 66 48 A 15 15 0 0 0 58 40" strokeWidth={4} opacity={0.7} />
        </>
      );
  }
}

export function SigningKid({
  pose = "hello",
  tone = "blue",
  className
}: {
  pose?: KidPose;
  tone?: KidTone;
  className?: string;
}) {
  const { fill, stroke } = tones[tone];

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("h-full w-full", className)}
      fill={fill}
      stroke={stroke}
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M 18 116 C 20 82 36 62 60 62 C 84 62 100 82 102 116" />
      <circle cx="60" cy="34" r="18" />
      <path d="M 60 52 L 60 62" />
      <Pose pose={pose} />
    </svg>
  );
}

const floatingKids: {
  pose: KidPose;
  tone: KidTone;
  label: string;
  position: string;
  size: string;
  delay: number;
}[] = [
  { pose: "hello", tone: "blue", label: "hello", position: "-left-10 top-0", size: "h-32 w-32", delay: 0 },
  { pose: "help", tone: "teal", label: "help", position: "-right-11 top-20", size: "h-36 w-36", delay: 0.9 },
  { pose: "eat", tone: "amber", label: "eat", position: "-left-12 bottom-12", size: "h-32 w-32", delay: 1.6 },
  { pose: "yes", tone: "coral", label: "yes", position: "-right-8 -bottom-6", size: "h-32 w-32", delay: 2.3 }
];

/**
 * Signing children placed around the hero carousel. The word chip is what makes the
 * gesture readable: the drawing alone cannot carry the meaning at this size.
 */
export function SigningKids({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-20 hidden md:block", className)} aria-hidden="true">
      {floatingKids.map((kid) => (
        <motion.div
          key={kid.pose}
          className={cn("absolute", kid.position)}
          animate={reduceMotion ? undefined : { y: [0, -10, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: kid.delay }}
        >
          <div
            className={cn(
              "grid place-items-center rounded-full border border-white/85 bg-white/80 p-3.5 shadow-[0_16px_40px_rgba(30,64,175,0.16)] backdrop-blur-xl",
              kid.size
            )}
            style={{ backgroundImage: `radial-gradient(circle at 50% 100%, ${tones[kid.tone].badge}, transparent 70%)` }}
          >
            <SigningKid pose={kid.pose} tone={kid.tone} />
          </div>
          <span
            className={cn(
              "absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.08em] shadow-sm ring-1 ring-white/90",
              tones[kid.tone].chip
            )}
          >
            {kid.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
