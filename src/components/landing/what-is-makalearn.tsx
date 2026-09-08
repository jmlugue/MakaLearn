"use client";

import Image from "next/image";
import { Reveal } from "@/components/motion/reveal";
import { SquiggleDoodle } from "@/components/landing/landing-doodles";

/** Card and sign pairs. Both files already exist in /public for each word. */
const pairs = [
  {
    word: "Help",
    card: "/pecs/generated_cards/help.png",
    sign: "/gesture-references/help.png",
    signDescription: "A closed hand resting on a flat palm, lifted upward."
  },
  {
    word: "Yes",
    card: "/pecs/generated_cards/yes.png",
    sign: "/gesture-references/yes.png",
    signDescription: "A closed hand nodding forward from the wrist."
  },
  {
    word: "Eat",
    card: "/pecs/generated_cards/eat.png",
    sign: "/gesture-references/eat-food.png",
    signDescription: "Fingers brought together toward the mouth."
  }
];

/** Short phrases taken from the paper's Definition of Terms. */
const terms = [
  { term: "Makaton", text: "Gestures, symbols and speech together", tone: "bg-blue-50 text-blue-700" },
  { term: "PECS", text: "Picture cards for everyday needs", tone: "bg-teal-50 text-accent-teal" },
  { term: "AAC", text: "Support when speech is limited", tone: "bg-amber-50 text-accent-amber" }
];

export function WhatIsMakaLearn() {
  return (
    <section id="what-is" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 py-14 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <Reveal>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">What is MakaLearn</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink sm:text-4xl">
              One word, taught two ways
            </h2>
            <SquiggleDoodle className="mt-3 h-3 w-28 text-accent-teal/40" />
            <p className="mt-5 text-lg leading-8 text-slate-600">
              A web-based Makaton learning support system for teacher-guided instruction in Special Education.
            </p>

            <ul className="mt-6 grid gap-2.5">
              {terms.map((item) => (
                <li key={item.term} className="flex items-center gap-3">
                  <span
                    className={`inline-flex min-w-20 justify-center rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] ${item.tone}`}
                  >
                    {item.term}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-panel rounded-[2rem] border p-5 sm:p-7">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Card and sign</p>
            <ul className="mt-5 space-y-4">
              {pairs.map((pair) => (
                <li
                  key={pair.word}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-xl"
                >
                  <span className="grid h-28 w-24 place-items-center rounded-xl border border-blue-100 bg-white p-2">
                    <Image
                      src={pair.card}
                      alt={`PECS picture card for the word ${pair.word}`}
                      width={200}
                      height={250}
                      className="h-full w-full object-contain"
                    />
                  </span>

                  <p className="text-center text-xl font-black tracking-[-0.02em] text-ink sm:text-2xl">{pair.word}</p>

                  <span className="grid h-28 w-32 place-items-center rounded-xl border border-blue-100 bg-white p-2">
                    <Image
                      src={pair.sign}
                      alt={`Reference drawing of the sign for ${pair.word}. ${pair.signDescription}`}
                      width={280}
                      height={220}
                      className="h-full w-full object-contain"
                    />
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-slate-500">Reference art. Schools use their own approved materials.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
