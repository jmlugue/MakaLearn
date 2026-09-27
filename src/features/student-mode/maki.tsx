"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Maki, MakaLearn's mascot: a speech bubble with a face, a chibi hand on the left, and the right hand signing
 * "I love you" (index and pinky up, middle and ring folded, thumb out). Drawn in code from the owner's design
 * so each part can move. Student mode only.
 *
 * - happy: idle and intro cards. Gentle bob, closed happy eyes.
 * - cheer: right answers and score pop-ups. Open smile, sparkles, a jump, hand up.
 * - encourage: wrong answers and Try again. Blushing proud: eyes closed, a big blush, a soft smile, the hand raised,
 *   and a "You can do it!" speech bubble at the upper right (owner's choice). Never sad.
 * - thinking: waiting. Eyes up, one brow raised, thought bubbles with a question mark.
 * - wave: hello. Body sways, the signing hand waves with motion lines.
 *
 * With reduced motion Maki holds the pose without moving.
 */
export type MakiMood = "happy" | "cheer" | "encourage" | "thinking" | "wave";

const ink = "#1f4f8f";
const fill = "#eef3fb";
const shade = "#b6d0ec";
const cheek = "#a9cdee";

const loop = { repeat: Infinity, ease: "easeInOut" } as const;

export function Maki({
  mood = "happy",
  size = 120,
  className,
  label = "Maki",
  message = "You can do it!"
}: {
  mood?: MakiMood;
  /** The speech bubble text shown with the encourage mood. */
  message?: string;
  /** Width in pixels. */
  size?: number;
  className?: string;
  label?: string;
}) {
  const still = Boolean(useReducedMotion());

  const body = still
    ? undefined
    : mood === "cheer"
      ? { y: [0, -16, 0, -8, 0] }
      : mood === "encourage"
        ? { y: [0, -5, 0], rotate: [0, -2, 0] }
        : mood === "wave"
          ? { rotate: [-4, 4, -4] }
          : mood === "thinking"
            ? { rotate: [3, 5, 3] }
            : { y: [0, -4, 0] };

  return (
    <svg
      viewBox="0 0 240 200"
      width={size}
      height={(size * 200) / 240}
      role="img"
      aria-label={label}
      className={className}
      style={{ overflow: "visible" }}
    >
      <motion.g
        key={mood}
        initial={false}
        animate={body}
        transition={
          mood === "cheer"
            ? { duration: 0.9, times: [0, 0.3, 0.55, 0.75, 1], repeat: Infinity, repeatDelay: 0.6 }
            : { duration: mood === "wave" ? 1.6 : mood === "encourage" ? 2 : 2.6, ...loop }
        }
        style={{ originX: 0.5, originY: 0.9 }}
      >
        <LeftHand mood={mood} still={still} />
        <Bubble />
        <Face mood={mood} still={still} />
        <RightHand mood={mood} still={still} />
        {mood === "cheer" ? <Sparkles still={still} /> : null}
        {mood === "encourage" ? <SpeechBubble text={message} still={still} /> : null}
        {mood === "thinking" ? <ThoughtBubbles still={still} /> : null}
      </motion.g>
    </svg>
  );
}

/** Outline first, then the fill on top, so overlapping shapes merge into one clean outline. */
function Bubble() {
  const tail = "M 80 136 L 74 180 L 114 148 Z";
  return (
    <g>
      <g stroke={ink} strokeWidth={9} strokeLinejoin="round" fill={ink}>
        <ellipse cx={118} cy={92} rx={80} ry={66} />
        <path d={tail} />
      </g>
      <path d={tail} fill={shade} />
      <ellipse cx={118} cy={92} rx={80} ry={66} fill={shade} />
      <path d="M 83 138 L 79 170 L 108 148 Z" fill={fill} />
      <ellipse cx={118} cy={87} rx={78} ry={61} fill={fill} />
      {/* Shine */}
      <path d="M 56 74 Q 62 44 98 32" stroke="#fff" strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.95} />
      <rect x={110} y={30} width={15} height={7} rx={3.5} fill="#fff" />
    </g>
  );
}

const line = { stroke: ink, strokeLinecap: "round" as const, fill: "none" };

function HappyEyes() {
  return (
    <>
      {[92, 144].map((x) => (
        <g key={x}>
          <path d={`M ${x - 11} 92 Q ${x} 78 ${x + 11} 92`} {...line} strokeWidth={7} />
          <circle cx={x - 4} cy={85} r={1.7} fill="#fff" />
          <circle cx={x + 3.5} cy={84.5} r={1.3} fill="#fff" />
        </g>
      ))}
    </>
  );
}

