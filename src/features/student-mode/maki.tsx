"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Maki, MakaLearn's mascot: a speech bubble with a face, a chibi hand on the left, and the right hand signing
 * "I love you" (index and pinky up, middle and ring folded, thumb out). Drawn in code from the owner's design
 * so each part can move. Student mode only.
 *
 * - happy: idle and intro cards. Gentle bob, closed happy eyes.
 * - cheer, love, party, dance: the four right-answer faces, picked at random (`maki-voice.ts`).
 *   cheer: open smile, sparkles, a jump, hand up. love: heart eyes, hearts float up. party: party hat and confetti,
 *   big smile, bounces. dance: sways side to side with music notes, hand waving.
 * - encourage, wink, nod, oops: the four wrong-answer faces, picked at random (`maki-voice.ts`). All show a
 *   speech bubble at the upper right with an encouraging line. Never sad. Right-answer faces never show a bubble.
 *   encourage: blushing proud (eyes closed, big blush, soft smile, hand raised).
 *   wink: one eye winks, cheeky grin, hand up, a sparkle by the wink.
 *   nod: happy eyes, small open smile, nods, a heart floats up.
 *   oops: a sheepish grin, a sweat drop, and his hand scratching his head.
 * - thinking: waiting. Eyes up, one brow raised, thought bubbles with a question mark.
 * - wave: hello. Body sways, the signing hand waves with motion lines.
 *
 * With reduced motion Maki holds the pose without moving.
 */
export type MakiMood = "happy" | "cheer" | "love" | "party" | "dance" | "encourage" | "wink" | "nod" | "oops" | "thinking" | "wave";

