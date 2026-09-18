"use client";

import { type ReactNode, useState } from "react";
import { GripVertical, Lightbulb, Library, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isEmbeddableActivityMediaUrl } from "@/utils/activity-symbol-options";
import { getLearningItemForValue, getDisplayLabel } from "@/features/activities/player/player-utils";
import type { Activity, LearningItem } from "@/types";

export function StudentActivityNavigator({
  activities,
  activeActivityId,
  onSelectActivity
}: {
  activities: Activity[];
  activeActivityId: string;
  onSelectActivity?: (activityId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!onSelectActivity || activities.length <= 1) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        className="group min-h-14 w-16 justify-center rounded-[1.45rem] border-4 border-sky-200 bg-gradient-to-b from-white to-sky-100 px-4 text-base font-black text-blue-700 shadow-[0_14px_28px_rgba(14,165,233,0.18)] hover:border-sky-300 hover:from-sky-50 hover:to-cyan-100 sm:min-h-16 sm:w-40 sm:justify-start sm:px-6 sm:text-lg"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="student-activity-switcher"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2469ee] text-white shadow-[inset_0_-3px_0_rgba(30,64,175,0.28)]">
          <Library className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">Activities</span>
      </Button>

      {open ? (
        <div
          id="student-activity-switcher"
          className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-[1.4rem] border-4 border-white bg-white/95 p-3 shadow-[0_18px_45px_rgba(37,99,235,0.22)] backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center gap-2 px-1 text-sm font-black uppercase text-blue-700">
            <Library className="h-5 w-5" aria-hidden="true" />
            Choose activity
          </div>
          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1 clean-scrollbar">
            {activities.map((candidate) => {
              const active = candidate.id === activeActivityId;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  disabled={active}
                  onClick={() => {
                    setOpen(false);
                    onSelectActivity(candidate.id);
                  }}
                  className={cn(
                    "w-full rounded-2xl border px-3 py-3 text-left text-sm font-black leading-5 transition",
                    active
                      ? "border-blue-500 bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)]"
                      : "border-blue-100 bg-sky-50 text-[#10285e] hover:border-blue-300 hover:bg-white"
                  )}
                >
                  <span className="line-clamp-2">{candidate.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StepProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const visibleSteps = 5;

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 shadow-sm" aria-label={`Question ${currentStep} of ${totalSteps}`}>
      {Array.from({ length: visibleSteps }, (_, index) => {
        const step = index + 1;
        const active = step === currentStep;
        const available = step <= totalSteps;
        return (
          <div key={step} className="flex items-center gap-2">
            {index > 0 ? <span className={cn("h-0.5 w-6 rounded-full", step <= currentStep ? "bg-blue-500" : "bg-blue-100")} aria-hidden="true" /> : null}
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-black",
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
                  : available
                    ? "border-blue-200 bg-white text-blue-700"
                    : "border-slate-200 bg-slate-50 text-slate-300"
              )}
            >
              {step}
            </span>
          </div>
        );
      })}
      <span className="sr-only">{currentStep} of {totalSteps}</span>
    </div>
  );
}

export function ActivityResetAction({ onReset }: { onReset: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="absolute bottom-4 left-4 z-20 min-h-16 rounded-[1.45rem] border-4 border-white bg-white/88 px-5 text-xl font-black text-blue-700 shadow-[0_10px_0_rgba(147,197,253,0.5)] sm:left-6 sm:min-w-44"
      onClick={onReset}
    >
      <RotateCcw className="h-7 w-7" aria-hidden="true" />
      Try again
    </Button>
  );
}

export function ActivityGameTopBar({
  stacked = false,
  isListening,
  onHint,
  onListen,
  activityNavigator
}: {
  stacked?: boolean;
  isListening: boolean;
  onHint: () => void;
  onListen: () => void;
  activityNavigator?: ReactNode;
}) {
  return (
    <div className={cn("flex h-full items-center justify-end gap-3", stacked ? "" : "pl-16 sm:pl-20")}>
      <div className={cn("flex justify-end gap-3", stacked ? "flex-col items-stretch" : "")}>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "group min-h-14 rounded-[1.45rem] border-4 border-yellow-200 bg-gradient-to-b from-white to-amber-100 px-4 text-base font-black text-amber-800 shadow-[0_14px_28px_rgba(245,158,11,0.2)] hover:border-amber-300 hover:from-amber-50 hover:to-orange-100 sm:min-h-16 sm:px-6 sm:text-lg",
            stacked ? "w-16 justify-center sm:w-40 sm:justify-start" : ""
          )}
          onClick={onHint}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-400 text-white shadow-[inset_0_-3px_0_rgba(146,64,14,0.22)]">
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Hint</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          className={cn(
            "group min-h-14 rounded-[1.45rem] border-4 border-sky-200 bg-gradient-to-b from-white to-sky-100 px-4 text-base font-black text-blue-700 shadow-[0_14px_28px_rgba(14,165,233,0.18)] hover:border-sky-300 hover:from-sky-50 hover:to-cyan-100 sm:min-h-16 sm:px-6 sm:text-lg",
            stacked ? "w-16 justify-center sm:w-40 sm:justify-start" : ""
          )}
          onClick={onListen}
          disabled={isListening}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#2469ee] text-white shadow-[inset_0_-3px_0_rgba(30,64,175,0.28)]">
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">{isListening ? "Listening" : "Listen"}</span>
        </Button>
        {activityNavigator}
      </div>
    </div>
  );
}

export function DragChoiceCard({
  value,
  learningItems,
  selected,
  used = false,
  onSelect
}: {
  value: string;
  learningItems: LearningItem[];
  selected: boolean;
  used?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onSelect}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative mx-auto grid aspect-[3/4] h-auto max-h-full min-h-0 w-full max-w-[11.5rem] grid-rows-[minmax(0,1fr)] overflow-hidden rounded-[1.2rem] border-[3px] bg-white/92 text-center shadow-[0_5px_0_rgba(147,197,253,0.16),0_10px_18px_rgba(37,99,235,0.08)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-blue-100",
        selected ? "border-blue-500 ring-8 ring-blue-100" : "border-white hover:border-blue-200",
        used && !selected ? "opacity-75" : ""
      )}
      aria-label={`Select ${getDisplayLabel(value, learningItems)} card`}
    >
      <span className="absolute left-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-blue-600 text-white shadow-sm sm:h-6 sm:w-6" aria-hidden="true">
        <GripVertical className="h-3 w-3" />
      </span>
      <span className="grid min-h-0 place-items-center overflow-hidden p-1.5">
        <SymbolOption value={value} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
      </span>
    </button>
  );
}

