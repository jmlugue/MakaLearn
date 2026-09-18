"use client";

import { FormEvent, InputHTMLAttributes, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { updateProfileDetails } from "@/lib/supabase/app-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)).toUpperCase();
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ProfileView() {
  const { user, refreshProfile } = useAuthUser();
  const { notify } = useToast();
  const [profileName, setProfileName] = useState(user.name);
  const [nameError, setNameError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setProfileName(user.name);
  }, [user.name]);

  const nameChanged = profileName.trim() !== user.name;
  // Update password stays disabled until all three fields have something in them.
  const passwordFormFilled = Boolean(currentPassword && newPassword && confirmPassword);

  async function saveProfile() {
    if (!profileName.trim()) {
      setNameError("Enter your name.");
      return;
    }

    setSavingProfile(true);
    try {
      // Email is managed by administrators, so the current value is sent back unchanged.
      await updateProfileDetails(user.id, { name: profileName.trim(), email: user.email });
      await refreshProfile();
      notify({ title: "Profile saved", tone: "success" });
    } catch (error) {
      notify({
        title: "Profile not saved",
        description: error instanceof Error ? error.message : "Profile update could not be completed.",
        tone: "error"
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: PasswordErrors = {
      currentPassword: currentPassword ? undefined : "Enter your current password.",
      newPassword:
        newPassword.length < 8
          ? "Use at least 8 characters."
          : newPassword === currentPassword
            ? "Choose a password different from your current one."
            : undefined,
      confirmPassword: confirmPassword === newPassword ? undefined : "Passwords do not match."
    };

    setPasswordErrors(nextErrors);
    if (nextErrors.currentPassword || nextErrors.newPassword || nextErrors.confirmPassword) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      notify({ title: "Password update unavailable", description: "Ask an administrator to finish account setup." });
      return;
    }

    setPasswordLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        setPasswordErrors({ currentPassword: "Current password is incorrect." });
        return;
      }

      // Supabase Auth: update the password for the currently signed-in user.
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        notify({ title: "Password not updated", description: error.message, tone: "error" });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
      notify({ title: "Password updated", description: "Use it the next time you sign in.", tone: "success" });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" icon={UserRound} />

      {/* Grid items stretch by default, so both cards stay the same height. */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col bg-[#fbfdff]">
          <div className="flex flex-wrap items-center gap-3 border-b border-blue-100 pb-5">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-600 text-lg font-black text-white">
              {initialsOf(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-ink">{user.name}</p>
              <p className="truncate text-sm text-slate-600">{user.email}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-blue-100 text-blue-700">{titleCase(user.role)}</Badge>
              <Badge className={user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}>
                {titleCase(user.status)}
              </Badge>
            </div>
          </div>

          {/* Cancel / Save sit on the title row so editing the name never changes the card height. */}
          <div className="mt-5 flex min-h-9 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-blue-600" aria-hidden="true" />
              <CardTitle>Details</CardTitle>
            </div>
            <AnimatePresence initial={false}>
              {nameChanged ? (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="flex gap-2"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProfileName(user.name);
                      setNameError("");
                    }}
                    disabled={savingProfile}
                  >
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={saveProfile} disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save"}
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="mt-4 grid gap-4">
            <div>
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(event) => {
                  setProfileName(event.target.value);
                  setNameError("");
                }}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? "profile-name-error" : undefined}
              />
              <FieldError id="profile-name-error" message={nameError} />
            </div>
            <div>
              <Label htmlFor="profile-email">Email</Label>
              <div className="relative">
                {/* z-10: the Input's backdrop blur creates a layer that would otherwise hide the icon. */}
                <Mail className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  id="profile-email"
                  value={user.email}
                  readOnly
                  className="cursor-default border-slate-200 bg-slate-50 pl-9 text-slate-500 hover:border-slate-200 focus:border-slate-300 focus:bg-slate-50 focus:shadow-none focus:ring-0"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col bg-[#fbfdff]">
          <div className="flex min-h-9 items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Password</CardTitle>
          </div>
          <CardDescription className="mt-1">Use at least 8 characters.</CardDescription>
          {/* flex-1 + mt-auto keeps the button pinned to the bottom when the cards stretch to equal height. */}
          <form className="mt-4 flex flex-1 flex-col gap-4" onSubmit={updatePassword}>
            <PasswordField
              id="current-password"
              label="Current password"
              value={currentPassword}
              error={passwordErrors.currentPassword}
              autoComplete="current-password"
              onValueChange={(value) => {
                setCurrentPassword(value);
                setPasswordErrors((current) => ({ ...current, currentPassword: undefined }));
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField
                id="new-password"
                label="New password"
                value={newPassword}
                error={passwordErrors.newPassword}
                autoComplete="new-password"
                onValueChange={(value) => {
                  setNewPassword(value);
                  setPasswordErrors((current) => ({ ...current, newPassword: undefined }));
                }}
              />
              <PasswordField
                id="confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                error={passwordErrors.confirmPassword}
                autoComplete="new-password"
                onValueChange={(value) => {
                  setConfirmPassword(value);
                  setPasswordErrors((current) => ({ ...current, confirmPassword: undefined }));
                }}
              />
            </div>
            <Button type="submit" className="mt-auto self-start" disabled={passwordLoading || !passwordFormFilled}>
              {passwordLoading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </Card>
      </section>
    </>
  );
}

function PasswordField({
  id,
  label,
  value,
  error,
  onValueChange,
  ...props
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onValueChange: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange" | "type">) {
  const errorId = `${id}-error`;

  // Always masked on this page (no show/hide toggle), at the user's request.
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={cn(error && "border-red-300 bg-red-50/50")}
        {...props}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}