/** Only the wrong-answer moods talk (a speech bubble), so right and wrong look different at a glance (owner's rule). */
const talking: MakiMood[] = ["encourage", "wink", "nod", "oops"];

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
  message
}: {
  mood?: MakiMood;
  /** The speech bubble text for the wrong-answer moods ("You can do it!" by default). Other moods ignore it. */
  message?: string;
  /** Width in pixels. */
  size?: number;
  className?: string;
  label?: string;
}) {
  const still = Boolean(useReducedMotion());

  const body = still
    ? undefined
    : mood === "cheer" || mood === "party"
      ? { y: [0, -16, 0, -8, 0] }
      : mood === "love"
        ? { y: [0, -6, 0], scale: [1, 1.04, 1] }
        : mood === "dance"
          ? { rotate: [-8, 8, -8], x: [-4, 4, -4] }
      : mood === "encourage"
        ? { y: [0, -5, 0], rotate: [0, -2, 0] }
        : mood === "wink"
          ? { y: [0, -4, 0], rotate: [0, -6, 0] }
          : mood === "nod"
            ? { y: [0, 6, 0, 6, 0] }
            : mood === "oops"
              ? { rotate: [0, 4, 0], y: [0, -3, 0] }
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
          mood === "cheer" || mood === "party"
            ? { duration: 0.9, times: [0, 0.3, 0.55, 0.75, 1], repeat: Infinity, repeatDelay: 0.6 }
            : mood === "dance"
              ? { duration: 0.8, ...loop }
            : { duration: mood === "wave" ? 1.6 : mood === "nod" ? 1.4 : mood === "oops" ? 1.6 : mood === "encourage" || mood === "wink" ? 2 : 2.6, ...loop }
        }
        style={{ originX: 0.5, originY: 0.9 }}
      >
        <LeftHand mood={mood} still={still} />
        <Bubble />
        <Face mood={mood} still={still} />
        <RightHand mood={mood} still={still} />
        {mood === "cheer" ? <Sparkles still={still} /> : null}
        {mood === "love" ? <RisingHearts still={still} /> : null}
        {mood === "party" ? <PartyHat /> : null}
        {mood === "party" ? <Confetti still={still} /> : null}
        {mood === "dance" ? <MusicNotes still={still} /> : null}
        {mood === "wink" ? <WinkSparkle still={still} /> : null}
        {mood === "nod" ? <FloatingHeart still={still} /> : null}
        {talking.includes(mood) ? <SpeechBubble text={message ?? "You can do it!"} still={still} /> : null}
        {mood === "oops" ? <SweatDrop still={still} /> : null}
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
      ) : mood === "wink" ? (
        <>
          {/* Left eye open and shiny, right eye a winking arc; a cheeky open grin. */}
          <ellipse cx={92} cy={88} rx={7.5} ry={9.5} fill={ink} />
          <circle cx={95} cy={84} r={2.8} fill="#fff" />
          <path d="M 133 90 Q 144 80 155 90" {...line} strokeWidth={7} />
          <OpenMouth small />
        </>
      ) : mood === "nod" ? (
        <>
          <HappyEyes />
          <OpenMouth small />
        </>
      ) : mood === "oops" ? (
        <>
          {/* Oops: eyes squeezed shut, one brow up, a sheepish wavy grin. */}
          <path d="M 82 86 L 96 92 L 82 98" {...line} strokeWidth={6} />
          <path d="M 154 86 L 140 92 L 154 98" {...line} strokeWidth={6} />
          <path d="M 80 72 Q 90 66 100 70" {...line} strokeWidth={4.5} />
          <path d="M 104 108 Q 111 102 118 108 Q 125 114 132 108" {...line} strokeWidth={5} />
        </>
      ) : mood === "love" ? (
        <>
          {/* Heart eyes and a big smile. */}
          {[92, 144].map((x) => (
            <path
              key={x}
              d={`M ${x} 96 C ${x - 3} 92 ${x - 12} 88 ${x - 12} 82 C ${x - 12} 76 ${x - 4} 74 ${x} 80 C ${x + 4} 74 ${x + 12} 76 ${x + 12} 82 C ${x + 12} 88 ${x + 3} 92 ${x} 96 Z`}
              fill="#f43f5e"
              stroke={ink}
              strokeWidth={3}
              strokeLinejoin="round"
            />
          ))}
          <OpenMouth />
        </>
      ) : mood === "dance" ? (
        <>
          <HappyEyes />
          <OpenMouth small />
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
          {mood === "cheer" || mood === "party" ? <OpenMouth /> : mood === "wave" ? <OpenMouth small /> : <path d="M 103 104 Q 118 118 133 104" {...line} strokeWidth={5.5} />}
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
            : mood === "cheer" || mood === "party"
              ? { y: [0, -10, 0], rotate: [0, -8, 0] }
              : mood === "dance"
                ? { rotate: [0, -18, 0, 12, 0] }
              : { rotate: [0, -4, 0] }
      }
      transition={
        mood === "wave"
          ? { duration: 1.3, repeat: Infinity, repeatDelay: 0.3, ease: "easeInOut" }
          : { duration: mood === "cheer" || mood === "party" || mood === "dance" ? 0.9 : 3, ...loop, repeatDelay: mood === "cheer" || mood === "party" ? 0.6 : 0 }
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
    : mood === "cheer" || mood === "party"
      ? { y: [0, -34, -34, 0], rotate: [0, -20, -20, 0] }
      : mood === "dance"
        ? { y: [0, -26, 0], rotate: [0, -24, 0] }
        : mood === "love"
          ? { y: [-8, -12, -8], rotate: [-12, -18, -12] }
      : mood === "encourage"
        ? { x: [10, 10, 10], y: [-6, -11, -6], rotate: [-30, -38, -30] }
        : mood === "wink"
          ? { x: [6, 6, 6], y: [-12, -16, -12], rotate: [-20, -28, -20] }
          : mood === "oops"
            ? { x: [26, 30, 26], y: [-62, -66, -62], rotate: [-40, -55, -40] }
        : mood === "thinking"
          ? { y: [-14, -18, -14], rotate: [-10, -14, -10] }
          : { y: [0, -3, 0] };
  return (
    <motion.g
      animate={motionFor}
      transition={
        mood === "cheer" || mood === "party"
          ? { duration: 0.9, times: [0, 0.3, 0.7, 1], repeat: Infinity, repeatDelay: 0.6 }
          : mood === "dance"
            ? { duration: 0.8, ...loop }
          : { duration: mood === "oops" ? 0.7 : mood === "encourage" || mood === "wink" ? 2 : 2.6, ...loop }
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

/** The encouraging line at Maki's upper right, close to the head, with a tail pointing at him. Pops in once. */
function SpeechBubble({ text, still }: { text: string; still: boolean }) {
  // About 11 units per character at this size, plus padding. Big enough to read from a child's seat.
  const width = Math.max(110, text.length * 11.5 + 40);
  const x = 150;
  const y = -16;
  return (
    <motion.g
      initial={still ? false : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 16, delay: 0.15 }}
      style={{ originX: 0, originY: 1 }}
    >
      <path d={`M ${x + 14} ${y + 38} L ${x + 2} ${y + 54} L ${x + 30} ${y + 38} Z`} fill="#fff" stroke="#2563eb" strokeWidth={3} strokeLinejoin="round" />
      <rect x={x} y={y} width={width} height={42} rx={21} fill="#fff" stroke="#2563eb" strokeWidth={3} />
      {/* Covers the tail's top edge so the bubble and tail read as one shape. */}
      <rect x={x + 12} y={y + 33} width={20} height={5} fill="#fff" />
      <text x={x + width / 2} y={y + 28} textAnchor="middle" fontSize={20} fontWeight={900} fill="#1d4ed8" fontFamily="inherit">
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

/** A little twinkle next to the winking eye. */
function WinkSparkle({ still }: { still: boolean }) {
  return (
    <motion.path
      d={star(172, 70, 9)}
      fill="#facc15"
      stroke="#eab308"
      strokeWidth={2}
      strokeLinejoin="round"
      animate={still ? undefined : { scale: [0.3, 1.2, 0.3], rotate: [0, 45, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ originX: 0.5, originY: 0.5 }}
    />
  );
}

/** A heart that floats up from Maki's left and fades, again and again. */
function FloatingHeart({ still }: { still: boolean }) {
  return (
    <motion.path
      d="M 40 40 C 40 32 28 30 28 40 C 28 48 40 54 40 58 C 40 54 52 48 52 40 C 52 30 40 32 40 40 Z"
      fill="#f472b6"
      stroke="#db2777"
      strokeWidth={2.5}
      strokeLinejoin="round"
      initial={false}
      animate={still ? undefined : { y: [16, -14], opacity: [0, 1, 0] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
    />
  );
}

/** Little hearts that float up from both sides and fade. */
function RisingHearts({ still }: { still: boolean }) {
  const heart = (x: number, y: number, r: number) =>
    `M ${x} ${y + r} C ${x - r * 0.3} ${y + r * 0.6} ${x - r} ${y + r * 0.2} ${x - r} ${y - r * 0.3} C ${x - r} ${y - r} ${x - r * 0.2} ${y - r} ${x} ${y - r * 0.4} C ${x + r * 0.2} ${y - r} ${x + r} ${y - r} ${x + r} ${y - r * 0.3} C ${x + r} ${y + r * 0.2} ${x + r * 0.3} ${y + r * 0.6} ${x} ${y + r} Z`;
  return (
    <g>
      {[
        { x: 30, y: 44, r: 9, delay: 0 },
        { x: 196, y: 26, r: 8, delay: 0.6 },
        { x: 60, y: 18, r: 6, delay: 1.1 }
      ].map((item) => (
        <motion.path
          key={item.x}
          d={heart(item.x, item.y, item.r)}
          fill="#fb7185"
          stroke="#e11d48"
          strokeWidth={2}
          initial={false}
          animate={still ? undefined : { y: [10, -14], opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, delay: item.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}
    </g>
  );
}

/** A striped party hat on top of the bubble. */
function PartyHat() {
  return (
    <g transform="translate(-22 0) rotate(-22 118 30)">
      <path d="M 100 34 L 118 -8 L 136 34 Z" fill="#a855f7" stroke={ink} strokeWidth={4} strokeLinejoin="round" />
      <path d="M 108 16 L 128 16 M 104 26 L 132 26" stroke="#fde047" strokeWidth={4} strokeLinecap="round" />
      <circle cx={118} cy={-10} r={6} fill="#fde047" stroke={ink} strokeWidth={3} />
    </g>
  );
}

/** Confetti pieces falling around Maki. */
function Confetti({ still }: { still: boolean }) {
  const pieces = [
    { x: 24, color: "#f43f5e", delay: 0 },
    { x: 60, color: "#22c55e", delay: 0.3 },
    { x: 170, color: "#3b82f6", delay: 0.15 },
    { x: 206, color: "#eab308", delay: 0.45 },
    { x: 140, color: "#a855f7", delay: 0.6 }
  ];
  return (
    <g>
      {pieces.map((piece) => (
        <motion.rect
          key={piece.x}
          x={piece.x}
          y={0}
          width={7}
          height={11}
          rx={2}
          fill={piece.color}
          initial={false}
          animate={still ? undefined : { y: [-6, 60], rotate: [0, 200], opacity: [1, 1, 0] }}
          transition={{ duration: 1.4, delay: piece.delay, repeat: Infinity, ease: "easeIn" }}
          style={{ originX: 0.5, originY: 0.5 }}
        />
      ))}
    </g>
  );
}

/** Music notes bobbing beside Maki while he dances. */
function MusicNotes({ still }: { still: boolean }) {
  const note = (x: number, y: number) => `M ${x} ${y} L ${x} ${y - 22} L ${x + 12} ${y - 26} L ${x + 12} ${y - 6}`;
  return (
    <g>
      {[
        { x: 20, y: 60, delay: 0 },
        { x: 200, y: 36, delay: 0.5 }
      ].map((item) => (
        <motion.g
          key={item.x}
          initial={false}
          animate={still ? undefined : { y: [0, -10, 0], rotate: [-8, 8, -8] }}
          transition={{ duration: 1.2, delay: item.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d={note(item.x, item.y)} fill="none" stroke="#2563eb" strokeWidth={3.5} strokeLinejoin="round" />
          <ellipse cx={item.x - 3} cy={item.y} rx={5} ry={4} fill="#2563eb" />
          <ellipse cx={item.x + 9} cy={item.y - 6} rx={5} ry={4} fill="#2563eb" />
        </motion.g>
      ))}
    </g>
  );
}

/** A blue sweat drop on the side of Maki's head, for "oops". It slides down a little and comes back. */
function SweatDrop({ still }: { still: boolean }) {
  return (
    <motion.path
      d="M 172 44 C 166 54 164 60 172 64 C 180 60 178 54 172 44 Z"
      fill="#7dd3fc"
      stroke={ink}
      strokeWidth={2.5}
      strokeLinejoin="round"
      initial={false}
      animate={still ? undefined : { y: [0, 6, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
