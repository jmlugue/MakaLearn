"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Activity, BookOpenCheck, ChevronRight, GraduationCap, Hand, Layers, Shapes, UserCheck, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { activityTypeTones } from "@/features/activities/activity-helpers";
import { activityTypeIcons } from "@/features/activities/activity-type-badge";
import { activityTypeShortLabels } from "@/utils/activity-labels";
import type { ActivityPlay } from "@/lib/supabase/app-data";
import { Avatar, describeActivity, FilterSelect, formatDateTime } from "@/features/admin/admin-shared";
import type { ContentView } from "@/features/admin/content-section";
import { cn } from "@/lib/utils";
import { entityColors } from "@/lib/entity-colors";
import type {
  Activity as ActivityRecord,
  AppUser,
  AuditLog,
  LearningItem,
  Lesson,
  MediaAsset
} from "@/types";

// Palette: blue is the main color; soft green, yellow and red only carry meaning (see color-palette rules).
// PECS, Gestures, Lessons, and Activities use the same colors as every other page (`src/lib/entity-colors.ts`).
// Gestures have no attempts, so nothing here charts gesture practice.

export type OverviewJump =
  | { section: "accounts"; status?: "deactivated" }
  | { section: "content"; view?: ContentView; openItemId?: string }
  | { section: "activity" };

function greeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString();
}

/** Counts up from 0 on first render; shows the final number immediately with reduced motion. */
function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return undefined;
    }
    const controls = animate(0, value, { duration: 0.9, ease: "easeOut", onUpdate: (latest) => setDisplay(Math.round(latest)) });
    return () => controls.stop();
  }, [reduceMotion, value]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}

