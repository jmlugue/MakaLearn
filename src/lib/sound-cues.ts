// Short cues for Student mode, made with the Web Audio API (no sound files): happy chimes for right answers and a
// soft, low buzz for wrong ones (owner's request, Sep 30; Maki then encourages). Always on (a Settings switch was
// tried and removed on request).

export type SoundCue = "correct" | "finish" | "wrong";

// [frequency in Hz, start in seconds, length in seconds]
const cues: Record<SoundCue, Array<[number, number, number]>> = {
  // Two rising notes.
  correct: [
    [880, 0, 0.14],
    [1318.5, 0.1, 0.26]
  ],
  // A small fanfare: C, E, G, high C.
  finish: [
    [523.25, 0, 0.16],
    [659.25, 0.13, 0.16],
    [783.99, 0.26, 0.16],
    [1046.5, 0.39, 0.5]
  ],
  // "Uh-uh": two short low notes, stepping down. Soft, not scary.
  wrong: [
    [233.08, 0, 0.16],
    [174.61, 0.17, 0.3]
  ]
};

// The buzz is a square wave at a lower volume, so it sounds like a game "wrong" without being harsh.
const wave: Record<SoundCue, OscillatorType> = { correct: "triangle", finish: "triangle", wrong: "square" };
const peak: Record<SoundCue, number> = { correct: 0.22, finish: 0.22, wrong: 0.07 };

let context: AudioContext | null = null;

function audioContext() {
  if (typeof window === "undefined") return null;
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  context ??= new Context();
  if (context.state === "suspended") void context.resume();
  return context;
}

/** Plays a cue. Never throws. */
export function playCue(cue: SoundCue) {
  try {
    const ctx = audioContext();
    if (!ctx) return;
    const now = ctx.currentTime + 0.02;
    cues[cue].forEach(([frequency, start, length]) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = wave[cue];
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(peak[cue], now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + length + 0.05);
    });
  } catch {
    // Sound is a nice extra; never break the game over it.
  }
}
