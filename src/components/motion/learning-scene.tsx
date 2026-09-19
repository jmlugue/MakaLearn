"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";

const AUTOPLAY_MS = 3000;

// Only cards that have a real sign drawing, so the sign card beside the carousel always
// matches the symbol in front. The drawings are the same ones Gesture practice uses.
const pecsCards = [
  { label: "Help", image: "/pecs/generated_cards/help.png", sign: "/gesture-references/help.png" },
  { label: "Drink", image: "/pecs/generated_cards/drink.png", sign: "/gesture-references/drink-water.png" },
  { label: "Yes", image: "/pecs/generated_cards/yes.png", sign: "/gesture-references/yes.png" },
  { label: "Eat", image: "/pecs/generated_cards/eat.png", sign: "/gesture-references/eat-food.png" },
  { label: "Toilet", image: "/pecs/generated_cards/toilet.png", sign: "/gesture-references/toilet.png" },
  { label: "Sit", image: "/pecs/generated_cards/sit.png", sign: "/gesture-references/sit-down.png" }
];

function getCardOffset(index: number, activeIndex: number) {
  const raw = index - activeIndex;
  const half = pecsCards.length / 2;
  if (raw > half) return raw - pecsCards.length;
  if (raw < -half) return raw + pecsCards.length;
  return raw;
}

export function LearningScene() {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const rotate = useCallback((direction: 1 | -1) => {
    setActiveIndex((current) => (current + direction + pecsCards.length) % pecsCards.length);
  }, []);

  /**
   * Advance on its own every 5s, but only when the visitor has not asked for
   * reduced motion. Pausing on hover gives a way to stop the movement, and
   * keying the effect on activeIndex restarts the countdown after a manual drag
   * so a card the visitor just chose is not swept away early.
   */
  useEffect(() => {
    if (reduceMotion || paused) return;
    const timer = window.setInterval(() => rotate(1), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion, paused, activeIndex, rotate]);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (Math.abs(info.offset.x) < 45) return;
    rotate(info.offset.x < 0 ? 1 : -1);
  }

  const activeCard = pecsCards[activeIndex];

  return (
    <div className="relative">
    <div
      className="pecs-carousel-scene relative h-[430px] w-full overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-blue-600/10 via-white/35 to-cyan-300/20 shadow-[0_35px_90px_rgba(30,64,175,0.2)] backdrop-blur-xl sm:h-[520px]"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <div className="absolute inset-8 rounded-[2rem] border border-blue-100/60 bg-white/35" aria-hidden="true" />
      <div className="absolute left-8 top-8 h-16 w-16 rounded-3xl bg-blue-200/30" aria-hidden="true" />
      <div className="absolute bottom-10 right-10 h-24 w-24 rounded-full bg-teal-200/30" aria-hidden="true" />

      <motion.div
        className="relative z-10 flex h-full cursor-grab touch-pan-y select-none items-center justify-center px-6 active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.16}
        onDragEnd={handleDragEnd}
        aria-label="Swipe PECS cards"
      >
        <div className="relative h-[22rem] w-full max-w-[34rem] [perspective:1200px] sm:h-[27rem]">
          {pecsCards.map((card, index) => {
            const offset = getCardOffset(index, activeIndex);
            const isActive = offset === 0;
            const visible = Math.abs(offset) <= 2;

            return (
              <motion.div
                key={card.label}
                className="absolute inset-0 grid place-items-center"
                animate={{
                  x: offset * 124,
                  y: Math.abs(offset) * 14,
                  rotateY: offset * -22,
                  rotateZ: offset * 4,
                  scale: isActive ? 1 : 0.84,
                  opacity: visible ? (isActive ? 1 : 0.72) : 0,
                  zIndex: 10 - Math.abs(offset)
                }}
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28 }}
                aria-hidden={!isActive}
              >
                <article className="h-56 w-40 rounded-2xl border border-blue-100 bg-white p-3 shadow-[0_22px_55px_rgba(37,99,235,0.18)] sm:h-72 sm:w-52">
                  <div className="flex h-full flex-col rounded-xl border border-slate-900/20 bg-white p-2">
                    <div className="grid min-h-0 flex-1 place-items-center rounded-lg border border-blue-100 bg-slate-50">
                      <Image
                        src={card.image}
                        alt={`${card.label} placeholder learning card`}
                        width={320}
                        height={320}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                </article>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <div className="absolute inset-x-5 bottom-6 z-20 flex items-center justify-center">
        <div className="flex gap-1.5" aria-hidden="true">
          {pecsCards.map((card, index) => (
            <span
              key={card.label}
              className={`h-2 rounded-full transition-all ${activeIndex === index ? "w-6 bg-blue-600" : "w-2 bg-blue-200"}`}
            />
          ))}
        </div>
      </div>
    </div>

      {/*
        The sign for the card in front, drawn as a plain paper note taped to the corner.
        It replaces the floating signing-kid bubbles: one real drawing that changes with the
        carousel says "symbol plus sign" more honestly than four decorative badges.
      */}
      <figure
        className="absolute -bottom-7 -right-5 z-30 hidden w-52 rotate-[3deg] rounded-xl border border-slate-200 bg-white p-2.5 pb-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)] md:block"
        aria-live="polite"
      >
        <span className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 -rotate-2 rounded-sm bg-blue-200/60" aria-hidden="true" />
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-white">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={activeCard.label}
              className="absolute inset-0"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Image src={activeCard.sign} alt={`Makaton sign for ${activeCard.label}`} fill sizes="208px" className="object-contain" />
            </motion.div>
          </AnimatePresence>
        </div>
        <figcaption className="mt-1.5 flex items-baseline justify-between gap-2 border-t border-dashed border-slate-200 pt-1.5">
          <span className="text-xs font-semibold text-slate-500">Makaton sign</span>
          <span className="text-base font-black text-ink">{activeCard.label}</span>
        </figcaption>
      </figure>
    </div>
  );
}
