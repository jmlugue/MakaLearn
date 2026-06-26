"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { insertAuditLog } from "@/lib/audit-logs";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types";

export function LoginPanel() {
  const router = useRouter();
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
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
    setFormError("");
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
      const message =
        error?.message === "Invalid login credentials"
          ? "The email or password does not match a MakaLearn account."
          : error?.message ?? "Check the account email and password.";
      setFormError(message);
      notify({ title: "Sign in failed", description: message, tone: "error" });
      return;
    }

    try {
      const profile = await getSignedInProfile(data.user.id);
      await insertAuditLog({
        category: "auth",
        action: "login",
        actor: profile,
        targetType: "session",
        targetTitle: "Sign in",
        detail: `${profile.name} signed in.`
      }).catch(() => undefined);
      notify({
        title: "Signed in",
        description: profile.role === "admin" ? "Opening the admin panel." : "Opening the content library.",
        tone: "success"
      });
      router.push(profile.role === "admin" ? "/admin" : "/content");
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
    setFormError("");
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
      tone: error ? "error" : "success"
    });
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    setFormError("");
    if (errors.email) {
      setErrors((current) => ({ ...current, email: undefined }));
    }
  }

  function handlePasswordChange(value: string) {
    setPassword(value);
    setFormError("");
    if (errors.password) {
      setErrors((current) => ({ ...current, password: undefined }));
    }
  }

  const emailHasError = Boolean(errors.email || formError);
  const passwordHasError = Boolean(errors.password || formError);
  const errorInputClass =
    "border-red-300 bg-red-50/50 text-red-950 focus:border-red-500 focus:ring-red-100";
  const emailDescription = [errors.email ? "email-error" : "", formError ? "login-error" : ""]
    .filter(Boolean)
    .join(" ");
  const passwordDescription = [errors.password ? "password-error" : "", formError ? "login-error" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <Card className="w-full max-w-md border-0 bg-white p-0 shadow-none">
      <div>
      <div className="mb-6">
        <p className="text-sm font-bold text-blue-600">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-ink">Sign in to your account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Enter your school email and password to continue.
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {formError ? (
          <div
            id="login-error"
            role="alert"
            className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-900"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">Check your sign in details</p>
              <p className="mt-1 leading-5">{formError}</p>
            </div>
          </div>
        ) : null}
        <div>
          <Label htmlFor="email" className={emailHasError ? "text-red-700" : undefined}>
            Email
          </Label>
          <div className="relative mt-1">
            <Mail
              className={cn(
                "pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400",
                emailHasError && "text-red-500"
              )}
              aria-hidden="true"
            />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => handleEmailChange(event.target.value)}
              placeholder="teacher@makalearn.local"
              className={cn("pl-10 pr-10", emailHasError && errorInputClass)}
              aria-invalid={emailHasError}
              aria-describedby={emailDescription || undefined}
            />
            {emailHasError ? (
              <AlertCircle className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-red-500" aria-hidden="true" />
            ) : null}
          </div>
          <FieldError id="email-error" message={errors.email} />
        </div>
        <div>
          <Label htmlFor="password" className={passwordHasError ? "text-red-700" : undefined}>
            Password
          </Label>
          <div className="relative mt-1">
            <Lock
              className={cn(
                "pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400",
                passwordHasError && "text-red-500"
              )}
              aria-hidden="true"
            />
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => handlePasswordChange(event.target.value)}
              placeholder="At least 6 characters"
              className={cn("pl-10 pr-10", passwordHasError && errorInputClass)}
              aria-invalid={passwordHasError}
              aria-describedby={passwordDescription || undefined}
            />
            {passwordHasError ? (
              <AlertCircle className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-red-500" aria-hidden="true" />
            ) : null}
          </div>
          <FieldError id="password-error" message={errors.password} />
        </div>
        <button type="button" onClick={resetPassword} className="block text-sm font-semibold text-blue-700">
          Forgot password?
        </button>
        <Button className="w-full" type="submit" disabled={loading}>
          <UserRound className="h-4 w-4" aria-hidden="true" />
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
        Teachers open the content library. Administrators open the admin dashboard.
      </p>
      </div>
    </Card>
  );
}
