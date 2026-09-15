"use client";

import { ReactNode, useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Activity, ChevronRight, Hand, Images, Layers, PieChart, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, describeActivity, formatDateTime } from "@/features/admin/admin-shared";
import type { ContentView } from "@/features/admin/content-section";
import { cn } from "@/lib/utils";
import type { Activity as ActivityRecord, AppUser, AuditLog, Category, LearningItem, Lesson, MediaAsset } from "@/types";

export type OverviewJump =
  | { section: "accounts"; status?: "deactivated"; addAccount?: boolean }
  | { section: "content"; view?: ContentView }
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
function CountUp({ value }: { value: number }) {
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

  return <>{display}</>;
}

function Tile({ children, className, index }: { children: ReactNode; className?: string; index: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-blue-100/80 bg-[#fff] p-5 shadow-[0_8px_24px_rgba(37,99,235,0.06)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/** Tile heading with an optional "See all" shortcut on the right. */
function TileHeader({ icon: Icon, title, onSeeAll }: { icon: LucideIcon; title: string; onSeeAll?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
        <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
        {title}
      </p>
      {onSeeAll ? (
        <button
          type="button"
          onClick={onSeeAll}
          aria-label={`See all ${title.toLowerCase()}`}
          className="inline-flex items-center gap-0.5 rounded text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          See all <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

function AnimatedBar({ share, className, delay = 0.25 }: { share: number; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  const width = `${Math.round(share * 100)}%`;
  return (
    <motion.div
      className={cn("h-full rounded-full bg-blue-600", className)}
      initial={{ width: reduceMotion ? width : "0%" }}
      animate={{ width }}
      transition={{ duration: 1, ease: "easeOut", delay }}
    />
  );
}

const mediaTypeRows: { type: MediaAsset["type"]; label: string }[] = [
  { type: "symbol-image", label: "Symbol images" },
  { type: "gesture-media", label: "Gesture media" },
  { type: "audio-file", label: "Audio" },
  { type: "learner-photo", label: "Learner photos" }
];

export function OverviewSection({
  adminName,
  users,
  categories,
  items,
  media,
  activities,
  lessons,
  logs,
  onJump
}: {
  adminName: string;
  users: AppUser[];
  categories: Category[];
  items: LearningItem[];
  media: MediaAsset[];
  activities: ActivityRecord[];
  lessons: Lesson[];
  logs: AuditLog[];
  onJump: (jump: OverviewJump) => void;
}) {
  const reduceMotion = useReducedMotion();
  const now = new Date();
  const teachers = users.filter((account) => account.role === "teacher");
  const activeTeachers = teachers.filter((account) => account.status === "active").length;
  const deactivated = users.filter((account) => account.status === "deactivated").length;
  const admins = users.filter((account) => account.role === "admin").length;
  const pecsCount = items.filter((item) => item.contentType === "pecs").length;
  const gestureCount = items.length - pecsCount;
  const uploadsToday = logs.filter((log) => log.action === "upload" && isToday(log.createdAt)).length;
  const signInsToday = logs.filter((log) => log.action === "login" && isToday(log.createdAt)).length;
  const activeShare = teachers.length ? activeTeachers / teachers.length : 0;
  const ringLength = 2 * Math.PI * 15;
  const previewMedia = media.filter((asset) => asset.publicUrl && (asset.type === "symbol-image" || asset.type === "learner-photo")).slice(0, 4);
  const mediaByType = mediaTypeRows.map((row) => ({ ...row, count: media.filter((asset) => asset.type === row.type).length }));
  const largestMediaType = Math.max(1, ...mediaByType.map((row) => row.count));

  return (
    <div className="grid auto-rows-[minmax(7rem,auto)] grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Greeting tile with quick actions */}
      <Tile index={0} className="flex flex-col border-0 bg-gradient-to-br from-blue-600 to-blue-500 text-white sm:col-span-2 sm:row-span-2">
        <Hand className="pointer-events-none absolute -bottom-8 -right-6 h-44 w-44 text-white/15" strokeWidth={1.3} aria-hidden="true" />
        <p className="text-sm font-semibold text-blue-100">
          {new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(now)}
        </p>
        <p className="mt-2 text-3xl font-extrabold tracking-[-0.03em]">
          {greeting(now)}, {adminName.split(" ")[0]}
        </p>
        <p className="mt-2 text-sm text-blue-100">
          {activeTeachers} {activeTeachers === 1 ? "teacher" : "teachers"} active · {uploadsToday} {uploadsToday === 1 ? "upload" : "uploads"} today ·{" "}
          {signInsToday} {signInsToday === 1 ? "sign-in" : "sign-ins"} today
        </p>
        <div className="relative mt-auto flex flex-wrap gap-2 pt-6">
          <button
            type="button"
            onClick={() => onJump({ section: "accounts", addAccount: true })}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#fff] px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Add account
          </button>
          <button
            type="button"
            onClick={() => onJump({ section: "activity" })}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-bold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            View activity
          </button>
        </div>
      </Tile>

      {/* Teachers ring */}
      <Tile index={1} className="flex flex-col sm:row-span-2">
        <TileHeader icon={Users} title="Teachers" onSeeAll={() => onJump({ section: "accounts" })} />
        <div className="relative mx-auto my-4 h-32 w-32">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#e6edf7" strokeWidth="4.5" />
            <motion.circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#2563eb"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeDasharray={ringLength}
              initial={{ strokeDashoffset: reduceMotion ? ringLength * (1 - activeShare) : ringLength }}
              animate={{ strokeDashoffset: ringLength * (1 - activeShare) }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-3xl font-extrabold text-ink">
                <CountUp value={activeTeachers} />
              </p>
              <p className="text-xs font-semibold text-slate-500">active of {teachers.length}</p>
            </div>
          </div>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2 text-center text-xs font-semibold text-slate-500">
          <button
            type="button"
            onClick={() => onJump({ section: "accounts", status: "deactivated" })}
            className="rounded-lg bg-slate-50 py-2 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            <span className="block text-base font-bold text-ink">{deactivated}</span>Deactivated
          </button>
          <div className="rounded-lg bg-slate-50 py-2">
            <span className="block text-base font-bold text-ink">{admins}</span>Admins
          </div>
        </div>
      </Tile>

      {/* Learning items split */}
      <Tile index={2}>
        <TileHeader icon={Layers} title="Learning items" onSeeAll={() => onJump({ section: "content", view: "items" })} />
        <p className="mt-2 text-3xl font-extrabold text-ink">
          <CountUp value={items.length} />
        </p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-blue-100" aria-hidden="true">
          <AnimatedBar share={items.length ? pecsCount / items.length : 0} className="rounded-none" />
        </div>
        <p className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />
            {pecsCount} PECS
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-200" />
            {gestureCount} Gestures
          </span>
        </p>
      </Tile>

      {/* Media preview */}
      <Tile index={3}>
        <TileHeader icon={Images} title="Media files" onSeeAll={() => onJump({ section: "content", view: "media" })} />
        <p className="mt-2 text-3xl font-extrabold text-ink">
          <CountUp value={media.length} />
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          {previewMedia.map((asset) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={asset.id} src={asset.publicUrl} alt="" className="h-8 w-8 rounded-lg border border-blue-100 bg-[#f8fbff] object-contain" />
          ))}
          {media.length > previewMedia.length ? (
            <span className="text-xs font-semibold text-slate-500">+{media.length - previewMedia.length}</span>
          ) : null}
        </div>
      </Tile>

      {/* Recent activity */}
      <Tile index={4} className="flex flex-col sm:col-span-2 sm:row-span-2">
        <TileHeader icon={Activity} title="Recent activity" onSeeAll={() => onJump({ section: "activity" })} />
        {logs.length === 0 ? (
          <p className="my-auto py-6 text-center text-sm font-semibold text-slate-500">No activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {logs.slice(0, 5).map((log) => {
              const { sentence } = describeActivity(log);
              const showTitle = log.action !== "login" && log.action !== "logout";
              return (
                <li key={log.id} className="flex items-center gap-3 py-2.5">
                  <Avatar name={log.actorName} className="h-8 w-8 text-[11px]" />
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-600">
                    <span className="font-semibold text-ink">{log.actorName}</span> {sentence.charAt(0).toLowerCase() + sentence.slice(1)}
                    {showTitle ? <span className="text-ink">: {log.targetTitle}</span> : null}
                  </p>
                  <span className="shrink-0 text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Tile>

      {/* Content breakdown */}
      <Tile index={5} className="flex flex-col sm:col-span-2 sm:row-span-2">
        <TileHeader icon={PieChart} title="Content breakdown" onSeeAll={() => onJump({ section: "content" })} />
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "Categories", value: categories.length },
            { label: "Lessons", value: lessons.length },
            { label: "Activities", value: activities.length }
          ].map((entry) => (
            <div key={entry.label} className="rounded-xl bg-[#f8fbff] px-3 py-3">
              <p className="text-2xl font-extrabold text-ink">
                <CountUp value={entry.value} />
              </p>
              <p className="text-xs font-semibold text-slate-500">{entry.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Media by type</p>
        <ul className="mt-2 space-y-2.5">
          {mediaByType.map((row, index) => (
            <li key={row.type} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
              <span className="truncate text-slate-600">{row.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-blue-50" aria-hidden="true">
                <AnimatedBar share={row.count / largestMediaType} delay={0.3 + index * 0.08} />
              </span>
              <span className="text-right font-semibold text-ink">{row.count}</span>
            </li>
          ))}
        </ul>
      </Tile>
    </div>
  );
}
