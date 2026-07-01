import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, Hand, Shapes } from "lucide-react";
import { ToastProvider } from "@/components/common/toast-provider";
import { LoginPanel } from "@/features/auth/login-panel";
import { AmbientShapes } from "@/components/motion/ambient-shapes";

const accountUses = [
  { icon: BookOpenCheck, label: "Manage learning materials" },
  { icon: Hand, label: "Guide practice sessions" },
  { icon: Shapes, label: "Create classroom activities" }
];

export default function LoginPage() {
  return (
    <ToastProvider>
      <main className="login-page relative grid min-h-screen place-items-center overflow-hidden px-4 py-8 sm:px-6">
        <div className="login-glow login-glow-one" aria-hidden="true" />
        <div className="login-glow login-glow-two" aria-hidden="true" />
        <Link href="/" className="absolute left-5 top-5 z-20 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/80 px-4 text-sm font-bold text-slate-700 shadow-sm backdrop-blur hover:bg-white sm:left-8 sm:top-8">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to home
        </Link>

        <div className="glass-panel-strong relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border lg:min-h-[620px] lg:grid-cols-[0.95fr_1.05fr]">
          <section className="login-brand-panel relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-500 p-8 text-white sm:p-12 lg:p-14">
            <AmbientShapes light />
            <div className="login-dot-grid" aria-hidden="true" />
            <div className="login-loop" aria-hidden="true" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center">
                <span className="grid h-28 w-28 place-items-center overflow-hidden rounded-[1.8rem] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.2)] sm:h-32 sm:w-32">
                  <Image src="/makalearn_logo_current.png" alt="" width={208} height={208} className="h-full w-full scale-125 object-contain object-center" priority />
                </span>
              </div>
              <p className="mt-8 max-w-md text-lg font-semibold leading-8 text-blue-50">
                Your classroom materials and guided practice tools, ready for the next session.
              </p>
              <div className="mt-9 space-y-3">
                {accountUses.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 text-sm font-semibold text-white/90">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/12 ring-1 ring-white/20"><item.icon className="h-5 w-5" /></span>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className="relative grid place-items-center bg-white/40 px-5 py-10 backdrop-blur-2xl sm:px-10 lg:px-12">
            <div className="glass-panel-strong w-full max-w-lg rounded-[1.75rem] border px-12 py-8 sm:px-16 sm:py-10">
              <LoginPanel />
            </div>
          </section>
        </div>
      </main>
    </ToastProvider>
  );
}
