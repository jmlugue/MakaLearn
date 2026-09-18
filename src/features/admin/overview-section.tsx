"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Activity, BookOpenCheck, ChevronRight, Gamepad2, GraduationCap, Hand, History, Layers, Target, Trophy, Users, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Select } from "@/components/ui/form";
import { Avatar, describeActivity, formatDateTime } from "@/features/admin/admin-shared";
import type { ContentView } from "@/features/admin/content-section";
import { cn, formatDate } from "@/lib/utils";
import { activityTypeLabels } from "@/utils/activity-labels";
import { activityPlayHref } from "@/utils/lesson-activity";
import type {
  Activity as ActivityRecord,
  ActivityResult,
  AppUser,
  AuditLog,
  LearningItem,
  Lesson,
  MediaAsset,
  PracticeAttempt
} from "@/types";

// Palette: blue is the main color; soft green, yellow and red only carry meaning (see color-palette rules).

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

/** Circular gauge (0-100) with the value in the middle. */
function RingGauge({ value, label, size = 104 }: { value: number; label: string; size?: number }) {
  const reduceMotion = useReducedMotion();
  const circumference = 2 * Math.PI * 15.9;
  const color = value >= 80 ? "#34d399" : value >= 60 ? "#2563eb" : "#fcd34d";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#e8eef7" strokeWidth="4.5" />
        <motion.circle
          cx="21"
          cy="21"
          r="15.9"
          fill="none"
          stroke={color}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: reduceMotion ? circumference * (1 - value / 100) : circumference }}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-2xl font-extrabold text-ink">
            <CountUp value={value} suffix="%" />
          </p>
          <p className="text-[10px] font-semibold leading-tight text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

/** Greeting tile: information only, with a gently waving hand and drifting circles. */
function GreetingTile({ adminName, stats }: { adminName: string; stats: { label: string; value: number }[] }) {
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
      <div className="relative mt-auto grid grid-cols-3 gap-3 pt-6">
        {stats.map((entry) => (
          <div key={entry.label} className="rounded-xl bg-white/15 px-3 py-3 backdrop-blur-sm">
            <p className="text-2xl font-extrabold">
              <CountUp value={entry.value} />
            </p>
            <p className="text-xs font-semibold text-blue-100">{entry.label}</p>
          </div>
        ))}
      </div>
    </Tile>
  );
}

type TrendRange = "7d" | "30d" | "this-month" | "last-month" | "3m" | "6m";
type TrendBucket = { key: string; label: string; full: string; changes: number; signIns: number };

const trendRangeLabels: Record<TrendRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "this-month": "This month",
  "last-month": "Last month",
  "3m": "Last 3 months",
  "6m": "Last 6 months"
};

/** Day buckets for short ranges; week buckets (starting Monday) for 3 and 6 months so the chart stays readable. */
function buildBuckets(range: TrendRange, logs: AuditLog[]): TrendBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayFormat = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" });
  const shortFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  const buckets: { start: Date; end: Date; label: string; full: string }[] = [];

  const addDays = (first: Date, count: number, labelFor: (date: Date) => string) => {
    for (let index = 0; index < count; index += 1) {
      const start = new Date(first);
      start.setDate(first.getDate() + index);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      buckets.push({ start, end, label: labelFor(start), full: dayFormat.format(start) });
    }
  };

  if (range === "7d") {
    const first = new Date(today);
    first.setDate(today.getDate() - 6);
    addDays(first, 7, (date) => new Intl.DateTimeFormat("en", { weekday: "short" }).format(date));
  } else if (range === "30d") {
    const first = new Date(today);
    first.setDate(today.getDate() - 29);
    addDays(first, 30, (date) => shortFormat.format(date));
  } else if (range === "this-month") {
    addDays(new Date(today.getFullYear(), today.getMonth(), 1), today.getDate(), (date) => String(date.getDate()));
  } else if (range === "last-month") {
    const daysInLastMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    addDays(new Date(today.getFullYear(), today.getMonth() - 1, 1), daysInLastMonth, (date) => String(date.getDate()));
  } else {
    const rangeStart = new Date(today);
    rangeStart.setMonth(today.getMonth() - (range === "3m" ? 3 : 6));
    const weekStart = new Date(rangeStart);
    weekStart.setDate(rangeStart.getDate() - ((rangeStart.getDay() + 6) % 7));
    let start = weekStart;
    while (start <= today) {
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const last = new Date(end);
      last.setDate(end.getDate() - 1);
      buckets.push({ start: new Date(start), end, label: shortFormat.format(start), full: `Week of ${shortFormat.format(start)} to ${shortFormat.format(last)}` });
      start = end;
    }
  }

  return buckets.map((bucket) => {
    const inBucket = logs.filter((log) => {
      const time = new Date(log.createdAt).getTime();
      return time >= bucket.start.getTime() && time < bucket.end.getTime();
    });
    return {
      key: bucket.start.toISOString(),
      label: bucket.label,
      full: bucket.full,
      signIns: inBucket.filter((log) => log.action === "login").length,
      changes: inBucket.filter((log) => log.action !== "login" && log.action !== "logout").length
    };
  });
}

