"use client";

import { FormEvent, useEffect, useState } from "react";
import { Accessibility, Info, Lock, Palette, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint, Input, Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { fetchUserSettings, updateProfileDetails, upsertUserSettings } from "@/lib/supabase/app-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserSettings } from "@/types";

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export function SettingsView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordLoading, setPasswordLoading] = useState(false);
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
    setProfileName(user.name);
    setProfileEmail(user.email);
  }, [user]);

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

  async function saveSettings(nextSettings: Omit<UserSettings, "userId" | "updatedAt">) {
    await upsertUserSettings({
      userId: user.id,
      ...nextSettings
    });
  }

  async function updateSettings(nextSettings: Omit<UserSettings, "userId" | "updatedAt">) {
    try {
      const saved = await saveSettings(nextSettings);
      return saved;
    } catch (error) {
      notify({
        title: "Setting not saved",
        description: error instanceof Error ? error.message : "The setting could not be saved.",
        tone: "error"
      });
      throw error;
    }
  }

  async function saveProfile() {
    if (!profileName.trim() || !profileEmail.includes("@")) {
      notify({ title: "Check profile details", description: "Name and a valid email are required." });
      return;
    }

    try {
      await updateProfileDetails(user.id, { name: profileName, email: profileEmail });
      notify({ title: "Profile saved", description: "Profile details were saved.", tone: "success" });
    } catch (error) {
      notify({
        title: "Profile not saved",
        description: error instanceof Error ? error.message : "Profile update could not be completed.",
        tone: "error"
      });
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: PasswordErrors = {
      currentPassword: currentPassword ? undefined : "Enter your current password.",
      newPassword: newPassword.length >= 6 ? undefined : "New password must be at least 6 characters.",
      confirmPassword: confirmPassword === newPassword ? undefined : "Passwords must match."
    };

    setPasswordErrors(nextErrors);
    if (nextErrors.currentPassword || nextErrors.newPassword || nextErrors.confirmPassword) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      notify({ title: "Password update unavailable", description: "Ask an administrator to finish Supabase setup." });
      return;
    }

    setPasswordLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        setPasswordErrors({ currentPassword: "Current password does not match this account." });
        notify({ title: "Password not updated", description: "Check your current password and try again.", tone: "error" });
        return;
      }

      // Supabase Auth: update the password for the currently signed-in user.
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        notify({ title: "Password update failed", description: error.message, tone: "error" });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
      notify({ title: "Password updated", description: "Use your new password the next time you sign in.", tone: "success" });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Profile and app preferences"
        description="Manage profile details, accessibility options, account settings, and display preferences."
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-[#fbfdff]">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Profile settings</CardTitle>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} />
            </div>
          </div>
          <Button className="mt-4" onClick={saveProfile}>
            Save profile
          </Button>
        </Card>

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
            <Lock className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Manage password</CardTitle>
          </div>
          <CardDescription>Change the password for your signed-in MakaLearn account.</CardDescription>
          <form className="mt-4 space-y-4" onSubmit={updatePassword}>
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setPasswordErrors((current) => ({ ...current, currentPassword: undefined }));
                }}
                aria-invalid={Boolean(passwordErrors.currentPassword)}
                aria-describedby={passwordErrors.currentPassword ? "current-password-error" : undefined}
              />
              <FieldError id="current-password-error" message={passwordErrors.currentPassword} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setPasswordErrors((current) => ({ ...current, newPassword: undefined }));
                  }}
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                  aria-describedby={passwordErrors.newPassword ? "new-password-error" : undefined}
                />
                <FieldError id="new-password-error" message={passwordErrors.newPassword} />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setPasswordErrors((current) => ({ ...current, confirmPassword: undefined }));
                  }}
                  aria-invalid={Boolean(passwordErrors.confirmPassword)}
                  aria-describedby={passwordErrors.confirmPassword ? "confirm-password-error" : undefined}
                />
                <FieldError id="confirm-password-error" message={passwordErrors.confirmPassword} />
              </div>
            </div>
            <Button type="submit" variant="secondary" disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update password"}
            </Button>
          </form>
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
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-skywash p-3">
            <Info className="mt-0.5 h-5 w-5 text-blue-600" aria-hidden="true" />
            <p className="text-sm leading-6 text-slate-600">MakaLearn supports teacher-guided PECS, gesture practice, activities, and admin workflows.</p>
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
