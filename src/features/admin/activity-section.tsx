"use client";

import { Fragment, useMemo, useState } from "react";
import { Clock, FileText, LayoutGrid, Layers, List, LogIn, LogOut, Pencil, Plus, Tag, Trash2, Upload, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Avatar,
  describeActivity,
  DetailList,
  DetailNote,
  DetailRow,
  EmptyRow,
  FilterPills,
  FilterSelect,
  logGroup,
  logRangeLabels,
  type LogFilter,
  type LogRange,
  Panel,
  SearchInput
} from "@/features/admin/admin-shared";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@/types";

// Palette roles: green = added/signed in, yellow = edited, red = deleted, slate = signed out.
const actionDot: Record<AuditLog["action"], string> = {
  login: "bg-emerald-400",
  create: "bg-emerald-400",
  upload: "bg-emerald-400",
  edit: "bg-amber-300",
  delete: "bg-red-400",
  logout: "bg-slate-300"
};

const tabNames: Record<ReturnType<typeof logGroup>, string> = {
  "sign-ins": "Sign-ins",
  content: "Content",
  accounts: "Accounts",
  other: "Other"
};

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(date);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function fullDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

// The log pop-up shows the action as a colored icon tile, in the same meaning colors as the dots.
const actionStyle: Record<AuditLog["action"], { icon: LucideIcon; tile: string }> = {
  login: { icon: LogIn, tile: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  create: { icon: Plus, tile: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  upload: { icon: Upload, tile: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  edit: { icon: Pencil, tile: "bg-amber-50 text-amber-700 ring-amber-200" },
  delete: { icon: Trash2, tile: "bg-red-50 text-red-600 ring-red-200" },
  logout: { icon: LogOut, tile: "bg-slate-100 text-slate-600 ring-slate-200" }
};

function LogDetails({ log }: { log: AuditLog }) {
  const { sentence, itemType } = describeActivity(log);
  const style = actionStyle[log.action];
  const isSession = log.action === "login" || log.action === "logout";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pr-10">
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1", style.tile)}>
          <style.icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xl font-extrabold tracking-[-0.02em] text-ink">{sentence}</p>
          <p className="text-sm text-slate-500">
            {dayLabel(log.createdAt)}, {timeLabel(log.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-[#fff] px-3 py-2.5">
        <Avatar name={log.actorName} />
        <p className="min-w-0 truncate text-sm font-semibold text-ink">{log.actorName}</p>
      </div>

      <DetailList>
        {!isSession ? (
          <>
            <DetailRow icon={FileText} label="Record">
              {log.targetTitle}
            </DetailRow>
            {itemType ? (
              <DetailRow icon={Tag} label="Type">
                {itemType}
              </DetailRow>
            ) : null}
          </>
        ) : null}
        <DetailRow icon={LayoutGrid} label="Area">
          {tabNames[logGroup(log)]}
        </DetailRow>
        <DetailRow icon={Clock} label="When">
          {fullDateTime(log.createdAt)}
        </DetailRow>
      </DetailList>

      {log.detail ? <DetailNote>{log.detail}</DetailNote> : null}
    </div>
  );
}

export function ActivitySection({
  logs,
  hasMore,
  loadingMore,
  onLoadMore,
  filter,
  onFilterChange,
  range,
  onRangeChange
}: {
  logs: AuditLog[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  filter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
  range: LogRange;
  onRangeChange: (range: LogRange) => void;
}) {
  const [search, setSearch] = useState("");
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const openLog = openLogId ? logs.find((log) => log.id === openLogId) ?? null : null;

  const counts = useMemo(() => {
    const result = { all: logs.length, "sign-ins": 0, content: 0, accounts: 0 };
    logs.forEach((log) => {
      const group = logGroup(log);
      if (group !== "other") result[group] += 1;
    });
    return result;
  }, [logs]);

  // One search box covers user, action, and record, so the list stays usable with many accounts.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs
      .filter((log) => filter === "all" || logGroup(log) === filter)
      .filter(
        (log) =>
          !term ||
          log.actorName.toLowerCase().includes(term) ||
          log.targetTitle.toLowerCase().includes(term) ||
          log.detail.toLowerCase().includes(term) ||
          describeActivity(log).sentence.toLowerCase().includes(term)
      );
  }, [filter, logs, search]);

  const filtersActive = search.trim() !== "" || filter !== "all" || range !== "all";

  return (
    <div className="w-full space-y-4">
      <FilterPills
        label="Log type"
        value={filter}
        onChange={onFilterChange}
        options={[
          { value: "all", label: "All", icon: List, count: counts.all },
          { value: "sign-ins", label: "Sign-ins", icon: LogIn, count: counts["sign-ins"] },
          { value: "content", label: "Content", icon: Layers, count: counts.content },
          { value: "accounts", label: "Accounts", icon: Users, count: counts.accounts }
        ]}
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="Date"
          className="w-48"
          value={range}
          onChange={onRangeChange}
          options={(Object.keys(logRangeLabels) as LogRange[]).map((value) => ({ value, label: logRangeLabels[value] }))}
        />
        <div className="ml-auto flex min-w-0 flex-1 justify-end">
          <SearchInput value={search} onChange={setSearch} placeholder="Search user, action, or record" label="Search activity" />
        </div>
      </div>

      <Panel>
        <div className="overflow-x-auto clean-scrollbar">
          <table className="w-full min-w-[720px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-28" />
              <col className="w-56" />
              <col className="w-72" />
              <col />
            </colgroup>
            <thead className="border-b border-blue-100 bg-[#f8fbff] text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Record</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <EmptyRow colSpan={4}>{filtersActive ? "No activity matches these filters." : "No activity yet."}</EmptyRow>
              ) : (
                visible.map((log, index) => {
                  const day = dayLabel(log.createdAt);
                  const showDay = index === 0 || dayLabel(visible[index - 1].createdAt) !== day;
                  const { sentence, itemType } = describeActivity(log);
                  const isSession = log.action === "login" || log.action === "logout";
                  return (
                    <Fragment key={log.id}>
                      {showDay ? (
                        <tr className="border-t border-blue-100 bg-slate-50/80 first:border-t-0">
                          <th colSpan={4} scope="colgroup" className="px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                            {day}
                          </th>
                        </tr>
                      ) : null}
                      <tr onClick={() => setOpenLogId(log.id)} className="cursor-pointer border-t border-slate-100 hover:bg-blue-50/60">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{timeLabel(log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <Avatar name={log.actorName} className="h-7 w-7 text-[10px]" />
                            <span className="truncate font-semibold text-ink">{log.actorName}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {/* Real button so the details pop-up opens from the keyboard too. */}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setOpenLogId(log.id);
                            }}
                            className="flex items-center gap-2 rounded text-left text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${actionDot[log.action]}`} aria-hidden="true" />
                            {sentence}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          {isSession ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <>
                              <p className="truncate font-semibold text-ink" title={log.targetTitle}>
                                {log.targetTitle}
                              </p>
                              {itemType ? <p className="truncate text-xs text-slate-500">{itemType}</p> : null}
                            </>
                          )}
                        </td>
                      </tr>
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          Showing {visible.length} of {logs.length} loaded
        </span>
        {hasMore ? (
          <Button type="button" variant="secondary" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        ) : (
          <span>All activity loaded</span>
        )}
      </div>

      <Dialog
        open={Boolean(openLog)}
        onClose={() => setOpenLogId(null)}
        title={openLog ? describeActivity(openLog).sentence : "Activity"}
        hideHeader
      >
        {openLog ? <LogDetails log={openLog} /> : null}
      </Dialog>
    </div>
  );
}
