import type { MakiMood } from "@/features/student-mode/maki";
import { playCue } from "@/lib/sound-cues";
import { createUtterance } from "@/lib/speech";

/**
 * What Maki does after an answer. Wrong: a short buzz, then one of four encouraging faces and a line. Right: the
 * chime, then one of four happy faces and a line. Lines are spoken in Maki's own voice: small clips in
 * public/maki/voice made with the free Microsoft Ana voice pitched down to sound like a young boy (owner's pick,
 * edge-tts `en-US-AnaNeural --pitch=-18Hz --rate=-5%`), so it sounds the same on every device. Picks are random but
 * never repeat the last face or line.
 */
export const wrongMoods: MakiMood[] = ["encourage", "wink", "nod", "oops"];
export const rightMoods: MakiMood[] = ["cheer", "love", "party", "dance"];

type Line = { text: string; clip: string };

export const encouragingLines: Line[] = [
  { text: "You can do it!", clip: "you-can-do-it" },
  { text: "Almost there!", clip: "almost-there" },
  { text: "Try again!", clip: "try-again" },
  { text: "Keep going!", clip: "keep-going" },
  { text: "You've got this!", clip: "youve-got-this" },
  { text: "Nice try!", clip: "nice-try" },
  { text: "Oops! Try again!", clip: "oops-try-again" },
  { text: "Oopsie! So close!", clip: "oopsie-so-close" },
  { text: "Uh-oh! You can do it!", clip: "uh-oh-you-can-do-it" }
];

export const cheeringLines: Line[] = [
  { text: "Great job!", clip: "great-job" },
  { text: "You did it!", clip: "you-did-it" },
  { text: "Awesome!", clip: "awesome" },
  { text: "Yay!", clip: "yay" },
  { text: "Super!", clip: "super" },
  { text: "Well done!", clip: "well-done" }
];

export type MakiReaction = { mood: MakiMood; line: string; clip: string };
/** Kept for older imports. */
export type Encouragement = MakiReaction;

const last: Record<string, number> = {};

function pickIndex(key: string, length: number) {
  const previous = last[key] ?? -1;
  if (length < 2) return 0;
  let next = Math.floor(Math.random() * (length - 1));
  if (next >= previous) next += 1;
  last[key] = next;
  return next;
}

function pick(kind: "wrong" | "right"): MakiReaction {
  const moods = kind === "wrong" ? wrongMoods : rightMoods;
  const lines = kind === "wrong" ? encouragingLines : cheeringLines;
  const line = lines[pickIndex(`${kind}-line`, lines.length)];
  return { mood: moods[pickIndex(`${kind}-mood`, moods.length)], line: line.text, clip: line.clip };
}

export function pickEncouragement() {
  return pick("wrong");
}

export function pickCheer() {
  return pick("right");
}

let current: HTMLAudioElement | null = null;

/**
 * Maki says a line: the saved clip, or the device voice pitched up if the clip cannot play. `then` runs when he has
 * finished (used to say the card's word after "Great job!"). Never throws.
 */
export function sayMakiLine(reaction: Pick<MakiReaction, "line" | "clip">, then?: () => void) {
  if (typeof window === "undefined") return;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    then?.();
  };
  try {
    window.speechSynthesis?.cancel();
    current?.pause();
    const audio = new Audio(`/maki/voice/${reaction.clip}.mp3`);
    current = audio;
    audio.addEventListener("ended", finish, { once: true });
    audio.play().catch(() => fallback(reaction.line, finish));
  } catch {
    fallback(reaction.line, finish);
  }
}

function fallback(line: string, then: () => void) {
  try {
    if (!("speechSynthesis" in window)) return then();
    const utterance = createUtterance(line);
    utterance.pitch = 1.6;
    utterance.onend = then;
    utterance.onerror = then;
    window.speechSynthesis.speak(utterance);
  } catch {
    then();
  }
}

/** Wrong answer: the buzz first, then Maki's line a moment later. Returns the face and line to show. */
export function encourageAfterWrong(delayMs = 450): MakiReaction {
  const next = pickEncouragement();
  playCue("wrong");
  window.setTimeout(() => sayMakiLine(next), delayMs);
  return next;
}

/**
 * Right answer: the chime, then the card's word straight away (its audio file, or the device voice), then
 * Maki's line once the word is done. Without a word, Maki's line follows the chime.
 */
export function cheerAfterRight(word?: string, audioUrl?: string): MakiReaction {
  const next = pickCheer();
  playCue("correct");
  const sayLine = () => sayMakiLine(next);
  // The card's own recording starts fastest and matches the PECS card audio; the device voice is the fallback.
  if (audioUrl && typeof window !== "undefined") {
    try {
      window.speechSynthesis?.cancel();
      current?.pause();
      const audio = new Audio(audioUrl);
      current = audio;
      let said = false;
      const after = () => {
        if (said) return;
        said = true;
        sayLine();
      };
      audio.addEventListener("ended", after, { once: true });
      audio.addEventListener("error", after, { once: true });
      window.setTimeout(() => void audio.play().catch(after), 120);
      return next;
    } catch {
      // Falls through to the device voice.
    }
  }
  if (!word || typeof window === "undefined" || !("speechSynthesis" in window)) {
    window.setTimeout(sayLine, 250);
    return next;
  }
  try {
    window.speechSynthesis.cancel();
    current?.pause();
    const utterance = createUtterance(word);
    let said = false;
    const after = () => {
      if (said) return;
      said = true;
      sayLine();
    };
    utterance.onend = after;
    utterance.onerror = after;
    // Starts right after the chime's first note.
    window.setTimeout(() => window.speechSynthesis.speak(utterance), 120);
  } catch {
    window.setTimeout(sayLine, 250);
  }
  return next;
}
