"use client";

import { useEffect, useState } from "react";
import { Accessibility, Info, Lock, Palette, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldHint, Input, Label, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useDemoUser } from "@/features/auth/use-demo-user";

export function SettingsView() {
  const { user } = useDemoUser();
  const { notify } = useToast();
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [audioGuidance, setAudioGuidance] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("large-text", largeText);
    document.documentElement.classList.toggle("high-contrast", highContrast);
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [largeText, highContrast, reduceMotion]);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Profile and app preferences"
        description="Manage local profile details, accessibility options, account placeholders, and display preferences."
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
              <Input id="profile-name" defaultValue={user.name} />
            </div>
            <div>
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" defaultValue={user.email} />
            </div>
          </div>
          <Button className="mt-4" onClick={() => notify({ title: "Profile saved", description: "This updates local form state only.", tone: "success" })}>
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
          <CardDescription>Future Supabase Auth: password reset and email updates will connect here.</CardDescription>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input type="password" placeholder="New password" />
            <Input type="password" placeholder="Confirm password" />
          </div>
          <Button className="mt-4" variant="secondary" onClick={() => notify({ title: "Password placeholder", description: "Password changes will be enabled with Supabase Auth." })}>
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
            <FieldHint>Display preferences are local until account settings are connected.</FieldHint>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-skywash p-3">
            <Info className="mt-0.5 h-5 w-5 text-blue-600" aria-hidden="true" />
            <p className="text-sm leading-6 text-slate-600">MakaLearn uses local demo data until backend integration is connected.</p>
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
