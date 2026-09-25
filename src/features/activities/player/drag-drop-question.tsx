"use client";

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getDisplayLabel } from "@/features/activities/player/player-utils";
import { StudentPictureCard, StudentResultBadge } from "@/features/activities/player/student-game-parts";
import { studentText } from "@/features/activities/player/student-theme";
import type { ActivityQuestion, LearningItem } from "@/types";

type DragState = {
  value: string;
  pointerId: number;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  overId: string;
  returning: boolean;
};

/**
 * Drag and drop in Student mode. Cards are dragged with a finger or the mouse (pointer events, since the
 * browser's own drag and drop does not work on touch screens). Tapping does nothing: it is a drag game.
 * The parent decides if a drop is right: a right card stays, a wrong one flies back to the tray.
 */
export function StudentDragBoard({
  questions,
  learningItems,
  placed,
  trayCards,
  hintTargetId,
  dimmedCards,
  beingReadId,
  shake,
  onDrop
}: {
  questions: ActivityQuestion[];
  learningItems: LearningItem[];
  /** Question id to the card placed on it (only right cards are ever placed). */
  placed: Record<string, string>;
  trayCards: string[];
  hintTargetId: string;
  /** Tray cards Hint says do not belong in the hinted box. */
  dimmedCards: string[];
  beingReadId: string;
  shake: { id: string; key: number } | null;
  /** Returns true when the card belongs there. */
  onDrop: (questionId: string, value: string) => boolean;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const returnTimer = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();
  // The window listeners read the latest values through these.
  const latest = useRef({ drag, placed, onDrop, reduceMotion });
  latest.current = { drag, placed, onDrop, reduceMotion };
  const dragging = Boolean(drag && !drag.returning);

  // While a card is held, follow the pointer anywhere on the page (touch or mouse) until it is let go.
  useEffect(() => {
    if (!dragging) return;

    function dropTargetAt(x: number, y: number) {
      const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-drop-id]");
      const id = element?.dataset.dropId ?? "";
      return id && !latest.current.placed[id] ? id : "";
    }

    function flyBack(current: DragState) {
      setDrag({ ...current, returning: true, overId: "", x: current.originX + current.offsetX, y: current.originY + current.offsetY });
      if (returnTimer.current) window.clearTimeout(returnTimer.current);
      returnTimer.current = window.setTimeout(() => setDrag(null), latest.current.reduceMotion ? 0 : 320);
    }

    function onMove(event: PointerEvent) {
      const current = latest.current.drag;
      if (!current || event.pointerId !== current.pointerId) return;
      event.preventDefault();
      setDrag({ ...current, x: event.clientX, y: event.clientY, overId: dropTargetAt(event.clientX, event.clientY) });
    }

    function onUp(event: PointerEvent) {
      const current = latest.current.drag;
      if (!current || event.pointerId !== current.pointerId) return;
      const targetId = dropTargetAt(event.clientX, event.clientY);
      if (targetId && latest.current.onDrop(targetId, current.value)) setDrag(null);
      else flyBack(current);
    }

    function onCancel(event: PointerEvent) {
      const current = latest.current.drag;
      if (current && event.pointerId === current.pointerId) flyBack(current);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [dragging]);

  useEffect(() => () => {
    if (returnTimer.current) window.clearTimeout(returnTimer.current);
  }, []);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, value: string) {
    if (drag || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    try {
      // Keeps touch moves coming to the page even when the finger leaves the card.
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Not captured: nothing to release.
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setDrag({
      value,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      originX: rect.left,
      originY: rect.top,
      width: rect.width,
      height: rect.height,
      overId: "",
      returning: false
    });
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[minmax(0,1.6fr)_minmax(0,0.6fr)] gap-3 sm:grid-rows-[minmax(0,1.1fr)_minmax(0,0.9fr)] sm:gap-4">
      <div className={cn("mx-auto grid h-full min-h-0 w-full max-w-6xl gap-2 sm:gap-4", boxColumnsFor(questions.length))}>
        {questions.map((question) => {
          const card = placed[question.id];
          const over = drag?.overId === question.id;
          const hinted = hintTargetId === question.id && !card;
          return (
            <motion.div
              key={shake?.id === question.id ? `${question.id}-${shake.key}` : question.id}
              data-drop-id={question.id}
              className={cn(
                "grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 rounded-[1.75rem] border-4 bg-white/80 p-2 shadow-[0_8px_0_rgba(147,197,253,0.25)] transition-colors sm:p-3",
                card ? "border-emerald-400 bg-emerald-50/90" : over ? "border-blue-500 bg-blue-50" : hinted ? "border-amber-400 ring-8 ring-amber-100" : "border-white",
                beingReadId === question.id && "ring-8 ring-sky-200"
              )}
              animate={shake?.id === question.id && !reduceMotion ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className={cn("rounded-xl bg-[#fff] px-1 py-2 text-center [overflow-wrap:anywhere]", studentText.label)}>
                {question.prompt}
              </span>
              <div className="grid min-h-0 place-items-center [container-type:size]">
                {card ? (
                  <StudentPictureCard value={card} learningItems={learningItems} className="w-[min(100cqw,75cqh,16rem)] border-emerald-500">
                    <StudentResultBadge tone="correct" />
                  </StudentPictureCard>
                ) : (
                  <span
                    className={cn(
                      "grid aspect-[3/4] w-[min(100cqw,75cqh,16rem)] place-items-center rounded-[1.5rem] border-4 border-dashed text-center text-base font-black sm:text-lg",
                      over ? "border-blue-500 bg-blue-100 text-blue-700" : "border-blue-200 bg-sky-50/80 text-blue-400"
                    )}
                  >
                    Drop here
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-[1.75rem] border-2 border-dashed border-blue-200 bg-white/50 p-2 sm:p-3">
        <div className={cn("mx-auto grid h-full min-h-0 w-full max-w-6xl gap-2 sm:gap-4", columnsFor(Math.max(trayCards.length, 1)))}>
          {trayCards.map((value) => {
            const held = drag?.value === value;
            const dimmed = dimmedCards.includes(value);
            return (
              <div key={value} className="grid min-h-0 place-items-center [container-type:size]">
                <div
                  role="img"
                  aria-label={`${getDisplayLabel(value, learningItems)} card. Drag it onto its word.`}
                  className={cn(
                    "w-[min(100cqw,75cqh,16rem)] cursor-grab touch-none select-none active:cursor-grabbing",
                    held && "opacity-0",
                    dimmed && !held && "opacity-30 grayscale"
                  )}
                  onPointerDown={(event) => startDrag(event, value)}
                >
                  <StudentPictureCard value={value} learningItems={learningItems} className="pointer-events-none w-full hover:border-blue-300" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {drag ? (
        <div
          className={cn("pointer-events-none fixed left-0 top-0 z-[80]", drag.returning && "transition-transform duration-300 ease-out")}
          style={{
            width: drag.width,
            height: drag.height,
            transform: `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0) ${drag.returning ? "" : "scale(1.06) rotate(-2deg)"}`
          }}
          aria-hidden="true"
        >
          <StudentPictureCard value={drag.value} learningItems={learningItems} className="w-full border-blue-500 shadow-[0_24px_40px_rgba(37,99,235,0.3)]" />
        </div>
      ) : null}
    </div>
  );
}

function columnsFor(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  if (count === 4) return "grid-cols-4";
  return "grid-cols-5";
}

/** Drop boxes need room for their word, so phones get two or three columns. */
function boxColumnsFor(count: number) {
  if (count <= 2) return columnsFor(count);
  if (count === 5) return "grid-cols-3 sm:grid-cols-5";
  return count === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4";
}
