"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, MousePointer2, RotateCcw, type LucideIcon } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Help's Show me player. Each guide plays like a short video, the same way as "See how it works" on the landing
 * page: a simplified copy of the real screen, a pointer that moves and clicks, one caption per step, and a progress
 * bar per step. Hovering the screen pauses it. With reduced motion each step shows its finished state.
 *
 * Scenes are drawn on a fixed 640 x 360 stage that scales to the pop-up width, so pointer positions stay exact.
 */

export const STAGE_W = 640;
export const STAGE_H = 360;

export type DemoScene = {
  label: string;
  caption: string;
  /** Length of the step in ms. */
  duration: number;
  /** Draws the step at `t` ms after it started. */
  render: (t: number) => ReactNode;
};

export function HelpDemoDialog({
  open,
  title,
  scenes,
  goThere,
  onClose
}: {
  open: boolean;
  title: string;
  scenes: DemoScene[];
  /** Shown on the last step, next to Replay. */
  goThere?: ReactNode;
  onClose: () => void;
}) {
  const reduceMotion = Boolean(useReducedMotion());
  const [step, setStep] = useState(0);
  const [t, setT] = useState(0);
  const [paused, setPaused] = useState(false);
  const scene = scenes[Math.min(step, Math.max(scenes.length - 1, 0))];
  const isLast = step >= scenes.length - 1;

  function goTo(next: number) {
    setStep(Math.max(0, Math.min(scenes.length - 1, next)));
    setT(0);
  }

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setT(0);
    setPaused(false);
  }, [open]);

  // The step clock. It stops while paused and when the step is done.
  useEffect(() => {
    if (!open || !scene) return undefined;
    if (reduceMotion) {
      setT(scene.duration);
      return undefined;
    }
    if (paused) return undefined;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - last;
      last = now;
      setT((current) => Math.min(scene.duration, current + elapsed));
    }, 50);
    return () => window.clearInterval(id);
  }, [open, paused, reduceMotion, scene, step]);

  // A finished step moves on by itself after a short pause, except the last one.
  useEffect(() => {
    if (!open || !scene || paused || isLast || t < scene.duration) return undefined;
    const id = window.setTimeout(() => goTo(step + 1), 900);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLast, open, paused, scene, step, t]);

  if (!scene) return null;
  const done = isLast && t >= scene.duration;

  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-3xl">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${scenes.length}, minmax(0, 1fr))` }} aria-label="Steps">
        {scenes.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Step ${index + 1}: ${item.label}`}
            aria-current={index === step ? "step" : undefined}
            className="group py-1 text-left focus-visible:outline-none"
          >
            <span className="block h-1.5 overflow-hidden rounded-full bg-blue-100 group-focus-visible:ring-2 group-focus-visible:ring-blue-300">
              <span
                className="block h-full rounded-full bg-blue-500"
                style={{ width: `${index < step ? 100 : index === step ? (t / scene.duration) * 100 : 0}%` }}
              />
            </span>
            <span className={cn("mt-1.5 hidden text-xs font-bold sm:block", index === step ? "text-blue-700" : "text-slate-400")}>
              {index + 1}. {item.label}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-3 min-h-[1.5rem] text-base font-semibold text-ink" aria-live="polite">
        {scene.caption}
      </p>

      <div className="mt-3" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <DemoStage>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {scene.render(t)}
            </motion.div>
          </AnimatePresence>
          {paused && !done ? (
            <span className="absolute right-3 top-3 z-[60] rounded-full bg-slate-900/70 px-3 py-1 text-xs font-bold text-white">Paused</span>
          ) : null}
        </DemoStage>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" onClick={() => goTo(step - 1)} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
        </Button>
        {isLast ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => goTo(0)}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Replay
            </Button>
            {goThere}
          </div>
        ) : (
          <Button type="button" onClick={() => goTo(step + 1)}>
            Next <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </Dialog>
  );
}

/** The fixed 640 x 360 drawing area, scaled to the pop-up width. */
function DemoStage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / STAGE_W));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-2xl border border-blue-100 bg-[#f4f8ff] shadow-inner"
      style={{ height: STAGE_H * scale }}
      aria-hidden="true"
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

/* ---------- Pieces the scenes are drawn with ---------- */

/** [time ms, x, y, click?]. The pointer glides to each point; a click shows a ripple. */
export type PointerKey = [number, number, number, boolean?];

export function Pointer({ t, path }: { t: number; path: PointerKey[] }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion || !path.length) return null;
  let current = path[0];
  for (const key of path) if (t >= key[0]) current = key;
  const clicking = path.some((key) => key[3] && t >= key[0] && t < key[0] + 380);
  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-50"
      initial={false}
      animate={{ x: current[1], y: current[2] }}
      transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.6 }}
    >
      {clicking ? (
        <motion.span
          className="absolute -left-5 -top-5 h-10 w-10 rounded-full bg-blue-500/35"
          initial={{ scale: 0.3, opacity: 1 }}
          animate={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 0.38 }}
        />
      ) : null}
      <MousePointer2
        className={cn(
          "h-7 w-7 -translate-x-1 -translate-y-1 fill-white text-slate-900 drop-shadow-[0_2px_3px_rgba(15,23,42,0.35)] transition-transform",
          clicking && "scale-90"
        )}
      />
    </motion.div>
  );
}

/** True while `t` is inside a click that starts at `at`. */
export function pressedAt(t: number, at: number) {
  return t >= at && t < at + 300;
}

/** The part of `text` typed so far, one letter every `per` ms from `start`. */
export function typed(text: string, t: number, start: number, per = 140) {
  if (t < start) return "";
  return text.slice(0, Math.min(text.length, Math.floor((t - start) / per) + 1));
}

export function Pop({ show, className, style, children }: { show: boolean; className?: string; style?: React.CSSProperties; children: ReactNode }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className={className}
          style={style}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type Box = { x: number; y: number; w: number; h: number };
const place = ({ x, y, w, h }: Box) => ({ left: x, top: y, width: w, height: h });

/** A page of the app: the sidebar strip, the blue page icon and name, and the page body. */
export function MockPage({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children?: ReactNode }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#f8fbff] via-[#eef4ff] to-[#f4fbff]">
      <div className="absolute left-0 top-0 h-full w-[52px] border-r border-blue-100 bg-white/80">
        <div className="mx-auto mt-3 h-7 w-7 rounded-lg bg-blue-600" />
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="mx-auto mt-4 h-5 w-5 rounded-md bg-blue-100" />
        ))}
      </div>
      <div className="absolute left-[72px] top-[20px] flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xl font-black text-ink">{title}</span>
      </div>
      {children}
    </div>
  );
}

export function MockButton({
  box,
  children,
  pressed = false,
  variant = "primary",
  className
}: {
  box: Box;
  children: ReactNode;
  pressed?: boolean;
  variant?: "primary" | "outline" | "soft";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-transform duration-150",
        variant === "primary" && "bg-blue-600 text-white shadow-sm",
        variant === "outline" && "border border-blue-200 bg-white text-blue-700",
        variant === "soft" && "bg-blue-50 text-blue-700",
        pressed && "scale-95 brightness-90",
        className
      )}
      style={place(box)}
    >
      {children}
    </div>
  );
}

/** A pop-up over the page: backdrop, white panel, title, and optional step chips. Children use panel coordinates. */
export function MockDialog({
  show,
  box,
  title,
  steps,
  step = 0,
  children
}: {
  show: boolean;
  box: Box;
  title: string;
  steps?: string[];
  step?: number;
  children?: ReactNode;
}) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div className="absolute inset-0 z-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <div className="absolute inset-0 bg-slate-900/25" />
          <motion.div
            className="absolute overflow-hidden rounded-2xl border border-white bg-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]"
            style={place(box)}
            initial={{ y: 12, scale: 0.97 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <p className="absolute left-5 top-4 text-lg font-black text-ink">{title}</p>
            {steps ? (
              <div className="absolute right-4 top-4 flex gap-1.5">
                {steps.map((label, index) => (
                  <span
                    key={label}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold",
                      index === step ? "bg-blue-600 text-white" : index < step ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"
                    )}
                  >
                    {index + 1} {label}
                  </span>
                ))}
              </div>
            ) : null}
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function MockLabel({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <p className="absolute text-[12px] font-bold text-slate-600" style={{ left: x, top: y }}>
      {children}
    </p>
  );
}

export function MockField({ box, value, placeholder, focused = false }: { box: Box; value: string; placeholder?: string; focused?: boolean }) {
  return (
    <div
      className={cn(
        "absolute flex items-center rounded-xl border bg-white px-3 text-[13px] font-semibold",
        focused ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
      )}
      style={place(box)}
    >
      {value ? <span className="truncate text-ink">{value}</span> : <span className="text-slate-400">{placeholder}</span>}
      {focused ? <span className="ml-0.5 h-4 w-0.5 animate-pulse bg-blue-600" /> : null}
    </div>
  );
}

/** A PECS card picture. `plain` uses the no-text art, as activity choices do. */
export function CardPic({ word, box, plain = false, className }: { word: string; box: Box; plain?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/pecs/${plain ? "generated_cards_no_text" : "generated_cards"}/${word}.png`}
      alt=""
      className={cn("absolute rounded-lg border border-slate-200 bg-white object-contain p-0.5", className)}
      style={place(box)}
      draggable={false}
    />
  );
}

export function MockToast({ show, text }: { show: boolean; text: string }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="absolute right-4 top-4 z-40 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-[13px] font-bold text-emerald-700 shadow-md"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {text}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
