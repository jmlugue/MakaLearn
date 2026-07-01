"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, useReducedMotion, type PanInfo } from "framer-motion";

const pecsCards = [
  { label: "Hello", src: "/pecs/generated_cards/hello.png" },
  { label: "Please", src: "/pecs/generated_cards/please.png" },
  { label: "Help", src: "/pecs/generated_cards/help.png" },
  { label: "More", src: "/pecs/generated_cards/more.png" },
  { label: "Drink", src: "/pecs/generated_cards/drink.png" }
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

  function rotate(direction: 1 | -1) {
    setActiveIndex((current) => (current + direction + pecsCards.length) % pecsCards.length);
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (Math.abs(info.offset.x) < 45) return;
    rotate(info.offset.x < 0 ? 1 : -1);
  }

  return (
    <div className="pecs-carousel-scene relative h-[430px] w-full overflow-hidden rounded-[2rem] border border-white/70 bg-gradient-to-br from-blue-600/10 via-white/35 to-cyan-300/20 shadow-[0_35px_90px_rgba(30,64,175,0.2)] backdrop-blur-xl sm:h-[520px]">
      <div className="absolute inset-8 rounded-[2rem] border border-blue-100/60 bg-white/35" aria-hidden="true" />
      <div className="absolute left-8 top-8 h-16 w-16 rounded-3xl bg-blue-200/30" aria-hidden="true" />
      <div className="absolute bottom-10 right-10 h-24 w-24 rounded-full bg-teal-200/30" aria-hidden="true" />

      <motion.div
        className="relative z-10 flex h-full cursor-grab touch-pan-y select-none items-center justify-center px-6 active:cursor-grabbing"
        drag={reduceMotion ? false : "x"}
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
                key={card.src}
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
                    <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-slate-50">
                      <Image src={card.src} alt={`${card.label} PECS card`} fill sizes="220px" className="object-contain p-2" />
                    </div>
                    <p className="mt-2 text-center text-lg font-black uppercase text-ink sm:text-xl">{card.label}</p>
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
