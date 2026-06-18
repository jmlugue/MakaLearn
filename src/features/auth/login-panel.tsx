"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { AppUser } from "@/types";

export function LoginPanel() {
  const router = useRouter();
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  async function getSignedInProfile(userId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) throw new Error("Supabase is not configured.");

    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,email,role,status")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new Error("This Auth account does not have a MakaLearn profile yet.");
    }

    return data as Pick<AppUser, "id" | "name" | "email" | "role" | "status">;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      email: email.includes("@") ? undefined : "Enter a valid email address.",
      password: password.length >= 6 ? undefined : "Password must be at least 6 characters."
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;

    if (!isSupabaseConfigured()) {
      notify({ title: "Supabase setup required", description: "Add your Supabase URL and anon key to .env.local before signing in." });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setLoading(false);
      notify({ title: "Sign in failed", description: error?.message ?? "Check the account email and password." });
      return;
    }

    try {
      const profile = await getSignedInProfile(data.user.id);
      notify({
        title: "Signed in",
        description: profile.role === "admin" ? "Opening the admin dashboard." : "Opening the content library.",
        tone: "success"
      });
      router.push(profile.role === "admin" ? "/dashboard" : "/content");
    } catch (profileError) {
      await supabase.auth.signOut();
      notify({
        title: "Profile missing",
        description: profileError instanceof Error ? profileError.message : "Create a row in profiles for this Auth user."
      });
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!email.includes("@")) {
      setErrors((current) => ({ ...current, email: "Enter your account email first." }));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      notify({ title: "Supabase setup required", description: "Add your Supabase URL and anon key to .env.local first." });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    notify({
      title: error ? "Reset email failed" : "Password reset email sent",
      description: error?.message ?? "Check the email inbox configured for this account.",
      tone: error ? "info" : "success"
    });
  }

  return (
    <Card className="w-full max-w-md overflow-hidden p-0">
      <div className="cue-stripes h-8 border-b border-blue-100" />
      <div className="p-5 sm:p-6">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Account sign in</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Sign in to MakaLearn</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Learners do not have logins in this MVP. Teachers select learner profiles during class.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="email">Email</Label>
          <div className="relative mt-1">
            <Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teacher@makalearn.local"
              className="pl-10"
            />
          </div>
          <FieldError message={errors.email} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <div className="relative mt-1">
            <Lock className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              className="pl-10"
            />
          </div>
          <FieldError message={errors.password} />
        </div>
        <button type="button" onClick={resetPassword} className="block text-sm font-semibold text-blue-700">
          Forgot password?
        </button>
        <Button className="w-full" type="submit" disabled={loading}>
          <UserRound className="h-4 w-4" aria-hidden="true" />
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-xs leading-5 text-slate-500">
        Use the teacher or admin account created in Supabase Auth. Roles are read from the profiles table.
      </p>
      </div>
    </Card>
  );
}
