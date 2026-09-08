"use client";

import { Camera, ClipboardCheck, Library, Presentation } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { ArrowDoodle } from "@/components/landing/landing-doodles";

/**
 * One word per step. The phrase under it is capped at four words: the sequence
 * should be readable at a glance, not read.
 */
const steps = [
  { word: "Prepare", hint: "Pick cards and signs", icon: Library, tile: "bg-blue-50 text-blue-600" },
  { word: "Teach", hint: "Guide the session", icon: Presentation, tile: "bg-teal-50 text-accent-teal" },
  { word: "Practice", hint: "Learner signs on camera", icon: Camera, tile: "bg-amber-50 text-accent-amber" },
  { word: "Review", hint: "Adjust for next time", icon: ClipboardCheck, tile: "bg-rose-50 text-accent-coral" }
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 py-14 lg:py-16">
      <div className="session-pencil" aria-hidden="true" />

      <Reveal>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">How it works</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink sm:text-4xl">Four steps</h2>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="session-board glass-panel relative mt-8 overflow-hidden rounded-[2rem] border p-6 sm:p-8">
          <div className="session-rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={step.word}
                className="session-step relative rounded-2xl border border-white/80 bg-white/70 p-5 text-center shadow-sm backdrop-blur-xl"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl shadow-inner ${step.tile}`}>
                  <step.icon className="h-8 w-8" aria-hidden="true" />
                </span>
                <p className="mt-4 text-xl font-black tracking-[-0.02em] text-ink">{step.word}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{step.hint}</p>
                <span className="absolute right-3 top-3 text-xs font-black text-blue-200">{index + 1}</span>

                {index < steps.length - 1 ? (
                  <ArrowDoodle className="pointer-events-none absolute -right-4 top-10 hidden h-6 w-11 text-blue-200 xl:block" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}
