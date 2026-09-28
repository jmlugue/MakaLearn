"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, Mail, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/form";
import { useToast } from "@/components/common/toast-provider";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccountRequestPanel() {
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      name: name.trim().length >= 2 ? undefined : "Enter your full name.",
      email: EMAIL_PATTERN.test(email.trim()) ? undefined : "Enter a valid school email address."
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.email) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/account-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Your request could not be sent.");

      setSent(true);
      notify({ title: "Request sent", description: "An admin will review your request.", tone: "success" });
    } catch (error) {
      notify({
        title: "Request not sent",
        description: error instanceof Error ? error.message : "Try again.",
        tone: "error"
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <p className="mt-5 text-base font-bold text-emerald-700">Request sent</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] text-ink">Your account is awaiting review</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          A MakaLearn admin will approve or reject your request. If approved, they will share your temporary password privately.
        </p>
        <Link href="/login" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
        </Link>
      </div>
    );
  }

  const fieldClass = "min-h-14 border-slate-200 bg-slate-50/80 pl-11 text-base shadow-none hover:border-blue-300 focus:border-blue-400 focus:bg-white";

  return (
    <div className="w-full">
      <div className="mb-7">
        <p className="text-base font-bold text-blue-600">Request access</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] text-ink">Create a teacher account</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Send your details to a MakaLearn admin for approval.
        </p>
      </div>

      <form className="space-y-4" onSubmit={submit}>
        <div>
          <Label htmlFor="request-name" className="text-base">Full name</Label>
          <div className="relative mt-1">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-blue-400" aria-hidden="true" />
            <Input
              id="request-name"
              value={name}
              autoComplete="name"
              onChange={(event) => {
                setName(event.target.value);
                setErrors((current) => ({ ...current, name: undefined }));
              }}
              className={fieldClass}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "request-name-error" : undefined}
            />
          </div>
          <FieldError id="request-name-error" message={errors.name} />
        </div>

        <div>
          <Label htmlFor="request-email" className="text-base">School email</Label>
          <div className="relative mt-1">
            <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-blue-400" aria-hidden="true" />
            <Input
              id="request-email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({ ...current, email: undefined }));
              }}
              className={fieldClass}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "request-email-error" : undefined}
            />
          </div>
          <FieldError id="request-email-error" message={errors.email} />
        </div>

        <Button className="w-full text-base" type="submit" disabled={submitting}>
          <Send className="h-4 w-4" aria-hidden="true" />
          {submitting ? "Sending..." : "Send account request"}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-blue-700 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
