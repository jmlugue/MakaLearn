import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Hand,
  Headphones,
  ListChecks,
  Play,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    icon: BookOpen,
    title: "Keep classroom content together",
    text: "Organise picture cards, gesture references, audio, lessons, and activities in one shared library."
  },
  {
    icon: Hand,
    title: "Practise with live guidance",
    text: "Use the webcam hand outline during guided gesture practice and give feedback while the learner tries."
  },
  {
    icon: ListChecks,
    title: "Prepare activities quickly",
    text: "Build any supported activity type from your learning items, then review it before using it in class."
  }
];

const sessionSteps = [
  { icon: BookOpen, label: "Review today’s cards", meta: "3 items" },
  { icon: Hand, label: "Guided gesture practice", meta: "5 min" },
  { icon: Play, label: "Run a short activity", meta: "Ready" }
];

export default function LandingPage() {
  return (
    <main className="landing-page relative min-h-screen overflow-hidden px-4 pb-16 pt-5 md:px-8">
      <div className="landing-orb landing-orb-one" aria-hidden="true" />
      <div className="landing-orb landing-orb-two" aria-hidden="true" />
      <div className="landing-dot-field" aria-hidden="true" />
      <div className="landing-ribbon" aria-hidden="true" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-blue-100/80 py-3">
        <Link href="/" className="inline-flex items-center gap-3" aria-label="MakaLearn home">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(37,99,235,0.14)]">
            <Image src="/makalearn_logo.png" alt="" width={56} height={56} className="h-full w-full object-contain p-1.5" priority />
          </span>
          <span className="text-xl font-black tracking-[-0.03em] text-ink">MakaLearn</span>
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
        >
          Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 py-14 lg:min-h-[700px] lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
        <div>
          <div className="flex items-center gap-4">
            <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_55px_rgba(37,99,235,0.16)] sm:h-24 sm:w-24">
              <Image src="/makalearn_logo.png" alt="MakaLearn logo" width={112} height={112} className="h-full w-full object-contain p-2" priority />
            </span>
            <h1 className="text-5xl font-black tracking-[-0.055em] text-ink sm:text-6xl lg:text-7xl">MakaLearn</h1>
          </div>
          <p className="mt-7 max-w-xl text-xl font-semibold leading-8 text-slate-700">
            Plan, teach, and practise communication skills in one classroom workspace.
          </p>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
            Made for teachers who need a simple way to organise learning materials, guide activities, and support each session.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex">
              <Button size="lg" className="w-full sm:w-auto">
                Sign in to MakaLearn <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/help" className="inline-flex">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                See how it works
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-teal-600" /> Shared teacher library</span>
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-teal-600" /> Classroom-friendly controls</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:mx-0">
          <div className="session-board relative overflow-hidden rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_30px_90px_rgba(29,78,216,0.16)] backdrop-blur md:p-7">
            <div className="flex flex-col gap-5 border-b border-blue-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-blue-600">Tuesday, 9:30 AM</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em] text-ink">Morning communication session</h2>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-blue-600 shadow-sm"><UsersRound className="h-5 w-5" /></span>
                <div><p className="text-xs font-semibold text-slate-500">Learner</p><p className="font-bold text-ink">Demo mode</p></div>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {sessionSteps.map((step, index) => (
                <div key={step.label} className="session-step flex items-center gap-4 rounded-2xl border border-blue-100 bg-[#f8fbff] p-4" style={{ animationDelay: `${index * 100}ms` }}>
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${index === 1 ? "bg-teal-100 text-teal-700" : "bg-white text-blue-600 shadow-sm"}`}>
                    <step.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{step.label}</p>
                    <p className="mt-0.5 text-sm text-slate-500">Step {index + 1} of 3</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-sm">{step.meta}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-blue-600 p-5 text-white">
                <Headphones className="h-6 w-6" aria-hidden="true" />
                <p className="mt-4 text-sm text-blue-100">Materials ready</p>
                <p className="mt-1 text-xl font-black">Images and audio</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-5">
                <ShieldCheck className="h-6 w-6 text-teal-600" aria-hidden="true" />
                <p className="mt-4 text-sm text-slate-500">Teacher controlled</p>
                <p className="mt-1 text-xl font-black text-ink">Review before use</p>
              </div>
            </div>
          </div>
          <div className="session-pencil" aria-hidden="true" />
          <div className="session-rings" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl border-t border-blue-100 py-12">
        <p className="max-w-2xl text-sm font-bold uppercase tracking-[0.16em] text-blue-600">Built around the classroom day</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-3xl border border-blue-100 bg-white/80 p-6 shadow-[0_14px_38px_rgba(37,99,235,0.07)] backdrop-blur">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><item.icon className="h-6 w-6" aria-hidden="true" /></span>
              <h2 className="mt-5 text-lg font-black text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