/** Usage trend: area for changes, dashed line for sign-ins, with a small tooltip that follows the pointer. */
function UsageTrend({ logs }: { logs: AuditLog[] }) {
  const reduceMotion = useReducedMotion();
  const [range, setRange] = useState<TrendRange>("7d");
  const [focused, setFocused] = useState<{ index: number; x: number; y: number } | null>(null);

  const series = useMemo(() => buildBuckets(range, logs), [logs, range]);
  const count = series.length;
  const max = Math.max(1, ...series.map((bucket) => Math.max(bucket.changes, bucket.signIns)));
  const xPercent = (index: number) => (count <= 1 ? 50 : (index / (count - 1)) * 100);
  const y = (value: number) => 46 - (value / max) * 40;
  const changeLine = series.map((bucket, index) => `${xPercent(index)},${y(bucket.changes)}`).join(" ");
  const signInLine = series.map((bucket, index) => `${xPercent(index)},${y(bucket.signIns)}`).join(" ");
  const totals = series.reduce((sum, bucket) => ({ changes: sum.changes + bucket.changes, signIns: sum.signIns + bucket.signIns }), { changes: 0, signIns: 0 });
  const active = focused ? series[focused.index] : null;
  const labelEvery = count <= 8 ? 1 : Math.ceil(count / 7);

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

  return (
    <>
      <TileHeader
        icon={Activity}
        title="Usage trend"
        right={
          <div className="w-40">
            <Select
              aria-label="Trend range"
              value={range}
              onChange={(event) => {
                setRange(event.target.value as TrendRange);
                setFocused(null);
              }}
              className="min-h-9 text-xs"
            >
              {(Object.keys(trendRangeLabels) as TrendRange[]).map((key) => (
                <option key={key} value={key}>
                  {trendRangeLabels[key]}
                </option>
              ))}
            </Select>
          </div>
        }
      />
      <div className="mt-3 flex flex-wrap gap-6">
        <p className="flex items-baseline gap-2">
          <span className="inline-block h-2.5 w-4 rounded-sm bg-blue-600" aria-hidden="true" />
          <span className="text-3xl font-extrabold text-ink">
            <CountUp value={totals.changes} />
          </span>
          <span className="text-sm text-slate-500">changes</span>
        </p>
        <p className="flex items-baseline gap-2">
          <span className="inline-block w-4 border-t-2 border-dashed border-emerald-400" aria-hidden="true" />
          <span className="text-3xl font-extrabold text-ink">
            <CountUp value={totals.signIns} />
          </span>
          <span className="text-sm text-slate-500">sign-ins</span>
        </p>
      </div>

      <div className="relative mt-3 flex-1">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="h-40 w-full overflow-visible" aria-hidden="true">
          {[10, 26, 42].map((line) => (
            <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#eef2f8" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <motion.polygon
            key={`area-${range}`}
            points={`0,50 ${changeLine} 100,50`}
            fill="#dbeafe"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.5 }}
          />
          <motion.polyline
            key={`changes-${range}`}
            points={changeLine}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={reduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
          <polyline points={signInLine} fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {focused ? (
            <line x1={xPercent(focused.index)} x2={xPercent(focused.index)} y1="0" y2="50" stroke="#93c5fd" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>

        {/* Invisible columns make the chart readable by hover, touch, and keyboard. */}
        <div className="absolute inset-0 flex" onMouseLeave={() => setFocused(null)}>
          {series.map((bucket, index) => (
            <button
              key={bucket.key}
              type="button"
              aria-label={`${bucket.full}: ${bucket.changes} changes, ${bucket.signIns} sign-ins`}
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
            className="pointer-events-none absolute z-10 w-max max-w-[14rem] rounded-xl border border-slate-200 bg-[#fff] px-3 py-2 text-xs shadow-[0_12px_30px_rgba(15,23,42,0.14)]"
            style={{
              left: focused.x,
              top: focused.y,
              transform: `translate(${focused.index > count / 2 ? "calc(-100% - 12px)" : "12px"}, -50%)`
            }}
          >
            <p className="font-semibold text-ink">{active.full}</p>
            <p className="mt-1 flex items-center gap-2 text-slate-600">
              <span className="h-2 w-2 rounded-sm bg-blue-600" aria-hidden="true" />
              <span className="font-bold text-ink">{active.changes}</span> changes
            </p>
            <p className="flex items-center gap-2 text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
              <span className="font-bold text-ink">{active.signIns}</span> sign-ins
            </p>
          </div>
        ) : null}
      </div>
      <div className="mt-2 flex justify-between gap-1 text-[10px] font-semibold text-slate-400" aria-hidden="true">
        {series
          .filter((_, index) => index % labelEvery === 0 || index === count - 1)
          .map((bucket) => (
            <span key={bucket.key} className="whitespace-nowrap">
              {bucket.label}
            </span>
          ))}
      </div>
    </>
  );
}

const practiceSegments: { status: PracticeAttempt["status"]; label: string; bar: string; dot: string }[] = [
  { status: "correct", label: "Correct", bar: "bg-emerald-400", dot: "bg-emerald-400" },
  { status: "good-attempt", label: "Good attempt", bar: "bg-blue-500", dot: "bg-blue-500" },
  { status: "needs-practice", label: "Needs practice", bar: "bg-amber-300", dot: "bg-amber-300" },
  { status: "no-hand-detected", label: "No hand detected", bar: "bg-slate-300", dot: "bg-slate-300" }
];

function PracticeResults({ attempts, results }: { attempts: PracticeAttempt[]; results: ActivityResult[] }) {
  const reduceMotion = useReducedMotion();
  const total = attempts.length;
  const segments = practiceSegments.map((segment) => ({ ...segment, count: attempts.filter((attempt) => attempt.status === segment.status).length }));
  const averageScore = results.length ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length) : 0;

  return (
    <>
      <TileHeader icon={Target} title="Practice results" />
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-slate-600">Gesture practice</p>
          <p className="text-xs font-semibold text-slate-500">
            <span className="text-lg font-extrabold text-ink">{total}</span> attempts
          </p>
        </div>
        {total === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-400">No practice attempts yet.</p>
        ) : (
          <>
            <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={segments.map((segment) => `${segment.label} ${segment.count}`).join(", ")}>
              {segments.map((segment, index) =>
                segment.count ? (
                  <motion.div
                    key={segment.status}
                    className={cn("h-full", segment.bar)}
                    initial={{ width: reduceMotion ? `${(segment.count / total) * 100}%` : "0%" }}
                    animate={{ width: `${(segment.count / total) * 100}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + index * 0.1 }}
                  />
                ) : null
              )}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {segments.map((segment) => (
                <li key={segment.status} className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", segment.dot)} aria-hidden="true" />
                  <span className="flex-1 text-slate-600">{segment.label}</span>
                  <span className="font-bold text-ink">{Math.round((segment.count / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-auto flex items-center gap-4 border-t border-slate-100 pt-4">
        {results.length ? (
          <>
            <RingGauge value={averageScore} label="avg score" size={92} />
            <div>
              <p className="text-sm font-semibold text-ink">Activity scores</p>
              <p className="text-xs text-slate-500">
                Average across {results.length} {results.length === 1 ? "play" : "plays"}
              </p>
            </div>
          </>
        ) : (
          <p className="w-full rounded-xl bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-400">No activity scores yet.</p>
        )}
      </div>
    </>
  );
}

function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-700";
  if (score >= 60) return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-700";
}

export function OverviewSection({
  adminName,
  users,
  items,
  media,
  activities,
  lessons,
  logs,
  practiceAttempts,
  activityResults,
  onJump
}: {
  adminName: string;
  users: AppUser[];
  items: LearningItem[];
  media: MediaAsset[];
  activities: ActivityRecord[];
  lessons: Lesson[];
  logs: AuditLog[];
  practiceAttempts: PracticeAttempt[];
  activityResults: ActivityResult[];
  onJump: (jump: OverviewJump) => void;
}) {
  const reduceMotion = useReducedMotion();
  const teachers = users.filter((account) => account.role === "teacher");
  const deactivated = users.filter((account) => account.status === "deactivated").length;
  const activeTeachers = teachers.filter((account) => account.status !== "deactivated").length;
  const admins = users.filter((account) => account.role === "admin").length;
  const manualLessons = lessons.filter((lesson) => lesson.source === "manual").length;
  // Active accounts first, then deactivated, so faded avatars sit at the end of the stack.
  const stackAccounts = [...users]
    .sort((a, b) => Number(a.status === "deactivated") - Number(b.status === "deactivated"))
    .slice(0, 6);
  const pecsCount = items.filter((item) => item.contentType === "pecs").length;
  const gestureCount = items.length - pecsCount;
  const adminMedia = media.filter((asset) => asset.type !== "learner-photo");
  const previewMedia = adminMedia.filter((asset) => asset.publicUrl && asset.type === "symbol-image").slice(0, 3);
  const sharedActivities = activities.filter((activity) => activity.visibility === "shared").length;
  const sharedLessons = lessons.filter((lesson) => lesson.visibility === "shared").length;
  const uploadsToday = logs.filter((log) => log.action === "upload" && isToday(log.createdAt)).length;
  const signInsToday = logs.filter((log) => log.action === "login" && isToday(log.createdAt)).length;
  const ringLength = 2 * Math.PI * 15.9;
  const pecsLength = items.length ? (pecsCount / items.length) * ringLength : 0;

  const topActivities = useMemo(() => {
    const byActivity = new Map<string, { plays: number; scoreSum: number }>();
    activityResults.forEach((result) => {
      const entry = byActivity.get(result.activityId) ?? { plays: 0, scoreSum: 0 };
      entry.plays += 1;
      entry.scoreSum += result.score;
      byActivity.set(result.activityId, entry);
    });
    return Array.from(byActivity.entries())
      .map(([activityId, entry]) => ({
        activity: activities.find((candidate) => candidate.id === activityId),
        plays: entry.plays,
        average: Math.round(entry.scoreSum / entry.plays)
      }))
      .filter((entry) => entry.activity)
      .sort((a, b) => b.plays - a.plays || b.average - a.average)
      .slice(0, 5);
  }, [activities, activityResults]);

  const latestMaterials = useMemo(() => [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5), [items]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
      <GreetingTile
        adminName={adminName}
        stats={[
          { label: "Active teachers", value: activeTeachers },
          { label: "Uploads today", value: uploadsToday },
          { label: "Sign-ins today", value: signInsToday }
        ]}
      />

      {/* Accounts: big numbers, avatar stack (deactivated faded with a red dot) */}
      <Tile index={1} className="xl:col-span-3 xl:row-span-2">
        <TileHeader icon={Users} title="Accounts" onSeeAll={() => onJump({ section: "accounts" })} />
        <div className="mt-3 flex items-end gap-2">
          <p className="text-5xl font-black leading-none tracking-[-0.04em] text-ink">
            <CountUp value={users.length} />
          </p>
          <p className="pb-1 text-sm font-semibold text-slate-500">accounts</p>
        </div>
        <div className="mt-4 flex -space-x-2" aria-hidden="true">
          {stackAccounts.map((account, index) => {
            const isDeactivated = account.status === "deactivated";
            return (
              <motion.span
                key={account.id}
                className="relative"
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.08 }}
                title={`${account.name}${isDeactivated ? " (deactivated)" : ""}`}
              >
                <Avatar
                  name={account.name}
                  className={cn("h-10 w-10 border-2 border-white text-xs", isDeactivated && "bg-slate-300 text-slate-500")}
                />
                {isDeactivated ? (
                  <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-400" />
                ) : null}
              </motion.span>
            );
          })}
          {users.length > stackAccounts.length ? (
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-blue-50 text-xs font-bold text-blue-700">
              +{users.length - stackAccounts.length}
            </span>
          ) : null}
        </div>
        <div className="mt-auto space-y-2 pt-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-blue-50 px-3 py-2.5">
              <p className="text-3xl font-black leading-none text-blue-700">
                <CountUp value={activeTeachers} />
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Teachers</p>
            </div>
            <div className="rounded-xl bg-blue-50 px-3 py-2.5">
              <p className="text-3xl font-black leading-none text-blue-700">
                <CountUp value={admins} />
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Admins</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onJump({ section: "accounts", status: "deactivated" })}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              deactivated ? "bg-red-50 hover:bg-red-100" : "bg-slate-50 hover:bg-slate-100"
            )}
          >
            <span className={cn("grid h-8 w-8 place-items-center rounded-lg bg-[#fff]", deactivated ? "text-red-500" : "text-slate-400")}>
              <UserX className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex-1 text-sm font-semibold text-slate-700">Deactivated</span>
            <span className={cn("text-2xl font-black", deactivated ? "text-red-600" : "text-slate-400")}>
              <CountUp value={deactivated} />
            </span>
          </button>
        </div>
      </Tile>

      {/* Materials & media: split ring + big numbers + thumbnails */}
      <Tile index={2} className="xl:col-span-3">
        <TileHeader icon={Layers} title="Materials & media" onSeeAll={() => onJump({ section: "content", view: "materials" })} />
        <div className="mt-3 flex items-center gap-4">
          <svg viewBox="0 0 42 42" className="h-16 w-16 shrink-0 -rotate-90" aria-hidden="true">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#a7f3d0" strokeWidth="6" />
            <motion.circle
              cx="21"
              cy="21"
              r="15.9"
              fill="none"
              stroke="#2563eb"
              strokeWidth="6"
              initial={{ strokeDasharray: reduceMotion ? `${pecsLength} ${ringLength}` : `0 ${ringLength}` }}
              animate={{ strokeDasharray: `${pecsLength} ${ringLength}` }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
          <div className="min-w-0">
            <p className="text-4xl font-black leading-none tracking-[-0.03em] text-ink">
              <CountUp value={items.length} />
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">materials</p>
          </div>
        </div>
        <div className="mt-3 flex gap-4">
          <p>
            <span className="text-xl font-black text-blue-700">{pecsCount}</span> <span className="text-xs font-semibold text-slate-500">PECS</span>
          </p>
          <p>
            <span className="text-xl font-black text-emerald-600">{gestureCount}</span>{" "}
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
          <span className="text-lg font-black text-ink">{adminMedia.length}</span>
          <span className="text-xs font-semibold text-slate-500">media files</span>
        </button>
      </Tile>

      {/* Activities & lessons: two clickable rows with icon, count, and a plain description */}
      <Tile index={3} className="xl:col-span-3">
        <TileHeader icon={GraduationCap} title="Activities & lessons" />
        <div className="mt-3 space-y-2">
          <Link
            href="/activities"
            className="group flex items-center gap-3 rounded-xl border border-blue-100 bg-[#f8fbff] px-3 py-2.5 transition hover:border-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Gamepad2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Activities</span>
              <span className="block truncate text-xs text-slate-500">
                {sharedActivities} shared · {activities.length - sharedActivities} private
              </span>
            </span>
            <span className="text-3xl font-black text-ink">
              <CountUp value={activities.length} />
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true" />
          </Link>
          <Link
            href="/content"
            className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5 transition hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
              <BookOpenCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-ink">Lessons</span>
              <span className="block truncate text-xs text-slate-500">
                {manualLessons} manual · {lessons.length - manualLessons} auto-generated
              </span>
            </span>
            <span className="text-3xl font-black text-ink">
              <CountUp value={lessons.length} />
            </span>
            <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" aria-hidden="true" />
          </Link>
        </div>
      </Tile>

      <Tile index={4} className="min-h-[20rem] sm:col-span-2 xl:col-span-7">
        <UsageTrend logs={logs} />
      </Tile>

      <Tile index={5} className="min-h-[20rem] sm:col-span-2 xl:col-span-5">
        <PracticeResults attempts={practiceAttempts} results={activityResults} />
      </Tile>

      {/* Most used activities: ranked list + score pill; each row opens that activity */}
      <Tile index={6} className="xl:col-span-4">
        <TileHeader icon={Trophy} title="Most used activities" href="/activities" />
        {topActivities.length === 0 ? (
          <EmptyNote>No activities played yet.</EmptyNote>
        ) : (
          <ol className="mt-3 space-y-1.5">
            {topActivities.map((entry, index) => (
              <li key={entry.activity?.id}>
                <Link
                  href={entry.activity ? activityPlayHref(entry.activity.id) : "/activities"}
                  className="group flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold",
                      index === 0 ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink group-hover:text-blue-700">{entry.activity?.title}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {entry.activity ? activityTypeLabels[entry.activity.type] : ""} · {entry.plays} {entry.plays === 1 ? "play" : "plays"}
                    </span>
                  </span>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", scoreTone(entry.average))}>{entry.average}%</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Tile>

      {/* Latest materials: thumbnail cards that open the material pop-up */}
      <Tile index={7} className="xl:col-span-4">
        <TileHeader icon={History} title="Latest materials" onSeeAll={() => onJump({ section: "content", view: "materials" })} />
        {latestMaterials.length === 0 ? (
          <EmptyNote>No materials yet.</EmptyNote>
        ) : (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-3">
            {latestMaterials.map((item, index) => (
              <motion.li
                key={item.id}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.06 }}
                className={index > 2 ? "xl:hidden" : undefined}
              >
                <button
                  type="button"
                  onClick={() => onJump({ section: "content", view: "materials", openItemId: item.id })}
                  title={`${item.label}, updated ${formatDate(item.updatedAt)}`}
                  className="group flex w-full flex-col items-center gap-1.5 rounded-xl border border-blue-100 bg-[#f8fbff] p-2 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                  <span className="grid aspect-square w-full place-items-center overflow-hidden rounded-lg bg-[#fff]">
                    {item.symbolImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.symbolImageUrl} alt="" className="h-full w-full object-contain p-1.5" />
                    ) : (
                      <Hand className="h-6 w-6 text-emerald-500" aria-hidden="true" />
                    )}
                  </span>
                  <span className="w-full truncate text-xs font-semibold text-ink">{item.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] font-semibold",
                      item.contentType === "pecs" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                    )}
                  >
                    {item.contentType === "pecs" ? "PECS" : "Gesture"}
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </Tile>

      {/* Recent activity feed */}
      <Tile index={8} className="sm:col-span-2 xl:col-span-4">
        <TileHeader icon={Activity} title="Recent activity" onSeeAll={() => onJump({ section: "activity" })} />
        {logs.length === 0 ? (
          <EmptyNote>No activity yet.</EmptyNote>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {logs.slice(0, 5).map((log) => {
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
                    <p className="text-[11px] text-slate-400">{formatDateTime(log.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Tile>
    </div>
  );
}
