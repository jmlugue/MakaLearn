"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { insertAuditLog } from "@/lib/audit-logs";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { clearStudentModePreference } from "@/features/student-mode/student-mode-context";
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
    if (!supabase) throw new Error("Sign in is not available yet.");

    const { data, error } = await supabase
      .from("profiles")
      .select("id,name,email,role,status")
      .eq("id", userId)
      .single();

    if (error || !data) {
      throw new Error("This account does not have a MakaLearn profile yet.");
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
      notify({ title: "Sign in unavailable", description: "Ask an administrator to finish account setup." });
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
      clearStudentModePreference();
      router.replace(profile.role === "admin" ? "/admin" : "/content");
    } catch {
      await supabase.auth.signOut();
      notify({
        title: "Profile missing",
        description: "Ask an administrator to finish this account."
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
      notify({ title: "Password reset unavailable", description: "Ask an administrator to finish account setup." });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    notify({
      title: error ? "Reset email failed" : "Password reset email sent",
      description: error ? "Password reset could not be started. Try again." : "Check the email inbox configured for this account.",
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
    <div className="w-full">
      <div className="mb-9">
        <p className="text-base font-bold text-blue-600">Welcome back</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] text-ink">Sign in to your account</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Enter your school email and password to continue.
        </p>
      </div>
      <form className="space-y-5" onSubmit={handleSubmit}>
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
          <Label htmlFor="email" className={cn("text-base", emailHasError && "text-red-700")}>
            Email
          </Label>
          <div className="relative mt-1">
            <span
              className={cn(
                "pointer-events-none absolute left-4 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)] ring-1 ring-blue-300",
                emailHasError && "bg-red-500"
              )}
              aria-hidden="true"
            >
              <Mail className="h-5 w-5" />
            </span>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => handleEmailChange(event.target.value)}
              placeholder="teacher@makalearn.local"
              className={cn("min-h-14 bg-white/95 pl-16 pr-10 text-base shadow-[0_12px_30px_rgba(37,99,235,0.08)]", emailHasError && errorInputClass)}
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
          <Label htmlFor="password" className={cn("text-base", passwordHasError && "text-red-700")}>
            Password
          </Label>
          <div className="relative mt-1">
            <span
              className={cn(
                "pointer-events-none absolute left-4 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)] ring-1 ring-blue-300",
                passwordHasError && "bg-red-500"
              )}
              aria-hidden="true"
            >
              <Lock className="h-5 w-5" />
            </span>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => handlePasswordChange(event.target.value)}
              placeholder="At least 6 characters"
              className={cn("min-h-14 bg-white/95 pl-16 pr-10 text-base shadow-[0_12px_30px_rgba(37,99,235,0.08)]", passwordHasError && errorInputClass)}
              aria-invalid={passwordHasError}
              aria-describedby={passwordDescription || undefined}
            />
            {passwordHasError ? (
              <AlertCircle className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-red-500" aria-hidden="true" />
            ) : null}
          </div>
          <FieldError id="password-error" message={errors.password} />
        </div>
        <button type="button" onClick={resetPassword} className="block text-base font-semibold text-blue-700">
          Forgot password?
        </button>
        <Button className="w-full text-base" type="submit" disabled={loading}>
          <UserRound className="h-4 w-4" aria-hidden="true" />
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
