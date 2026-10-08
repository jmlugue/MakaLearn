import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { AmbientShapes } from "@/components/motion/ambient-shapes";
import { AccountRequestPanel } from "@/features/auth/account-request-panel";

const requestSteps = [
  { icon: CheckCircle2, label: "Send your name and school email" },
  { icon: Clock3, label: "Wait for an admin to review it" },
  { icon: ShieldCheck, label: "Receive access after approval" }
];

export default function RequestAccountPage() {
  return (
    <main className="login-page relative grid min-h-screen place-items-center overflow-hidden px-4 pb-8 pt-20 sm:px-6 md:py-8 lg:h-dvh lg:min-h-0 lg:py-4">
      <div className="login-glow login-glow-one" aria-hidden="true" />
      <div className="login-glow login-glow-two" aria-hidden="true" />
      <Link href="/login" className="absolute left-5 top-5 z-20 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/80 px-4 text-sm font-bold text-slate-700 shadow-sm backdrop-blur hover:bg-white sm:left-8 sm:top-8">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to sign in
      </Link>

      <div className="glass-panel-strong relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border lg:min-h-[620px] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="login-brand-panel relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-500 p-6 text-white sm:p-10 md:p-12 lg:p-14">
          <AmbientShapes light />
          <div className="login-dot-grid" aria-hidden="true" />
          <div className="login-loop" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col">
            <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.2)] sm:h-20 sm:w-20 md:h-28 md:w-28 md:rounded-[1.8rem] lg:h-32 lg:w-32">
              <Image src="/makalearn_logo_current.png" alt="" width={208} height={208} className="h-full w-full scale-125 object-contain object-center" priority />
            </span>
            <p className="mt-5 max-w-md text-base font-semibold leading-7 text-blue-50 md:mt-8 md:text-lg md:leading-8">
              Teacher accounts are reviewed before they can access MakaLearn.
            </p>
            <div className="mt-9 hidden space-y-3 md:block">
              {requestSteps.map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm font-semibold text-white/90">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/12 ring-1 ring-white/20">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="relative grid place-items-center bg-white/40 px-3 py-5 backdrop-blur-2xl sm:px-10 sm:py-10 lg:px-12 lg:py-6">
          <div className="glass-panel-strong w-full max-w-lg rounded-[1.75rem] border px-6 py-7 sm:px-12 md:py-8 lg:py-7">
            <AccountRequestPanel />
          </div>
        </section>
      </div>
    </main>
  );
}
