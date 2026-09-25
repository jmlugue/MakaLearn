/**
 * One type scale and one set of colors for every Student mode game, so no game has smaller or bigger text
 * than another. Colors carry meaning only: blue for actions and progress, green correct, red wrong, amber
 * hint, yellow stars for reward.
 */
export const studentText = {
  /** The short "what to do" line, same place and size in every game. */
  instruction: "text-xl font-black leading-tight text-blue-700 sm:text-2xl",
  /** The question, the word to match, or the sentence. */
  question: "text-3xl font-black leading-tight text-[#10285e] sm:text-4xl lg:text-5xl",
  /** The situation line above a fill in the blank sentence. */
  lead: "text-xl font-bold leading-snug text-slate-600 sm:text-2xl lg:text-3xl",
  /** Word labels on drop boxes. */
  label: "text-xl font-black uppercase leading-none text-[#10285e] sm:text-2xl",
  /** Pop-up titles ("Correct!", "Great job!"). */
  popupTitle: "text-4xl font-black leading-none sm:text-5xl",
  /** Button text. */
  button: "text-lg font-black"
} as const;

export const studentButton = {
  base: "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-4 text-lg font-black transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-200 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5",
  primary: "border-4 border-white bg-blue-600 text-white shadow-[0_6px_0_rgba(30,64,175,0.35)] hover:bg-blue-700",
  secondary: "border-2 border-blue-200 bg-[#fff] text-blue-800 shadow-[0_6px_0_rgba(147,197,253,0.4)] hover:bg-blue-50",
  hint: "border-2 border-amber-300 bg-[#fff] text-amber-800 shadow-[0_6px_0_rgba(251,191,36,0.35)] hover:bg-amber-50"
} as const;

/** The same 3:4 card look everywhere: choices, the drag tray, drop boxes, and the result pop-up. */
export const studentCard =
  "relative grid aspect-[3/4] min-h-0 overflow-hidden rounded-[1.5rem] border-4 bg-[#fff] p-2 text-center shadow-[0_8px_0_rgba(147,197,253,0.3),0_18px_32px_rgba(37,99,235,0.12)] transition";

/** How long the Correct or Not this one pop-up stays before the next question. */
export const FEEDBACK_MS = 1800;

/** Drag and drop feedback is shorter, so the child can keep dragging. */
export const DROP_FEEDBACK_MS = 1100;

/** Pause after the last answer so the colors show before the score pops up. */
export const SCORE_DELAY_MS = 400;

/** Games show at most this many questions per round. */
export const ROUND_SIZE = 5;

/** What to do, in Student mode words. Short and the same shape for every game. */
export function studentInstruction(type: string) {
  if (type === "match-word-symbol") return "Find the picture for the word.";
  if (type === "fill-blank") return "Find the picture that finishes the sentence.";
  if (type === "drag-drop-symbol") return "Drag each picture onto its word.";
  return "Find the picture that answers the question.";
}

/** How long a wrong answer shows the right card before the next question. */
export const WRONG_MS = 2400;
