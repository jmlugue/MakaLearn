"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";

const AUTOPLAY_MS = 5000;

const pecsCards = [
  { label: "Hello", image: "/pecs/generated_cards/hello.png" },
  { label: "Please", image: "/pecs/generated_cards/please.png" },
  { label: "Help", image: "/pecs/generated_cards/help.png" },
  // "more" was dropped: its symbol is a cluster of red squares that reads as noise
  // next to the clean figure symbols on the other cards.
  { label: "Thank you", image: "/pecs/generated_cards/thank_you.png" },
  { label: "Drink", image: "/pecs/generated_cards/drink.png" }
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

  return (
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
  );
}
