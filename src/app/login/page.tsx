import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ToastProvider } from "@/components/common/toast-provider";
import { LoginPanel } from "@/features/auth/login-panel";

export default function LoginPage() {
  return (
    <ToastProvider>
      <main className="grid min-h-screen place-items-center px-4 py-8">
        <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1fr]">
          <div className="rounded-lg border border-blue-100 bg-white/80 p-5 shadow-soft backdrop-blur sm:p-7">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-900/20">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-2xl font-bold text-ink">MakaLearn</span>
            </Link>
            <h2 className="mt-8 max-w-lg text-4xl font-bold leading-tight text-ink">
              Local role demos today, Supabase Auth ready later.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              The MVP uses local state for admin and teacher testing. Learner profiles are selected
              inside teacher-guided classroom workflows.
            </p>
          </div>
          <LoginPanel />
        </div>
      </main>
    </ToastProvider>
  );
}
