/**
 * Small hand-drawn accents used to break up the landing sections.
 * All decorative: every one is aria-hidden and inherits `currentColor`,
 * so callers set the tone with a text-* class.
 */

type DoodleProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round"
} as const;

export function ArrowDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 100 60" className={className} strokeWidth={4} {...base} aria-hidden="true" focusable="false">
      <path d="M 6 44 C 26 8 62 4 88 22" />
      <path d="M 72 12 L 90 21 L 80 38" />
    </svg>
  );
}

export function SquiggleDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 120 24" className={className} strokeWidth={5} {...base} aria-hidden="true" focusable="false">
      <path d="M 4 16 C 18 2 30 2 44 16 C 58 30 70 30 84 16 C 96 4 106 4 116 12" />
    </svg>
  );
}

export function StarDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} strokeWidth={4} {...base} aria-hidden="true" focusable="false">
      <path d="M 20 5 L 20 35 M 5 20 L 35 20 M 10 10 L 30 30 M 30 10 L 10 30" />
    </svg>
  );
}

export function UnderlineDoodle({ className }: DoodleProps) {
  return (
    <svg viewBox="0 0 200 14" className={className} strokeWidth={6} {...base} aria-hidden="true" focusable="false">
      <path d="M 4 9 C 46 2 108 2 196 7" />
    </svg>
  );
}
