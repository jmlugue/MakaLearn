"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Hand, Images, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { AmbientShapes } from "@/components/motion/ambient-shapes";
import { SigningKids } from "@/components/landing/signing-kids";
import { UnderlineDoodle } from "@/components/landing/landing-doodles";
import { WhatIsMakaLearn } from "@/components/landing/what-is-makalearn";
import { WhatMakaLearnDoes } from "@/components/landing/what-makalearn-does";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ImpactStrip } from "@/components/landing/impact-strip";
import { LandingFooter } from "@/components/landing/landing-footer";

const LearningScene = dynamic(
  () => import("@/components/motion/learning-scene").then((module) => module.LearningScene),
  {
    ssr: false,
    loading: () => <div className="h-[430px] animate-pulse rounded-[2rem] border border-white/70 bg-white/45 sm:h-[520px]" />
  }
);

const navLinks = [
  { href: "#what-is", label: "What is MakaLearn" },
  { href: "#what-it-does", label: "What it does" },
  { href: "#how-it-works", label: "How it works" }
];

const heroPills = [
  { icon: Images, label: "Cards and signs", tone: "text-blue-600" },
  { icon: Hand, label: "Camera practice", tone: "text-accent-teal" },
  { icon: Tablet, label: "Runs on a tablet", tone: "text-accent-amber" }
];

export default function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-page relative min-h-screen overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-blue-600 focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to main content
      </a>

      <AmbientShapes />
      <div className="landing-orb landing-orb-one" aria-hidden="true" />
      <div className="landing-orb landing-orb-two" aria-hidden="true" />
      <div className="landing-dot-field" aria-hidden="true" />

      <header className="sticky top-0 z-40 border-b border-blue-100/70 bg-white/70 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="MakaLearn home">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white p-0.5 shadow-[0_8px_24px_rgba(37,99,235,0.14)]">
              <Image
                src="/makalearn_logo_current.png"
                alt=""
                width={128}
                height={128}
                className="h-full w-full scale-125 object-contain object-center"
                priority
              />
            </span>
            <span className="text-xl font-black tracking-[-0.04em] text-ink">MakaLearn</span>
          </Link>

          <div className="flex items-center gap-1">
            <ul className="hidden items-center gap-1 lg:flex">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-white/80 hover:text-blue-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:shadow-[0_14px_30px_rgba(37,99,235,0.3)]"
            >
              Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </nav>
      </header>

      <main id="main-content" className="relative px-4 pb-12 md:px-8">
        <section className="relative mx-auto grid max-w-7xl items-center gap-10 py-10 lg:min-h-[640px] lg:grid-cols-[0.95fr_1.05fr] lg:py-14">
          <div className="hero-mesh" aria-hidden="true" />
          <span className="floating-cue cue-two" aria-hidden="true">
            Thank you
          </span>

          <motion.div
            className="relative z-10"
            initial={reduceMotion ? false : { opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-3">
              <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-[0_14px_38px_rgba(37,99,235,0.16)] sm:h-20 sm:w-20">
                <Image
                  src="/makalearn_logo_current.png"
                  alt="MakaLearn logo"
                  width={160}
                  height={160}
                  className="h-full w-full scale-125 object-contain object-center"
                  priority
                />
              </span>
              <span className="text-3xl font-black tracking-[-0.05em] text-ink sm:text-4xl">MakaLearn</span>
            </div>

            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-[-0.045em] text-ink sm:text-5xl">
              Teacher-guided{" "}
              <span className="relative inline-block whitespace-nowrap text-blue-700">
                Makaton
                <UnderlineDoodle className="absolute -bottom-2 left-0 h-3 w-full text-accent-teal/50" />
              </span>
              , in one place.
            </h1>

            <p className="mt-6 max-w-md text-lg font-medium leading-8 text-slate-600">
              Symbols, signs and camera practice, ready for the next session.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex">
                <Button size="lg" className="w-full sm:w-auto">
                  Sign in to MakaLearn <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Button>
              </Link>
              <Link href="#how-it-works" className="inline-flex">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  See how it works
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-sm text-slate-500">Accounts are issued by your school administrator.</p>

            <ul className="mt-7 flex flex-wrap gap-2">
              {heroPills.map((pill) => (
                <li
                  key={pill.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/65 px-3.5 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur"
                >
                  <pill.icon className={`h-4 w-4 ${pill.tone}`} aria-hidden="true" />
                  {pill.label}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="relative z-10 mx-auto w-full max-w-2xl lg:mx-0"
            initial={reduceMotion ? false : { opacity: 0, x: 28, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="pointer-events-none absolute -top-8 right-3 hidden text-5xl font-black tracking-[-0.06em] text-blue-700/15 lg:block xl:text-6xl"
              aria-hidden="true"
            >
              MakaLearn
            </span>
            <LearningScene />
            <SigningKids />
          </motion.div>
        </section>

        <ImpactStrip />
        <WhatIsMakaLearn />
        <WhatMakaLearnDoes />
        <HowItWorks />

        <Reveal>
          <section className="relative z-10 mx-auto max-w-7xl py-12">
            <div className="glass-panel-strong relative overflow-hidden rounded-[2rem] border p-8 text-center sm:p-12">
              <div
                className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-blue-300/25 to-teal-200/15 blur-xl"
                aria-hidden="true"
              />
              <div className="relative">
                <h2 className="text-3xl font-black tracking-[-0.03em] text-ink sm:text-4xl">
                  Ready for the next session?
                </h2>
                <div className="mt-7 flex justify-center">
                  <Link href="/login" className="inline-flex">
                    <Button size="lg">
                      Sign in to MakaLearn <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        <LandingFooter />
      </main>
    </div>
  );
}
