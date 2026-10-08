"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Check, Compass, Contrast, Gauge, Loader2, Mic, Play, RotateCcw, Settings as SettingsIcon, Type, Volume2, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { canSpeak, createUtterance, goodVoices, readVoicePrefs, saveVoicePrefs, voiceLabel, type VoiceSpeed } from "@/lib/speech";
import { type Preferences, type TextSize, useUserSettings } from "@/features/settings/user-settings-context";

type SaveState = "idle" | "saving" | "saved";

const speeds: { value: VoiceSpeed; label: string }[] = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" }
];

const textSizes: { value: TextSize; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "large", label: "Large" },
  { value: "extra-large", label: "Extra large" }
];

// Profile details and password live on the Profile page (opened from the sidebar profile menu).
export function SettingsView() {
  const { preferences, loaded, updatePreferences, resetGuide } = useUserSettings();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [replaying, setReplaying] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
  }, []);

  async function save(next: Partial<Preferences>) {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
    setSaveState("saving");
    const ok = await updatePreferences(next);
    if (!ok) {
      setSaveState("idle");
      return;
    }
    setSaveState("saved");
    savedTimerRef.current = window.setTimeout(() => setSaveState("idle"), 2000);
  }

  async function replay() {
    setReplaying(true);
    await resetGuide();
    setReplaying(false);
  }

  return (
    <>
      <PageHeader
        title="Settings"
        icon={SettingsIcon}
        actions={
          <span aria-live="polite">
            <SaveIndicator state={saveState} />
          </span>
        }
      />

      {/* Two columns on desktop, each stacked on its own, so a tall group never leaves a gap beside it. */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <SettingsGroup title="Display">
            <SettingsRow icon={Type} label="Text size" hint="Makes text bigger across the app.">
              <SegmentedControl
                label="Text size"
                options={textSizes}
                value={preferences.textSize}
                disabled={!loaded}
                onChange={(value) => save({ textSize: value })}
              />
            </SettingsRow>
            <SettingsRow icon={Contrast} label="High contrast" hint="Stronger borders and plain backgrounds.">
              <Switch
                label="High contrast"
                checked={preferences.highContrast}
                disabled={!loaded}
                onChange={(value) => save({ highContrast: value })}
              />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title="Guidance">
            <SettingsRow icon={Compass} label="Guide mode" hint="Explains a control when you hover it.">
              <Switch
                label="Guide mode"
                checked={preferences.guideMode}
                disabled={!loaded}
                onChange={(value) => save({ guideMode: value })}
              />
            </SettingsRow>
            <SettingsRow icon={RotateCcw} label="Replay the tour" hint="Shows the welcome tour and the page introductions again.">
              <Button type="button" variant="outline" size="sm" disabled={!loaded || replaying} onClick={replay}>
                {replaying ? "Resetting..." : "Replay"}
              </Button>
            </SettingsRow>
          </SettingsGroup>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4">
          <SettingsGroup title="Motion">
            <SettingsRow icon={Wind} label="Reduce motion" hint="Turns off animations and slides.">
              <Switch
                label="Reduce motion"
                checked={preferences.reduceMotion}
                disabled={!loaded}
                onChange={(value) => save({ reduceMotion: value })}
              />
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title="Voice">
            <VoiceSettings />
          </SettingsGroup>
        </div>
      </div>
    </>
  );
}

/**
 * Voice and speed. Saved in this browser (voices differ per device), so no Saving indicator. Card audio files
 * are not affected; this is the voice that reads questions, sentences, and cards without audio.
 */
function VoiceSettings() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [speed, setSpeed] = useState<VoiceSpeed>("normal");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    const prefs = readVoicePrefs();
    setVoiceURI(prefs.voiceURI);
    setSpeed(prefs.speed);
    if (!canSpeak()) return undefined;
    // Browsers load their voice list a moment after the page.
    const load = () => setVoices(goodVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  /** Speaks a sample. The button turns blue while it talks. */
  function test() {
    if (!canSpeak()) return;
    window.speechSynthesis.cancel();
    const utterance = createUtterance("Hello! Let's learn together.");
    utterance.onend = () => setTesting(false);
    utterance.onerror = () => setTesting(false);
    setTesting(true);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <>
      <SettingsRow icon={Mic} label="Voice" hint={voices.length ? "Reads questions and sentences. Card audio stays the same." : "No voices found on this device."}>
        <div className="flex items-center gap-2">
          <Select
            aria-label="Voice"
            className="w-56 py-2"
            value={voiceURI}
            disabled={!voices.length}
            onChange={(event) => {
              setVoiceURI(event.target.value);
              saveVoicePrefs({ voiceURI: event.target.value });
            }}
          >
            <option value="">Automatic (best voice)</option>
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voiceLabel(voice)}
              </option>
            ))}
          </Select>
          <Button type="button" variant={testing ? "primary" : "outline"} size="sm" onClick={test} disabled={!voices.length} aria-pressed={testing}>
            {testing ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
            {testing ? "Playing" : "Test"}
          </Button>
        </div>
      </SettingsRow>
      <SettingsRow icon={Gauge} label="Voice speed" hint="How fast the voice talks.">
        <SegmentedControl
          label="Voice speed"
          options={speeds}
          value={speed}
          onChange={(value) => {
            setSpeed(value);
            saveVoicePrefs({ speed: value });
          }}
        />
      </SettingsRow>
    </>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Saving
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved
      </span>
    );
  }
  return <span className="h-4" />;
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="bg-[#fbfdff]">
      <h2 className="px-1 pb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{title}</h2>
      {/* bg-[#fff] instead of bg-white: `.app-canvas .bg-white` makes plain bg-white translucent. */}
      <div className="divide-y divide-blue-100 overflow-hidden rounded-xl border border-blue-100 bg-[#fff]">{children}</div>
    </Card>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  hint,
  children
}: {
  icon: typeof Type;
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="text-sm text-slate-500">{hint}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Switch({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-50",
        checked ? "bg-blue-600" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-[#fff] shadow-sm transition-[left]",
          checked ? "left-6" : "left-1"
        )}
      />
    </button>
  );
}
