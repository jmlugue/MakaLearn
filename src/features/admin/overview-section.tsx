"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Activity, BookOpenCheck, ChevronRight, Gamepad2, GraduationCap, Hand, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Select } from "@/components/ui/form";
import { Avatar, describeActivity, formatDateTime } from "@/features/admin/admin-shared";
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

export function OverviewSection({
  adminName,
  users,
  items,
  media,
  activities,
  lessons,
  logs,
  onJump
}: {
  adminName: string;
  users: AppUser[];
  items: LearningItem[];
  media: MediaAsset[];
  activities: ActivityRecord[];
  lessons: Lesson[];
  logs: AuditLog[];
  onJump: (jump: OverviewJump) => void;
}) {
  const reduceMotion = useReducedMotion();
  const activeTeachers = users.filter((account) => account.role === "teacher" && account.status !== "deactivated").length;
  const manualLessons = lessons.filter((lesson) => lesson.source === "manual").length;
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

      {/* Recent activity: action-focused admin summary instead of raw account totals. */}
      <Tile index={1} className="xl:col-span-3 xl:row-span-2">
        <TileHeader icon={Activity} title="Recent activity" onSeeAll={() => onJump({ section: "activity" })} />
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
                    <p className="text-[11px] text-slate-400">{formatDateTime(log.createdAt)}</p>
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
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="#5eead4" strokeWidth="6" />
            <motion.circle
              cx="21"
              cy="21"
              r="15.9"
              fill="none"
              stroke="#fbbf24"
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
            <span className={cn("text-xl font-black", entityColors.pecs.text)}>{pecsCount}</span> <span className="text-xs font-semibold text-slate-500">PECS</span>
          </p>
          <p>
            <span className={cn("text-xl font-black", entityColors.gesture.text)}>{gestureCount}</span>{" "}
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
            className={cn(
              "group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              entityColors.activity.border,
              entityColors.activity.wash,
              entityColors.activity.hoverBorder
            )}
          >
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white shadow-sm", entityColors.activity.solid)}>
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
              <span className="block text-sm font-bold text-ink">Lessons</span>
              <span className="block truncate text-xs text-slate-500">
                {manualLessons} manual · {lessons.length - manualLessons} auto-generated
              </span>
            </span>
            <span className="text-3xl font-black text-ink">
              <CountUp value={lessons.length} />
            </span>
            <ChevronRight className={cn("h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5", entityColors.lesson.groupHoverText)} aria-hidden="true" />
          </Link>
        </div>
      </Tile>

      <Tile index={4} className="min-h-[20rem] sm:col-span-2 xl:col-span-12">
        <UsageTrend logs={logs} />
      </Tile>
    </div>
  );
}
