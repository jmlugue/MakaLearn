"use client";

import { Reveal } from "@/components/motion/reveal";
import { AmbientShapes } from "@/components/motion/ambient-shapes";

/** Counts describe what actually ships in the repo, not usage claims. */
const stats = [
  { value: "50", label: "Picture cards", rule: "border-white/40" },
  { value: "7", label: "Signs with practice", rule: "border-teal-200/70" },
  { value: "5", label: "Classroom tools", rule: "border-amber-200/70" },
  { value: "2", label: "Modes", rule: "border-rose-200/70" }
];

export function ImpactStrip() {
  return (
    <section className="relative z-10 mx-auto max-w-7xl py-4">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 p-6 text-white shadow-[0_28px_70px_rgba(30,64,175,0.28)] sm:p-8">
          <AmbientShapes light />
          <div className="relative z-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className={`border-l-4 pl-4 ${stat.rule}`}>
                <p className="text-4xl font-black tracking-[-0.04em]">{stat.value}</p>
                <p className="mt-1 text-sm font-bold text-blue-50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