function OpenEyes({ look = { x: 0, y: 0 }, big = false, still }: { look?: { x: number; y: number }; big?: boolean; still: boolean }) {
  return (
    <motion.g
      animate={still ? undefined : { scaleY: [1, 1, 0.1, 1] }}
      transition={{ duration: 3.6, times: [0, 0.92, 0.96, 1], repeat: Infinity }}
      style={{ originX: 0.5, originY: 0.5 }}
    >
      {[92, 144].map((x) => (
        <g key={x}>
          <ellipse cx={x + look.x} cy={88 + look.y} rx={big ? 9 : 7.5} ry={big ? 11 : 9.5} fill={ink} />
          <circle cx={x + look.x + 3} cy={84 + look.y} r={big ? 3.4 : 2.8} fill="#fff" />
          {big ? <circle cx={x + look.x - 2.5} cy={92 + look.y} r={1.6} fill="#fff" /> : null}
        </g>
      ))}
    </motion.g>
  );
}

/** Open smile with a tongue; `small` for encourage and wave. */
function OpenMouth({ small = false }: { small?: boolean }) {
  return small ? (
    <g>
      <path d="M 106 103 Q 118 102 130 103 Q 128 120 118 120 Q 108 120 106 103 Z" fill={ink} />
      <ellipse cx={118} cy={115} rx={6} ry={3.5} fill="#f28ba8" />
    </g>
  ) : (
    <g>
      <path d="M 101 103 Q 118 101 135 103 Q 133 126 118 126 Q 103 126 101 103 Z" fill={ink} />
      <ellipse cx={118} cy={119} rx={8} ry={4.5} fill="#f28ba8" />
    </g>
  );
}

function Face({ mood, still }: { mood: MakiMood; still: boolean }) {
  return (
    <g>
      <ellipse cx={80} cy={108} rx={12} ry={7} fill={cheek} />
      <ellipse cx={156} cy={108} rx={12} ry={7} fill={cheek} />

      {mood === "encourage" ? (
        <>
          {/* Blushing proud: a big blush with little blush lines, eyes closed, a soft smile. */}
          <ellipse cx={80} cy={108} rx={15} ry={9} fill="#9cc4f0" />
          <ellipse cx={156} cy={108} rx={15} ry={9} fill="#9cc4f0" />
          <path d="M 70 100 l 6 -4 M 74 106 l 6 -4 M 150 100 l 6 -4 M 154 106 l 6 -4" stroke="#7fb0e8" strokeWidth={2.5} strokeLinecap="round" />
          <HappyEyes />
          <path d="M 108 106 Q 118 114 128 106" {...line} strokeWidth={5} />
        </>
      ) : mood === "thinking" ? (
        <>
          {/* One brow up, eyes looking up at the thought, mouth pushed to one side. */}
          <path d="M 84 74 L 100 74" {...line} strokeWidth={5} />
          <path d="M 136 70 Q 146 62 156 68" {...line} strokeWidth={5} />
          <OpenEyes look={{ x: -3, y: -4 }} still={still} />
          <path d="M 116 110 Q 124 106 132 110" {...line} strokeWidth={5} />
        </>
      ) : (
        <>
          <HappyEyes />
          {mood === "cheer" ? <OpenMouth /> : mood === "wave" ? <OpenMouth small /> : <path d="M 103 104 Q 118 118 133 104" {...line} strokeWidth={5.5} />}
        </>
      )}
    </g>
  );
}

/**
 * The "I love you" hand, cropped from the owner's drawing:
 * index and pinky up behind the palm, middle and ring folded in front, thumb out to the left.
 */
