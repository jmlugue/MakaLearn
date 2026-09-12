/**
 * Hand-drawn accent used under the hero tagline. Decorative: aria-hidden, and it
 * inherits `currentColor` so the caller sets the tone with a text-* class.
 */
export function UnderlineDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 14"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M 4 9 C 46 2 108 2 196 7" />
    </svg>
  );
}
