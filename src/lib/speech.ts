// The app's spoken voice (browser speech, free). Every place that reads text aloud builds its utterance here, so
// the voice and speed chosen in Settings apply everywhere. Card audio files are never changed by this.
// Voices differ per device and browser, so the choice is saved in this browser only.

export type VoiceSpeed = "slow" | "normal" | "fast";

const VOICE_KEY = "makalearn.voice";
const SPEED_KEY = "makalearn.voice-speed";

const speedRates: Record<VoiceSpeed, number> = { slow: 0.7, normal: 0.85, fast: 1 };

// Novelty voices some systems ship (mostly macOS). Not suitable for learners.
const noveltyVoices = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|superstar|trinoids|whisper|wobble|zarvox)\b/i;

function read(key: string) {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Without storage the automatic voice is used.
  }
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** The chosen voice ("" means automatic) and speed. */
export function readVoicePrefs(): { voiceURI: string; speed: VoiceSpeed } {
  if (typeof window === "undefined") return { voiceURI: "", speed: "normal" };
  const speed = read(SPEED_KEY);
  return { voiceURI: read(VOICE_KEY), speed: speed === "slow" || speed === "fast" ? speed : "normal" };
}

export function saveVoicePrefs(next: { voiceURI?: string; speed?: VoiceSpeed }) {
  if (next.voiceURI !== undefined) write(VOICE_KEY, next.voiceURI);
  if (next.speed !== undefined) write(SPEED_KEY, next.speed === "normal" ? "" : next.speed);
}

/** Higher is better: natural and neural voices sound far less robotic than the older system ones. */
function voiceScore(voice: SpeechSynthesisVoice) {
  const name = voice.name;
  let score = 0;
  if (/natural/i.test(name)) score += 50;
  if (/neural|premium|enhanced/i.test(name)) score += 30;
  if (/google/i.test(name)) score += 25;
  if (/online/i.test(name)) score += 10;
  if (/^en[-_](us|gb|ph)/i.test(voice.lang)) score += 5;
  return score;
}

/** English voices on this device, best first. */
export function goodVoices(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => /^en/i.test(voice.lang) && !noveltyVoices.test(voice.name))
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

/** A short, readable name: "Microsoft Aria Online (Natural) - English (United States)" becomes "Aria, natural (en-US)". */
export function voiceLabel(voice: SpeechSynthesisVoice) {
  const natural = /natural|neural|premium|enhanced/i.test(voice.name);
  const name = voice.name
    .replace(/^(microsoft|google|apple)\s+/i, "")
    .replace(/\s*-\s*.*$/, "")
    .replace(/\s*\((natural|neural|premium|enhanced)\)/i, "")
    .replace(/\s+online$/i, "")
    .trim();
  return `${name || voice.name}${natural ? ", natural" : ""} (${voice.lang})`;
}

/** The saved voice when it exists on this device, otherwise the best English one. */
export function pickVoice() {
  const voices = goodVoices();
  const { voiceURI } = readVoicePrefs();
  return (voiceURI && voices.find((voice) => voice.voiceURI === voiceURI)) || voices[0];
}

/** An utterance with the chosen voice and speed. Callers add their own handlers and call speechSynthesis.speak. */
export function createUtterance(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.rate = speedRates[readVoicePrefs().speed];
  return utterance;
}