function Tile({ children, className, index }: { children: ReactNode; className?: string; index: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-blue-100/80 bg-[#fff] p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

const seeAllClass =
  "inline-flex shrink-0 items-center gap-0.5 rounded text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300";

/** Tile heading with an optional right-side slot or "See all" shortcut. */
function TileHeader({
  icon: Icon,
  title,
  onSeeAll,
  href,
  right
}: {
  icon: LucideIcon;
  title: string;
  onSeeAll?: () => void;
  href?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
        {title}
      </p>
      {right ??
        (href ? (
          <Link href={href} aria-label={`See all ${title.toLowerCase()}`} className={seeAllClass}>
            See all <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : onSeeAll ? (
          <button type="button" onClick={onSeeAll} aria-label={`See all ${title.toLowerCase()}`} className={seeAllClass}>
            See all <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null)}
    </div>
  );
}

function Chip({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "slate" }) {
  const tones = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    slate: "bg-slate-100 text-slate-600"
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", tones[tone])}>{children}</span>;
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="my-auto py-6 text-center text-sm font-semibold text-slate-400">{children}</p>;
}

type GreetingStat = { label: string; value: number; icon: LucideIcon; onClick: () => void };

/** Greeting tile with a gently waving hand and drifting circles. Each account number opens Accounts. */
function GreetingTile({ adminName, stats }: { adminName: string; stats: GreetingStat[] }) {
  const reduceMotion = useReducedMotion();
  const now = new Date();
  return (
    <Tile index={0} className="border-0 bg-gradient-to-br from-blue-600 to-blue-400 text-white sm:col-span-2 xl:col-span-6 xl:row-span-2">
      {!reduceMotion ? (
        <>
          <motion.span
            className="pointer-events-none absolute -left-10 top-10 h-28 w-28 rounded-full bg-white/10"
            animate={{ y: [0, -12, 0], x: [0, 6, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.span
            className="pointer-events-none absolute right-40 top-4 h-10 w-10 rounded-full bg-white/15"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            aria-hidden="true"
          />
        </>
      ) : null}
      <motion.span
        className="pointer-events-none absolute -bottom-8 -right-4 origin-bottom-left"
        animate={reduceMotion ? undefined : { rotate: [0, 12, -6, 12, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <Hand className="h-44 w-44 text-white/20" strokeWidth={1.3} />
      </motion.span>
      <p className="relative text-sm font-semibold text-blue-100">
        {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(now)}
      </p>
      <p className="relative mt-2 text-3xl font-extrabold tracking-[-0.03em]">
        {greeting(now)}, {adminName.split(" ")[0]}
      </p>
      <div className="relative mt-auto grid grid-cols-1 gap-3 pt-6 sm:grid-cols-2">
        {stats.map(({ label, value, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="group flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 text-left backdrop-blur-sm transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/20">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xl font-extrabold leading-tight">
                <CountUp value={value} />
              </span>
              <span className="block text-xs font-semibold text-blue-100">{label}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/60 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden="true" />
          </button>
        ))}
      </div>
    </Tile>
  );
}

type UsageRange = "today" | "week" | "month" | "3m" | "year";
type ActivityRank = { activityId: string; plays: number; seconds: number };

/**
 * Plays are also counted by activity type: the three types teachers make, plus grey for a deleted or retired activity.
 * The soft 300 shades keep Drag and drop pink from reading as the red used for wrong or deleted.
 */
type UsageKind = "match-word-symbol" | "fill-blank" | "drag-drop-symbol" | "other";
/** The same 300 shades as `activityTypeTones[type].stripe`, written out for SVG strokes. */
const donutStrokes: Record<Exclude<UsageKind, "other">, string> = {
  "match-word-symbol": "stroke-violet-300",
  "fill-blank": "stroke-yellow-300",
  "drag-drop-symbol": "stroke-pink-300"
};
const usageKinds: { kind: UsageKind; label: string; color: string; stroke: string; tile: string; icon: LucideIcon }[] = [
  ...(["match-word-symbol", "fill-blank", "drag-drop-symbol"] as const).map((type) => ({
    kind: type,
    label: activityTypeShortLabels[type],
    color: activityTypeTones[type].stripe,
    stroke: donutStrokes[type],
    tile: activityTypeTones[type].badge,
    icon: activityTypeIcons[type]
  })),
  { kind: "other", label: "Other", color: "bg-slate-300", stroke: "stroke-slate-300", tile: "bg-slate-100 text-slate-500", icon: Shapes }
];

type UsageBucket = {
  key: string;
  label: string;
  full: string;
  plays: number;
  seconds: number;
  byKind: Record<UsageKind, number>;
  topActivities: ActivityRank[];
};

/** The bars group themselves: hours for today, days for a week or month, weeks for 3 months, months for a year. */
const usageRanges: { value: UsageRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "3m", label: "Last 3 months" },
  { value: "year", label: "This year" }
];

/** "45 sec", "3 min 20 sec", "1 hr 12 min". */
function formatDuration(totalSeconds: number) {
  const seconds = Math.round(totalSeconds);
  if (seconds < 60) return `${seconds} sec`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
  const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} sec` : `${minutes} min`;
}

function playsText(count: number) {
  return `${count} ${count === 1 ? "play" : "plays"}`;
}

/** Activities by plays (then total time), most played first. */
function rankActivities(plays: ActivityPlay[]): ActivityRank[] {
  const byActivity = new Map<string, ActivityRank>();
  for (const play of plays) {
    const entry = byActivity.get(play.activityId) ?? { activityId: play.activityId, plays: 0, seconds: 0 };
    entry.plays += 1;
    entry.seconds += play.durationSeconds;
    byActivity.set(play.activityId, entry);
  }
  return [...byActivity.values()].sort((a, b) => b.plays - a.plays || b.seconds - a.seconds);
}

/** Today by hour, this week (Monday to Sunday) and this month by day, the last 3 months by week, this year by month. */
function buildUsageBuckets(range: UsageRange, plays: ActivityPlay[], kindOf: (activityId: string) => UsageKind): UsageBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const shortFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  const dayFormat = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" });
  const buckets: { start: Date; end: Date; label: string; full: string }[] = [];

  const addDay = (start: Date, label: string) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    buckets.push({ start, end, label, full: dayFormat.format(start) });
  };

  if (range === "today") {
    const hourFormat = new Intl.DateTimeFormat("en", { hour: "numeric" });
    for (let hour = 0; hour < 24; hour += 1) {
      const start = new Date(today);
      start.setHours(hour);
      const end = new Date(today);
      end.setHours(hour + 1);
      // Every third hour is labelled so the axis stays readable.
      buckets.push({ start, end, label: hour % 3 === 0 ? hourFormat.format(start) : "", full: `${hourFormat.format(start)} to ${hourFormat.format(end)}` });
    }
  } else if (range === "week") {
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekday = new Intl.DateTimeFormat("en", { weekday: "short" });
    for (let offset = 0; offset < 7; offset += 1) {
      const start = new Date(monday);
      start.setDate(monday.getDate() + offset);
      // Two lines ("Mon" over "Sep 29") so seven dates fit on a phone.
      addDay(start, `${weekday.format(start)}
${shortFormat.format(start)}`);
    }
  } else if (range === "month") {
    const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= days; day += 1) {
      // A date every 7 days ("Oct 1", "Oct 8") keeps the axis readable.
      const start = new Date(today.getFullYear(), today.getMonth(), day);
      addDay(start, (day - 1) % 7 === 0 ? shortFormat.format(start) : "");
    }
  } else if (range === "3m") {
    const rangeStart = new Date(today);
    rangeStart.setMonth(today.getMonth() - 3);
    let start = new Date(rangeStart);
    start.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));
    let index = 0;
    while (start <= today) {
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const last = new Date(end);
      last.setDate(end.getDate() - 1);
      buckets.push({
        start: new Date(start),
        end,
        label: index % 2 === 0 ? shortFormat.format(start) : "",
        full: `Week of ${shortFormat.format(start)} to ${shortFormat.format(last)}`
      });
      start = end;
      index += 1;
    }
  } else {
    const monthFormat = new Intl.DateTimeFormat("en", { month: "short" });
    const fullFormat = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });
    for (let month = 0; month < 12; month += 1) {
      const start = new Date(today.getFullYear(), month, 1);
      buckets.push({ start, end: new Date(today.getFullYear(), month + 1, 1), label: monthFormat.format(start), full: fullFormat.format(start) });
    }
  }

  return buckets.map((bucket) => {
    const inBucket = plays.filter((play) => {
      const time = new Date(play.createdAt).getTime();
      return time >= bucket.start.getTime() && time < bucket.end.getTime();
    });
    return {
      key: bucket.start.toISOString(),
      label: bucket.label,
      full: bucket.full,
      plays: inBucket.length,
      seconds: inBucket.reduce((sum, play) => sum + play.durationSeconds, 0),
      byKind: inBucket.reduce(
        (sum, play) => {
          sum[kindOf(play.activityId)] += 1;
          return sum;
        },
        { "match-word-symbol": 0, "fill-blank": 0, "drag-drop-symbol": 0, other: 0 } as Record<UsageKind, number>
      ),
      topActivities: rankActivities(inBucket).slice(0, 3)
    };
  });
}

const summaryCardClass = "min-w-0 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3";

/**
 * By type: a donut of the period's type mix, then each type's icon and share, most played first. The middle shows the
 * total; hovering (or focusing, or tapping) a piece or a legend row shows that type's play count there instead.
 */
function TypeDonut({ totals }: { totals: ((typeof usageKinds)[number] & { plays: number })[] }) {
  const reduceMotion = useReducedMotion();
  const [picked, setPicked] = useState<UsageKind | null>(null);
  // Most played type first, so the legend reads in order; Other always last.
  const shown = totals
    .filter((entry) => entry.kind !== "other" || entry.plays > 0)
    .sort((a, b) => Number(a.kind === "other") - Number(b.kind === "other") || b.plays - a.plays);
  const all = shown.reduce((sum, entry) => sum + entry.plays, 0);
  const pickedEntry = shown.find((entry) => entry.kind === picked);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  // A small gap between pieces, only when more than one type was played.
  const gap = shown.filter((entry) => entry.plays).length > 1 ? 3 : 0;
  let offset = 0;
  const pieces = shown
    .filter((entry) => entry.plays)
    .map((entry) => {
      const length = (entry.plays / all) * circumference;
      const piece = { ...entry, dash: Math.max(0, length - gap), offset };
      offset += length;
      return piece;
    });
  const percentOf = (count: number) => (all ? `${Math.round((count / all) * 100)}%` : "0%");

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col" onMouseLeave={() => setPicked(null)}>
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} fill="none" className="stroke-slate-100" strokeWidth="12" />
          {pieces.map((piece) => (
            <motion.circle
              key={piece.kind}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              className={cn(piece.stroke, "cursor-pointer transition-opacity", picked && picked !== piece.kind ? "opacity-30" : "")}
              strokeWidth={picked === piece.kind ? 14 : 12}
              strokeDashoffset={-piece.offset}
              onMouseEnter={() => setPicked(piece.kind)}
              initial={reduceMotion ? false : { strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${piece.dash} ${circumference}` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center" aria-live="polite">
          <div className="max-w-[5.5rem]">
            <p className="text-2xl font-extrabold leading-none text-ink">{pickedEntry ? pickedEntry.plays : all}</p>
            <p className="mt-1 text-xs font-semibold leading-tight text-slate-500">
              {pickedEntry ? pickedEntry.label : all === 1 ? "play" : "plays"}
            </p>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-1" aria-label="Plays by activity type">
        {shown.map(({ kind, label, tile, icon: Icon, plays: kindPlays }) => (
          <li key={kind}>
            <button
              type="button"
              aria-label={`${label}: ${playsText(kindPlays)}, ${percentOf(kindPlays)}`}
              onMouseEnter={() => setPicked(kind)}
              onFocus={() => setPicked(kind)}
              onBlur={() => setPicked(null)}
              onClick={() => setPicked((current) => (current === kind ? null : kind))}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                picked === kind ? "bg-slate-100" : "hover:bg-slate-50"
              )}
            >
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", tile)}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{label}</span>
              <span className="shrink-0 text-sm font-bold text-ink">{percentOf(kindPlays)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Most played: the top 5 activities by name, each numbered on its type color. */
function MostPlayedCard({ ranking, activityById }: { ranking: ActivityRank[]; activityById: Map<string, ActivityRecord> }) {
  const titleOf = (activityId: string) => activityById.get(activityId)?.title ?? "Deleted activity";

  return (
    <div className={summaryCardClass}>
      <p className="text-xs font-semibold text-slate-500">Most played</p>
      {ranking.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-slate-400">No plays in this period yet.</p>
      ) : (
        <ol className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1.5 lg:grid-flow-col lg:grid-cols-2 lg:grid-rows-3">
          {ranking.map((entry, index) => {
            const activity = activityById.get(entry.activityId);
            return (
              <li key={entry.activityId} className="flex items-center gap-3">
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-extrabold",
                    activity ? activityTypeTones[activity.type].badge : "bg-slate-100 text-slate-500"
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink" title={titleOf(entry.activityId)}>
                  {titleOf(entry.activityId)}
                </span>
                <span className="shrink-0 text-sm text-slate-500">
                  <span className="font-bold text-ink">{entry.plays}</span> {entry.plays === 1 ? "play" : "plays"}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Activity usage: finished Student mode rounds for a chosen period. Total and average time, bars beside a donut of plays by type, then the most played activities. */
function ActivityUsage({ plays, activities }: { plays: ActivityPlay[]; activities: ActivityRecord[] }) {
  const reduceMotion = useReducedMotion();
  const [range, setRange] = useState<UsageRange>("month");
  const [focused, setFocused] = useState<{ index: number; x: number; y: number } | null>(null);

  const activityById = useMemo(() => new Map(activities.map((activity) => [activity.id, activity])), [activities]);
  const series = useMemo(() => {
    const kindOf = (activityId: string): UsageKind => {
      const type = activityById.get(activityId)?.type;
      return type === "match-word-symbol" || type === "fill-blank" || type === "drag-drop-symbol" ? type : "other";
    };
    return buildUsageBuckets(range, plays, kindOf);
  }, [activityById, range, plays]);
  const count = series.length;
  const max = Math.max(1, ...series.map((bucket) => bucket.plays));
  const totals = series.reduce((sum, bucket) => ({ plays: sum.plays + bucket.plays, seconds: sum.seconds + bucket.seconds }), { plays: 0, seconds: 0 });
  const active = focused ? series[focused.index] : null;
  const kindTotals = usageKinds.map((entry) => ({ ...entry, plays: series.reduce((sum, bucket) => sum + bucket.byKind[entry.kind], 0) }));
  const windowStart = count ? new Date(series[0].key).getTime() : 0;
  const ranking = useMemo(
    () => rankActivities(plays.filter((play) => new Date(play.createdAt).getTime() >= windowStart)).slice(0, 5),
    [plays, windowStart]
  );
  const titleOf = (activityId: string) => activityById.get(activityId)?.title ?? "Deleted activity";

  function pointerFocus(index: number, event: React.MouseEvent<HTMLElement>) {
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!box) return;
    setFocused({ index, x: event.clientX - box.left, y: event.clientY - box.top });
  }

  function keyboardFocus(index: number, event: React.FocusEvent<HTMLElement>) {
    const box = event.currentTarget.parentElement?.getBoundingClientRect();
    const column = event.currentTarget.getBoundingClientRect();
    if (!box) return;
    setFocused({ index, x: column.left - box.left + column.width / 2, y: box.height / 3 });
  }

  // Beside the title on wider screens; on phones it gets its own full-width row so the period is never cut off.
  const rangePicker = (className: string) => (
    <FilterSelect
      label="Show"
      value={range}
      onChange={(next) => {
        setRange(next);
        setFocused(null);
      }}
      options={usageRanges}
      className={className}
    />
  );

  return (
    <>
      <TileHeader icon={Shapes} title="Activity usage" right={rangePicker("hidden w-52 sm:block")} />
      {rangePicker("mt-3 sm:hidden")}

      {/* The play count lives in the donut, so only the two times are listed here, each with its own label. */}
      <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-2">
        <div>
          <dt className="text-xs font-semibold text-slate-500">Total time</dt>
          <dd className="text-xl font-extrabold tracking-[-0.02em] text-ink">{formatDuration(totals.seconds)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">Average play</dt>
          <dd className="text-xl font-extrabold tracking-[-0.02em] text-ink">
            {totals.plays ? formatDuration(totals.seconds / totals.plays) : "0 sec"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="relative">
            {totals.plays === 0 ? (
              <p className="absolute inset-x-0 top-14 z-[1] px-4 text-center text-sm font-semibold text-slate-400">
                No plays yet. A play counts when a child finishes an activity in Student mode.
              </p>
            ) : null}
            <div className="flex h-48 items-end gap-1 border-b border-slate-200 sm:gap-1.5" aria-hidden="true">
              {series.map((bucket, index) => (
                <div key={bucket.key} className="flex h-full flex-1 items-end">
                  <motion.div
                    key={`${range}-${bucket.key}`}
                    className={cn(
                      "w-full rounded-t-md transition-opacity",
                      bucket.plays ? entityColors.activity.solid : "bg-slate-100",
                      focused && focused.index !== index ? "opacity-60" : ""
                    )}
                    style={{ height: bucket.plays ? `${Math.max(4, (bucket.plays / max) * 100)}%` : "3px", transformOrigin: "bottom" }}
                    initial={reduceMotion ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.015, ease: "easeOut" }}
                  />
                </div>
              ))}
            </div>

            {/* Invisible columns make the chart readable by hover, touch, and keyboard. */}
            <div className="absolute inset-0 flex" onMouseLeave={() => setFocused(null)}>
              {series.map((bucket, index) => (
                <button
                  key={bucket.key}
                  type="button"
                  aria-label={`${bucket.full}: ${playsText(bucket.plays)}, ${formatDuration(bucket.seconds)} in total${usageKinds
                    .filter(({ kind }) => bucket.byKind[kind])
                    .map(({ kind, label }) => `, ${label} ${bucket.byKind[kind]}`)
                    .join("")}`}
                  onMouseMove={(event) => pointerFocus(index, event)}
                  onFocus={(event) => keyboardFocus(index, event)}
                  onBlur={() => setFocused(null)}
                  className="h-full flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300"
                />
              ))}
            </div>

            {active && focused ? (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-10 w-max max-w-[16rem] rounded-xl border border-slate-200 bg-[#fff] px-3 py-2 text-xs shadow-[0_12px_30px_rgba(15,23,42,0.14)]"
                style={{
                  left: focused.x,
                  top: focused.y,
                  transform: `translate(${focused.index > count / 2 ? "calc(-100% - 12px)" : "12px"}, -50%)`
                }}
              >
                <p className="font-semibold text-ink">{active.full}</p>
                <p className="mt-1 text-slate-600">
                  <span className="font-bold text-ink">{playsText(active.plays)}</span>
                  {active.plays ? <> · {formatDuration(active.seconds)} in total</> : null}
                </p>
                {usageKinds.some(({ kind }) => active.byKind[kind]) ? (
                  <ul className="mt-1.5 space-y-0.5">
                    {usageKinds.map(({ kind, label, color }) =>
                      active.byKind[kind] ? (
                        <li key={kind} className="flex items-center gap-2 text-slate-600">
                          <span className={cn("h-2 w-2 shrink-0 rounded-sm", color)} aria-hidden="true" />
                          <span className="flex-1">{label}</span>
                          <span className="font-bold text-ink">{active.byKind[kind]}</span>
                        </li>
                      ) : null
                    )}
                  </ul>
                ) : null}
                {active.topActivities.length ? (
                  <div className="mt-1.5 border-t border-slate-100 pt-1.5">
                    <p className="font-semibold text-slate-500">Most played</p>
                    {active.topActivities.map((entry) => (
                      <p key={entry.activityId} className="flex gap-2 text-slate-600">
                        <span className="min-w-0 flex-1 truncate">{titleOf(entry.activityId)}</span>
                        <span className="font-bold text-ink">{entry.plays}</span>
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="mt-2 flex gap-1 text-xs font-semibold text-slate-500 sm:gap-1.5" aria-hidden="true">
            {series.map((bucket) => (
              <span key={bucket.key} className="flex-1 overflow-visible whitespace-pre text-center leading-tight">
                {bucket.label}
              </span>
            ))}
          </div>
        </div>
        <div className="lg:w-64 lg:shrink-0 lg:border-l lg:border-slate-100 lg:pl-6">
          <TypeDonut totals={kindTotals} />
        </div>
      </div>

      <div className="mt-5">
        <MostPlayedCard ranking={ranking} activityById={activityById} />
      </div>
    </>
  );
}

export function OverviewSection({
  adminName,
  users,
  items,
  media,
  activities,
  lessons,
  logs,
  plays,
  onJump
}: {
  adminName: string;
  users: AppUser[];
  items: LearningItem[];
  media: MediaAsset[];
  activities: ActivityRecord[];
  lessons: Lesson[];
  logs: AuditLog[];
  plays: ActivityPlay[];
  onJump: (jump: OverviewJump) => void;
}) {
  const reduceMotion = useReducedMotion();
  const activeTeachers = users.filter((account) => account.role === "teacher" && account.status !== "deactivated").length;
  const deactivatedAccounts = users.filter((account) => account.status === "deactivated").length;
  const pecsCount = items.filter((item) => item.contentType === "pecs").length;
  const gestureCount = items.length - pecsCount;
  const previewMedia = media.filter((asset) => asset.publicUrl && asset.type === "symbol-image").slice(0, 3);
  const sharedActivities = activities.filter((activity) => activity.visibility === "shared").length;
  const sharedLessons = lessons.filter((lesson) => lesson.visibility === "shared").length;
  const uploadsToday = logs.filter((log) => log.action === "upload" && isToday(log.createdAt)).length;
  const signInsToday = logs.filter((log) => log.action === "login" && isToday(log.createdAt)).length;
  const ringLength = 2 * Math.PI * 15.9;
  const pecsLength = items.length ? (pecsCount / items.length) * ringLength : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
      <GreetingTile
        adminName={adminName}
        stats={[
          { label: "Active teachers", value: activeTeachers, icon: UserCheck, onClick: () => onJump({ section: "accounts" }) },
          {
            label: "Deactivated accounts",
            value: deactivatedAccounts,
            icon: UserX,
            onClick: () => onJump({ section: "accounts", status: "deactivated" })
          }
        ]}
      />

      {/* Recent activity: action-focused admin summary instead of raw account totals. */}
      <Tile index={1} className="xl:col-span-3 xl:row-span-2">
        <TileHeader icon={Activity} title="Recent activity" onSeeAll={() => onJump({ section: "activity" })} />
        {/* Today's sign-ins and uploads sit here, beside the list they come from (moved from the greeting, Oct 3). */}
        <div className="mt-2 flex flex-wrap gap-2">
          <Chip tone="green">
            {signInsToday} {signInsToday === 1 ? "sign-in" : "sign-ins"} today
          </Chip>
          <Chip>
            {uploadsToday} {uploadsToday === 1 ? "upload" : "uploads"} today
          </Chip>
        </div>
        {logs.length === 0 ? (
          <EmptyNote>No activity yet.</EmptyNote>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {logs.slice(0, 7).map((log) => {
              const { sentence } = describeActivity(log);
              const showTitle = log.action !== "login" && log.action !== "logout";
              return (
                <li key={log.id} className="flex items-center gap-3 py-2">
                  <Avatar name={log.actorName} className="h-7 w-7 text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-600">
                      <span className="font-semibold text-ink">{log.actorName}</span> {sentence.charAt(0).toLowerCase() + sentence.slice(1)}
                      {showTitle ? <span className="text-ink">: {log.targetTitle}</span> : null}
                    </p>
                    <p className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Tile>

      {/* Materials & media: split ring + big numbers + thumbnails */}
      <Tile index={2} className="xl:col-span-3">
        <TileHeader icon={Layers} title="Materials & media" onSeeAll={() => onJump({ section: "content", view: "materials" })} />
        <div className="mt-3 flex items-center gap-4">
          <svg viewBox="0 0 42 42" className="h-16 w-16 shrink-0 -rotate-90" aria-hidden="true">
            <circle cx="21" cy="21" r="15.9" fill="none" className="stroke-sky-400" strokeWidth="6" />
            <motion.circle
              cx="21"
              cy="21"
              r="15.9"
              fill="none"
              className="stroke-indigo-400"
              strokeWidth="6"
              initial={{ strokeDasharray: reduceMotion ? `${pecsLength} ${ringLength}` : `0 ${ringLength}` }}
              animate={{ strokeDasharray: `${pecsLength} ${ringLength}` }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
          <div className="min-w-0">
            <p className="text-3xl font-extrabold leading-none tracking-[-0.03em] text-ink">
              <CountUp value={items.length} />
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">materials</p>
          </div>
        </div>
        <div className="mt-3 flex gap-4">
          <p>
            <span className={cn("text-xl font-extrabold", entityColors.pecs.text)}>{pecsCount}</span> <span className="text-xs font-semibold text-slate-500">PECS</span>
          </p>
          <p>
            <span className={cn("text-xl font-extrabold", entityColors.gesture.text)}>{gestureCount}</span>{" "}
            <span className="text-xs font-semibold text-slate-500">Gestures</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => onJump({ section: "content", view: "media" })}
          className="mt-3 flex items-center gap-2 rounded-xl bg-blue-50/70 px-3 py-2 text-left transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          <span className="flex -space-x-2">
            {previewMedia.map((asset) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={asset.id} src={asset.publicUrl} alt="" className="h-7 w-7 rounded-md border-2 border-white bg-[#fff] object-contain" />
            ))}
          </span>
          <span className="text-lg font-extrabold text-ink">{media.length}</span>
          <span className="text-xs font-semibold text-slate-500">media files</span>
        </button>
      </Tile>

      {/* Activities & lessons: two clickable rows with icon, count, and a plain description */}
      <Tile index={3} className="xl:col-span-3">
        <TileHeader icon={GraduationCap} title="Activities & collections" />
        <div className="mt-3 space-y-2">
          <Link
            href="/activities"
            className={cn(
              "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              entityColors.activity.border,
              entityColors.activity.wash,
              entityColors.activity.hoverBorder
            )}
          >
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm", entityColors.activity.solid)}>
              <Shapes className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Activities</span>
              <span className="block truncate text-xs text-slate-500">
                {sharedActivities} shared · {activities.length - sharedActivities} private
              </span>
            </span>
            <span className="text-3xl font-extrabold text-ink">
              <CountUp value={activities.length} />
            </span>
            <ChevronRight className={cn("h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5", entityColors.activity.groupHoverText)} aria-hidden="true" />
          </Link>
          <Link
            href="/content"
            className={cn(
              "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              entityColors.lesson.border,
              entityColors.lesson.wash,
              entityColors.lesson.hoverBorder
            )}
          >
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm", entityColors.lesson.solid)}>
              <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Collections</span>
              <span className="block truncate text-xs text-slate-500">
                Plans made from cards
              </span>
            </span>
            <span className="text-3xl font-extrabold text-ink">
              <CountUp value={lessons.length} />
            </span>
            <ChevronRight className={cn("h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5", entityColors.lesson.groupHoverText)} aria-hidden="true" />
          </Link>
        </div>
      </Tile>

      <Tile index={4} className="min-h-[20rem] sm:col-span-2 xl:col-span-12">
        <ActivityUsage plays={plays} activities={activities} />
      </Tile>
    </div>
  );
}
