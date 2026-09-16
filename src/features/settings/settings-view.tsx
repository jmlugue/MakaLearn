"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Check, Compass, Contrast, Loader2, RotateCcw, Settings as SettingsIcon, Type, Volume2, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { type Preferences, type TextSize, useUserSettings } from "@/features/settings/user-settings-context";

type SaveState = "idle" | "saving" | "saved";

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

      {/* Two groups side by side on desktop so the page uses the full width. */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
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

        <SettingsGroup title="Motion and sound">
          <SettingsRow icon={Wind} label="Reduce motion" hint="Turns off animations and slides.">
            <Switch
              label="Reduce motion"
              checked={preferences.reduceMotion}
              disabled={!loaded}
              onChange={(value) => save({ reduceMotion: value })}
            />
          </SettingsRow>
          <SettingsRow icon={Volume2} label="Audio guidance" hint="Plays spoken cues during practice.">
            <Switch
              label="Audio guidance"
              checked={preferences.audioGuidance}
              disabled={!loaded}
              onChange={(value) => save({ audioGuidance: value })}
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
