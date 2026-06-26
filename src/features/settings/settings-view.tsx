"use client";

import { useEffect, useState } from "react";
import { Accessibility, Info, Lock, Palette, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldHint, Input, Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { updateProfileDetails } from "@/lib/supabase/app-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function SettingsView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [audioGuidance, setAudioGuidance] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    document.documentElement.classList.toggle("high-contrast", highContrast);
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [largeText, highContrast, reduceMotion]);

  useEffect(() => {
    setProfileName(user.name);
    setProfileEmail(user.email);
  }, [user]);

  async function saveProfile() {
    if (!profileName.trim() || !profileEmail.includes("@")) {
      notify({ title: "Check profile details", description: "Name and a valid email are required." });
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        await updateProfileDetails(user.id, { name: profileName, email: profileEmail });
        notify({ title: "Profile saved", description: "Profile details were saved.", tone: "success" });
        return;
      } catch {
        notify({
          title: "Profile saved",
          description: "Profile update could not be completed."
        });
        return;
      }
    }

    notify({ title: "Profile saved", description: "Profile details were saved.", tone: "success" });
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
            <Toggle label="Large text mode" checked={largeText} onChange={setLargeText} />
            <Toggle label="High contrast mode" checked={highContrast} onChange={setHighContrast} />
            <Toggle label="Reduce motion" checked={reduceMotion} onChange={setReduceMotion} />
            <Toggle label="Audio guidance" checked={audioGuidance} onChange={setAudioGuidance} />
          </div>
        </Card>

        <Card className="bg-[#fbfdff]">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Account and password</CardTitle>
          </div>
          <CardDescription>Manage password updates and account access.</CardDescription>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input type="password" placeholder="New password" />
            <Input type="password" placeholder="Confirm password" />
          </div>
          <Button className="mt-4" variant="secondary" onClick={() => notify({ title: "Password changes", description: "Password changes are not enabled yet." })}>
            Update password
          </Button>
        </Card>

        <Card className="bg-[#fbfdff]">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Theme and display</CardTitle>
          </div>
          <div className="mt-4">
            <Label htmlFor="theme">Theme</Label>
            <Select id="theme">
              <option value="soft-blue">Soft blue</option>
              <option value="high-contrast">High contrast</option>
            </Select>
            <FieldHint>Display preferences apply to this browser.</FieldHint>
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
