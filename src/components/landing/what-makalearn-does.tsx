"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Hand, Images, Library, ListChecks, Shapes, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { StarDoodle } from "@/components/landing/landing-doodles";

/** The three pillars map one to one onto the paper's three specific objectives. */
const pillars = [
  {
    icon: Images,
    title: "Symbols",
    text: "Explore cards, match words, build simple sentences.",
    tile: "bg-blue-50 text-blue-600",
    rule: "before:bg-blue-500"
  },
  {
    icon: Hand,
    title: "Gestures",
    text: "Practice signs on camera and get feedback.",
    tile: "bg-teal-50 text-accent-teal",
    rule: "before:bg-teal-500"
  },
  {
    icon: Library,
    title: "Content",
    text: "One shared library teachers keep up to date.",
    tile: "bg-amber-50 text-accent-amber",
    rule: "before:bg-amber-500"
  }
];

const alsoInside = [
  { icon: Shapes, label: "Sentence playground" },
  { icon: ListChecks, label: "Activities" },
  { icon: ShieldCheck, label: "Admin oversight" }
];

export function WhatMakaLearnDoes() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="what-it-does" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 py-14 lg:py-16">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-600">What MakaLearn does</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink sm:text-4xl">Three things, one place</h2>
          </div>
          <StarDoodle className="hidden h-9 w-9 text-accent-amber/50 sm:block" />
        </div>
      </Reveal>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {pillars.map((pillar, index) => (
          <Reveal key={pillar.title} delay={index * 0.08} className="h-full">
            <motion.article
              whileHover={reduceMotion ? undefined : { y: -7 }}
              transition={{ type: "spring", stiffness: 320, damping: 25 }}
              className={`glass-panel interactive-card relative h-full overflow-hidden rounded-3xl border p-6 before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:content-[''] ${pillar.rule}`}
            >
              <span className={`grid h-14 w-14 place-items-center rounded-2xl shadow-inner ${pillar.tile}`}>
                <pillar.icon className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.02em] text-ink">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{pillar.text}</p>
            </motion.article>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.24}>
        <ul className="mt-5 flex flex-wrap gap-2">
          {alsoInside.map((item) => (
            <li
              key={item.label}
              className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/65 px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm backdrop-blur"
            >
              <item.icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
