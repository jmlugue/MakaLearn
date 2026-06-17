"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Shield, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";
import { useDemoUser } from "@/features/auth/use-demo-user";
import type { UserRole } from "@/types";

export function LoginPanel() {
  const router = useRouter();
  const { notify } = useToast();
  const { setUserByRole } = useDemoUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);

  function loginAs(role: UserRole) {
    setLoadingRole(role);
    setUserByRole(role);
    notify({
      title: role === "admin" ? "Admin demo loaded" : "Teacher demo loaded",
      description: role === "admin" ? "Opening the admin dashboard." : "Opening the content library.",
      tone: "success"
    });
    window.setTimeout(() => {
      router.push(role === "admin" ? "/dashboard" : "/content");
    }, 300);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      email: email.includes("@") ? undefined : "Enter a valid email address.",
      password: password.length >= 6 ? undefined : "Password must be at least 6 characters."
    };
    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    loginAs("teacher");
  }

  return (
    <Card className="w-full max-w-md overflow-hidden p-0">
      <div className="cue-stripes h-8 border-b border-blue-100" />
      <div className="p-5 sm:p-6">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Local demo login</p>
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
        <a href="#" className="block text-sm font-semibold text-blue-700">
          Forgot password?
        </a>
        <Button className="w-full" type="submit" disabled={loadingRole !== null}>
          <UserRound className="h-4 w-4" aria-hidden="true" />
          Continue as teacher
        </Button>
      </form>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button variant="outline" onClick={() => loginAs("teacher")} disabled={loadingRole !== null}>
          <UserRound className="h-4 w-4" aria-hidden="true" />
          Demo Teacher
        </Button>
        <Button variant="secondary" onClick={() => loginAs("admin")} disabled={loadingRole !== null}>
          <Shield className="h-4 w-4" aria-hidden="true" />
          Demo Admin
        </Button>
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">
        Future Supabase Auth: replace this local role switch with email/password sign-in and profile
        role lookup.
      </p>
      </div>
    </Card>
  );
}
