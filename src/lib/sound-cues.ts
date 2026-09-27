// Short happy chimes for Student mode, made with the Web Audio API (no sound files). Wrong answers stay silent
// on purpose. Always on (a Settings switch was tried and removed on request).

export type SoundCue = "correct" | "finish";

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
  ]
};

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
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.22, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + length + 0.05);
    });
  } catch {
    // Sound is a nice extra; never break the game over it.
  }
}
