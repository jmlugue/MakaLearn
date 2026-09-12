"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AmbientShapes } from "@/components/motion/ambient-shapes";
import { SigningKids } from "@/components/landing/signing-kids";
import { UnderlineDoodle } from "@/components/landing/landing-doodles";

const LearningScene = dynamic(
  () => import("@/components/motion/learning-scene").then((module) => module.LearningScene),
  {
    ssr: false,
    loading: () => <div className="h-[430px] animate-pulse rounded-[2rem] border border-white/70 bg-white/45 sm:h-[520px]" />
  }
);

export default function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="landing-page relative min-h-screen overflow-hidden px-4 pb-16 pt-5 md:px-8">
      <AmbientShapes />
      <div className="landing-orb landing-orb-one" aria-hidden="true" />
      <div className="landing-orb landing-orb-two" aria-hidden="true" />
      <div className="landing-orb landing-orb-three" aria-hidden="true" />
      <div className="landing-orb landing-orb-four" aria-hidden="true" />
      <div className="landing-dot-field" aria-hidden="true" />
      <div className="landing-ribbon" aria-hidden="true" />

      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-blue-100/80 py-3">
        <Link href="/" className="inline-flex items-center" aria-label="MakaLearn home">
          <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-white p-0.5 shadow-[0_8px_24px_rgba(37,99,235,0.14)]">
            <Image
              src="/makalearn_logo_current.png"
              alt=""
              width={128}
              height={128}
              className="h-full w-full scale-125 object-contain object-center"
              priority
            />
          </span>
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
        >
          Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </nav>

      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 py-14 lg:min-h-[700px] lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-4">
            <span className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-[1.75rem] bg-white p-1 shadow-[0_18px_55px_rgba(37,99,235,0.16)] sm:h-32 sm:w-32">
              <Image
                src="/makalearn_logo_current.png"
                alt="MakaLearn logo"
                width={208}
                height={208}
                className="h-full w-full scale-125 object-contain object-center"
                priority
              />
            </span>
            <h1 className="text-5xl font-black tracking-[-0.055em] text-ink sm:text-6xl lg:text-7xl">MakaLearn</h1>
          </div>

          <p className="mt-8 max-w-xl text-3xl font-black leading-[1.15] tracking-[-0.035em] text-ink sm:text-4xl">
            Give every learner a way to{" "}
            <span className="relative inline-block whitespace-nowrap text-accent-teal">
              be understood
              <UnderlineDoodle className="absolute -bottom-2 left-0 h-3 w-full text-accent-amber/70" />
            </span>
          </p>

          <p className="mt-7 max-w-md text-base leading-7 text-slate-600">
            Makaton signs and picture cards, ready for the next session.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex">
              <Button size="lg" className="w-full sm:w-auto">
                Sign in to MakaLearn <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            {/* Intentionally inert: the destination is still being decided. */}
            <Button type="button" variant="secondary" size="lg" className="w-full sm:w-auto">
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
          <SigningKids />
        </motion.div>
      </section>
    </main>
  );
}