function RightHand({ mood, still }: { mood: MakiMood; still: boolean }) {
  return (
    <motion.g
      animate={
        still
          ? undefined
          : mood === "wave"
            ? { rotate: [0, -24, 14, -24, 14, 0] }
            : mood === "cheer"
              ? { y: [0, -10, 0], rotate: [0, -8, 0] }
              : { rotate: [0, -4, 0] }
      }
      transition={
        mood === "wave"
          ? { duration: 1.3, repeat: Infinity, repeatDelay: 0.3, ease: "easeInOut" }
          : { duration: mood === "cheer" ? 0.9 : 3, ...loop, repeatDelay: mood === "cheer" ? 0.6 : 0 }
      }
      style={{ originX: 0.55, originY: 1 }}
    >
      {/* The hand cut from the owner's own drawing (public/maki/maki-hand.png, 180 x 173, see-through background; 24 KB),
          placed where it sits in the design: over the bubble's lower right edge. */}
      <image href="/maki/maki-hand.png" x={151} y={68} width={92.4} height={89} />
      {mood === "wave" ? (
        <motion.g
          animate={still ? undefined : { opacity: [0, 1, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.3 }}
        >
          <path d="M 252 78 Q 260 92 254 106" {...line} strokeWidth={4} stroke="#60a5fa" />
          <path d="M 264 70 Q 274 92 266 112" {...line} strokeWidth={4} stroke="#93c5fd" />
        </motion.g>
      ) : null}
    </motion.g>
  );
}

/** A little chibi mitten hand on the left. It goes up with a cheer and is raised proudly with encourage. */
function LeftHand({ mood, still }: { mood: MakiMood; still: boolean }) {
  const shapes = (
    <>
      <ellipse cx={0} cy={0} rx={14} ry={17} transform="rotate(-20)" />
      <ellipse cx={11} cy={-9} rx={6} ry={8.5} transform="rotate(25 11 -9)" />
    </>
  );
  const motionFor = still
    ? undefined
    : mood === "cheer"
      ? { y: [0, -34, -34, 0], rotate: [0, -20, -20, 0] }
      : mood === "encourage"
        ? { x: [10, 10, 10], y: [-6, -11, -6], rotate: [-30, -38, -30] }
        : mood === "thinking"
          ? { y: [-14, -18, -14], rotate: [-10, -14, -10] }
          : { y: [0, -3, 0] };
  return (
    <motion.g
      animate={motionFor}
      transition={
        mood === "cheer"
          ? { duration: 0.9, times: [0, 0.3, 0.7, 1], repeat: Infinity, repeatDelay: 0.6 }
          : { duration: mood === "encourage" ? 2 : 2.6, ...loop }
      }
      style={{ originX: 0.5, originY: 0.5 }}
    >
      <g transform="translate(34 132)">
        <g stroke={ink} strokeWidth={8} strokeLinejoin="round" fill={ink}>
          {shapes}
        </g>
        <g fill={fill}>{shapes}</g>
        <path d="M -9 8 Q -2 14 7 10" stroke={shade} strokeWidth={4.5} strokeLinecap="round" fill="none" />
      </g>
    </motion.g>
  );
}

function star(cx: number, cy: number, r: number) {
  const i = r * 0.38;
  return `M ${cx} ${cy - r} L ${cx + i} ${cy - i} L ${cx + r} ${cy} L ${cx + i} ${cy + i} L ${cx} ${cy + r} L ${cx - i} ${cy + i} L ${cx - r} ${cy} L ${cx - i} ${cy - i} Z`;
}

function Sparkles({ still }: { still: boolean }) {
  const stars = [
    { cx: 36, cy: 40, r: 11, delay: 0 },
    { cx: 150, cy: 14, r: 12, delay: 0.25 },
    { cx: 60, cy: 12, r: 7, delay: 0.5 }
  ];
  return (
    <g>
      {stars.map((item) => (
        <motion.path
          key={`${item.cx}-${item.cy}`}
          d={star(item.cx, item.cy, item.r)}
          fill="#facc15"
          stroke="#eab308"
          strokeWidth={2}
          strokeLinejoin="round"
          animate={still ? undefined : { scale: [0.4, 1.15, 0.4], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, delay: item.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{ originX: 0.5, originY: 0.5 }}
        />
      ))}
    </g>
  );
}

/** "You can do it!" at Maki's upper right, close to the head, with a tail pointing at him. Pops in once. */
function SpeechBubble({ text, still }: { text: string; still: boolean }) {
  // About 8.4 units per character at this size, plus padding.
  const width = Math.max(90, text.length * 8.4 + 26);
  const x = 150;
  const y = -4;
  return (
    <motion.g
      initial={still ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.15 }}
      style={{ originX: 0, originY: 1 }}
    >
      <path d={`M ${x + 14} ${y + 30} L ${x + 2} ${y + 44} L ${x + 28} ${y + 30} Z`} fill="#fff" stroke="#2563eb" strokeWidth={3} strokeLinejoin="round" />
      <rect x={x} y={y} width={width} height={32} rx={16} fill="#fff" stroke="#2563eb" strokeWidth={3} />
      {/* Covers the tail's top edge so the bubble and tail read as one shape. */}
      <rect x={x + 12} y={y + 26} width={18} height={4.5} fill="#fff" />
      <text x={x + width / 2} y={y + 21.5} textAnchor="middle" fontSize={15} fontWeight={900} fill="#1d4ed8" fontFamily="inherit">
        {text}
      </text>
    </motion.g>
  );
}

/** Thought bubbles rising to a cloud with a question mark. */
function ThoughtBubbles({ still }: { still: boolean }) {
  return (
    <motion.g animate={still ? undefined : { y: [0, -4, 0] }} transition={{ duration: 1.6, ...loop }}>
      <circle cx={52} cy={36} r={4} fill="#fff" stroke={ink} strokeWidth={3} />
      <circle cx={40} cy={22} r={6} fill="#fff" stroke={ink} strokeWidth={3} />
      <circle cx={20} cy={4} r={14} fill="#fff" stroke={ink} strokeWidth={3} />
      <text x={20} y={10} textAnchor="middle" fontSize={18} fontWeight={900} fill="#2563eb" fontFamily="sans-serif">
        ?
      </text>
    </motion.g>
  );
}
