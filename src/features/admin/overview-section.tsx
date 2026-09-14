"use client";

import { ReactNode, useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Activity, ChevronRight, CircleCheck, Hand, ImageOff, Images, Layers, UserPlus, Users, UserX, VolumeX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar, formatDateTime } from "@/features/admin/admin-shared";
import type { ItemsFilter } from "@/features/admin/content-section";
import { cn } from "@/lib/utils";
import type { Activity as ActivityRecord, AppUser, AuditLog, LearningItem, Lesson, MediaAsset } from "@/types";

const actionVerbs: Record<AuditLog["action"], string> = {
  login: "signed in",
  logout: "signed out",
  create: "added",
  upload: "uploaded",
  edit: "updated",
  delete: "deleted"
};

export type OverviewJump =
  | { section: "accounts"; status?: "deactivated"; addTeacher?: boolean }
  | { section: "content"; itemsFilter: ItemsFilter }
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

function TileLabel({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
      <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
      {children}
    </p>
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
  const now = new Date();
  const teachers = users.filter((account) => account.role === "teacher");
  const activeTeachers = teachers.filter((account) => account.status === "active").length;
  const deactivated = users.filter((account) => account.status === "deactivated").length;
  const admins = users.filter((account) => account.role === "admin").length;
  const pecsCount = items.filter((item) => item.contentType === "pecs").length;
  const gestureCount = items.length - pecsCount;
  const pecsShare = items.length ? Math.round((pecsCount / items.length) * 100) : 0;
  const missingImage = items.filter((item) => item.contentType === "pecs" && !item.symbolImageUrl).length;
  const missingAudio = items.filter((item) => !item.audioUrl).length;
  const uploadsToday = logs.filter((log) => log.action === "upload" && isToday(log.createdAt)).length;
  const signInsToday = logs.filter((log) => log.action === "login" && isToday(log.createdAt)).length;
  const activeShare = teachers.length ? activeTeachers / teachers.length : 0;
  const ringLength = 2 * Math.PI * 15;
  const previewMedia = media.filter((asset) => asset.publicUrl && (asset.type === "symbol-image" || asset.type === "learner-photo")).slice(0, 4);

  const attention: { key: string; icon: LucideIcon; label: string; count: number; jump: OverviewJump }[] = [
    { key: "missing-image", icon: ImageOff, label: "PECS cards without an image", count: missingImage, jump: { section: "content", itemsFilter: "missing-image" } },
    { key: "missing-audio", icon: VolumeX, label: "Items without audio", count: missingAudio, jump: { section: "content", itemsFilter: "missing-audio" } },
    { key: "deactivated", icon: UserX, label: "Deactivated accounts", count: deactivated, jump: { section: "accounts", status: "deactivated" } }
  ];
  const needsAttention = attention.filter((entry) => entry.count > 0);

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
            onClick={() => onJump({ section: "accounts", addTeacher: true })}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#fff] px-4 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Add teacher
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
        <TileLabel icon={Users}>Teachers</TileLabel>
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
          <button type="button" onClick={() => onJump({ section: "accounts", status: "deactivated" })} className="rounded-lg bg-slate-50 py-2 hover:bg-blue-50">
            <span className="block text-base font-bold text-ink">{deactivated}</span>Deactivated
          </button>
          <div className="rounded-lg bg-slate-50 py-2">
            <span className="block text-base font-bold text-ink">{admins}</span>Admins
          </div>
        </div>
      </Tile>

      {/* Learning items split */}
      <Tile index={2}>
        <TileLabel icon={Layers}>Learning items</TileLabel>
        <p className="mt-2 text-3xl font-extrabold text-ink">
          <CountUp value={items.length} />
        </p>
        <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-blue-100" aria-hidden="true">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: reduceMotion ? `${pecsShare}%` : "0%" }}
            animate={{ width: `${pecsShare}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.25 }}
          />
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
        <TileLabel icon={Images}>Media files</TileLabel>
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
        <div className="flex items-center justify-between">
          <TileLabel icon={Activity}>Recent activity</TileLabel>
          <button
            type="button"
            onClick={() => onJump({ section: "activity" })}
            className="inline-flex items-center gap-0.5 rounded text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
          >
            View all <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="my-auto py-6 text-center text-sm font-semibold text-slate-500">No activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {logs.slice(0, 5).map((log) => (
              <li key={log.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={log.actorName} className="h-8 w-8 text-[11px]" />
                <p className="min-w-0 flex-1 truncate text-sm text-slate-600">
                  <span className="font-semibold text-ink">{log.actorName}</span>{" "}
                  {log.action === "login" || log.action === "logout" ? actionVerbs[log.action] : `${actionVerbs[log.action]} ${log.targetTitle}`}
                </p>
                <span className="shrink-0 text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tile>

      {/* Needs attention + activity and lesson totals */}
      <Tile index={5} className="flex flex-col sm:col-span-2 sm:row-span-2">
        <p className="text-sm font-semibold text-slate-500">Needs attention</p>
        {needsAttention.length === 0 ? (
          <p className="flex items-center gap-2 py-6 text-sm font-semibold text-emerald-700">
            <CircleCheck className="h-5 w-5" aria-hidden="true" /> All clear
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {needsAttention.map((entry) => (
              <li key={entry.key}>
                <button
                  type="button"
                  onClick={() => onJump(entry.jump)}
                  className="flex w-full items-center gap-3 rounded-lg py-2.5 text-left transition hover:bg-blue-50/50 focus-visible:bg-blue-50 focus-visible:outline-none"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
                    <entry.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="flex-1 text-sm font-semibold text-ink">{entry.label}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">{entry.count}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">Activities</p>
            <p className="text-2xl font-extrabold text-ink">
              <CountUp value={activities.length} />
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Lessons</p>
            <p className="text-2xl font-extrabold text-ink">
              <CountUp value={lessons.length} />
            </p>
          </div>
        </div>
      </Tile>
    </div>
  );
}
