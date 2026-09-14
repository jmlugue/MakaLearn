"use client";

import { FormEvent, useEffect, useState } from "react";
import { Lock, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { updateProfileDetails } from "@/lib/supabase/app-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PasswordErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export function ProfileView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [profileName, setProfileName] = useState(user.name);
  const [profileEmail, setProfileEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    setProfileName(user.name);
    setProfileEmail(user.email);
  }, [user]);

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
      <PageHeader eyebrow="Profile" title="Your account" description="Update your details and password." />
      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-[#fbfdff]">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Profile details</CardTitle>
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
      </section>
    </>
  );
}
