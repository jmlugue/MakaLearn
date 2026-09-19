"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmbientShapes } from "@/components/motion/ambient-shapes";
import { UnderlineDoodle } from "@/components/landing/landing-doodles";
import { HowItWorksOverlay } from "@/components/landing/how-it-works-overlay";

const LearningScene = dynamic(
  () => import("@/components/motion/learning-scene").then((module) => module.LearningScene),
  {
    ssr: false,
    loading: () => <div className="h-[430px] animate-pulse rounded-[2rem] border border-white/70 bg-white/45 sm:h-[520px]" />
  }
);

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <main
      className="landing-page relative min-h-screen overflow-hidden px-4 pb-16 pt-5 md:px-8 lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:pb-5"
      data-overlay-open={showHowItWorks || undefined}
    >
      <AmbientShapes />
      <div className="landing-orb landing-orb-one" aria-hidden="true" />
      <div className="landing-orb landing-orb-two" aria-hidden="true" />
      <div className="landing-orb landing-orb-three" aria-hidden="true" />
      <div className="landing-orb landing-orb-four" aria-hidden="true" />
      <div className="landing-dot-field" aria-hidden="true" />
      <div className="landing-ribbon" aria-hidden="true" />

      <nav className="relative z-10 mx-auto flex min-h-[3.5rem] w-full max-w-7xl shrink-0 items-center justify-end border-b border-blue-200/70 py-2">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
        >
          Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </nav>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 py-14 lg:min-h-0 lg:flex-1 lg:grid-cols-[0.9fr_1.1fr] lg:py-6">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Logo shrinks on small phones so the wordmark beside it is not clipped. */}
            <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.5rem] bg-white p-1 shadow-[0_18px_55px_rgba(37,99,235,0.16)] sm:h-32 sm:w-32 sm:rounded-[1.75rem]">
              <Image
                src="/makalearn_logo_current.png"
                alt="MakaLearn logo"
                width={208}
                height={208}
                className="h-full w-full scale-125 object-contain object-center"
                priority
              />
            </span>
            <h1 className="text-[2.5rem] font-black tracking-[-0.055em] text-ink sm:text-6xl lg:text-7xl">MakaLearn</h1>
          </div>

          <p className="mt-8 max-w-xl text-3xl font-black leading-[1.15] tracking-[-0.035em] text-ink sm:text-4xl">
            Learning to communicate,{" "}
            <span className="relative inline-block text-blue-700 sm:whitespace-nowrap">
              one sign at a time.
              <UnderlineDoodle className="absolute -bottom-3 -left-1 h-3 w-[calc(100%+0.5rem)] text-blue-400/70" />
            </span>
          </p>

          <p className="mt-7 max-w-md text-base leading-7 text-slate-600">
            Learn Makaton through symbols, speech, and signs, with guided practice and real-time feedback.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex">
              <Button size="lg" className="w-full sm:w-auto">
                Sign in to MakaLearn <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => setShowHowItWorks(true)}
            >
              See how it works
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="relative mx-auto w-full max-w-2xl lg:mx-0"
          initial={reduceMotion ? false : { opacity: 0, x: 28, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <LearningScene />
        </motion.div>
      </section>

      <HowItWorksOverlay open={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </main>
  );
}
