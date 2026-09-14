"use client";

import { useEffect, useState } from "react";
import { Accessibility, Palette } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { FieldHint, Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { fetchUserSettings, upsertUserSettings } from "@/lib/supabase/app-data";
import type { UserSettings } from "@/types";

// Profile details and password live on the Profile page (opened from the sidebar profile menu).
export function SettingsView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [audioGuidance, setAudioGuidance] = useState(true);
  const [theme, setTheme] = useState<UserSettings["theme"]>("soft-blue");

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    document.documentElement.classList.toggle("high-contrast", highContrast);
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [largeText, highContrast, reduceMotion]);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const settings = await fetchUserSettings(user.id);
        if (!active || !settings) return;
        setLargeText(settings.largeText);
        setHighContrast(settings.highContrast);
        setReduceMotion(settings.reduceMotion);
        setAudioGuidance(settings.audioGuidance);
        setTheme(settings.theme);
      } catch {
        notify({
          title: "Settings unavailable",
          description: "Supabase settings could not be loaded.",
          tone: "error"
        });
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, [notify, user.id]);

  async function updateSettings(nextSettings: Omit<UserSettings, "userId" | "updatedAt">) {
    try {
      await upsertUserSettings({ userId: user.id, ...nextSettings });
    } catch (error) {
      notify({
        title: "Setting not saved",
        description: error instanceof Error ? error.message : "The setting could not be saved.",
        tone: "error"
      });
      throw error;
    }
  }

  return (
    <>
      <PageHeader eyebrow="Settings" title="App preferences" description="Accessibility and display options." />
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-[#fbfdff]">
          <div className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Accessibility settings</CardTitle>
          </div>
          <div className="mt-4 grid gap-3">
            <Toggle
              label="Large text mode"
              checked={largeText}
              onChange={async (value) => {
                setLargeText(value);
                try {
                  await updateSettings({ largeText: value, highContrast, reduceMotion, audioGuidance, theme });
                } catch {
                  setLargeText(!value);
                }
              }}
            />
            <Toggle
              label="High contrast mode"
              checked={highContrast}
              onChange={async (value) => {
                setHighContrast(value);
                try {
                  await updateSettings({ largeText, highContrast: value, reduceMotion, audioGuidance, theme });
                } catch {
                  setHighContrast(!value);
                }
              }}
            />
            <Toggle
              label="Reduce motion"
              checked={reduceMotion}
              onChange={async (value) => {
                setReduceMotion(value);
                try {
                  await updateSettings({ largeText, highContrast, reduceMotion: value, audioGuidance, theme });
                } catch {
                  setReduceMotion(!value);
                }
              }}
            />
            <Toggle
              label="Audio guidance"
              checked={audioGuidance}
              onChange={async (value) => {
                setAudioGuidance(value);
                try {
                  await updateSettings({ largeText, highContrast, reduceMotion, audioGuidance: value, theme });
                } catch {
                  setAudioGuidance(!value);
                }
              }}
            />
          </div>
        </Card>

        <Card className="bg-[#fbfdff]">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Theme and display</CardTitle>
          </div>
          <div className="mt-4">
            <Label htmlFor="theme">Theme</Label>
            <Select
              id="theme"
              value={theme}
              onChange={async (event) => {
                const nextTheme = event.target.value as UserSettings["theme"];
                const previousTheme = theme;
                setTheme(nextTheme);
                try {
                  await updateSettings({ largeText, highContrast, reduceMotion, audioGuidance, theme: nextTheme });
                } catch {
                  setTheme(previousTheme);
                }
              }}
            >
              <option value="soft-blue">Soft blue</option>
              <option value="high-contrast">High contrast</option>
            </Select>
            <FieldHint>Display preferences are saved to your account.</FieldHint>
          </div>
        </Card>
      </section>
    </>
  );
}

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-blue-100 bg-skywash p-3 text-sm font-semibold">
      <span>{label}</span>
      <span className={`relative h-7 w-12 rounded-full transition ${checked ? "bg-blue-600" : "bg-white ring-1 ring-blue-200"}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-focus:ring-4 peer-focus:ring-blue-100 ${
            checked ? "left-6" : "left-1 bg-blue-100"
          }`}
        />
      </span>
    </label>
  );
}