export function DroppedCardPreview({
  value,
  learningItems,
  compact = false,
  resultTone = "neutral"
}: {
  value: string;
  learningItems: LearningItem[];
  compact?: boolean;
  resultTone?: "neutral" | "correct" | "wrong";
}) {
  return (
    <span
      className={cn(
        "grid h-full min-h-0 w-full max-w-full overflow-hidden rounded-[1rem] border bg-white/88 shadow-[0_8px_18px_rgba(37,99,235,0.12)]",
        resultTone === "correct" ? "border-emerald-300 ring-4 ring-emerald-100" : "",
        resultTone === "wrong" ? "border-rose-300 ring-4 ring-rose-100" : "",
        resultTone === "neutral" ? "border-transparent" : "",
        compact ? "grid-rows-[minmax(0,1fr)]" : "max-h-36 max-w-64 grid-rows-[minmax(0,1fr)_2.25rem]"
      )}
    >
      <span className={cn("grid min-h-0 place-items-center overflow-hidden", compact ? "p-1" : "px-3 pt-3")}>
        <SymbolOption value={value} learningItems={learningItems} framed={false} className="!h-full max-h-full" />
      </span>
      {compact ? null : (
        <span className="grid min-h-0 place-items-center border-t border-blue-100 bg-white/95 px-2 text-sm font-black uppercase leading-tight text-[#0d255a]">
          <span className="line-clamp-2">{getDisplayLabel(value, learningItems)}</span>
        </span>
      )}
    </span>
  );
}

export function SymbolOption({
  value,
  learningItems,
  framed = true,
  className
}: {
  value: string;
  learningItems: LearningItem[];
  framed?: boolean;
  className?: string;
}) {
  const item = getLearningItemForValue(value, learningItems);
  const imageValue = item?.symbolImageUrl ?? value;

  if (isEmbeddableActivityMediaUrl(imageValue)) {
    return (
      <span
        className={cn(
          "grid h-20 min-h-0 w-full max-w-full min-w-0 place-items-center sm:h-24",
          framed ? "overflow-hidden rounded-xl border border-slate-200 bg-white" : "overflow-hidden rounded-none bg-transparent",
          className
        )}
      >
        {/* Existing learning item media is rendered as supplied by the content library. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageValue}
          alt={item ? `${item.label} symbol` : "Learning item symbol"}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "grid h-20 min-h-0 min-w-0 max-w-full place-items-center px-2 text-xl font-black text-blue-700 sm:h-24",
        framed ? "rounded-xl border border-blue-100 bg-[#f8fbff] shadow-inner" : "rounded-none bg-transparent",
        className
      )}
    >
      {imageValue}
      {item ? <span className="sr-only">{item.label} symbol image</span> : null}
    </span>
  );
}
