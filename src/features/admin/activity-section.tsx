"use client";

import { Fragment, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Avatar, describeActivity, EmptyRow, logGroup, type LogFilter, Panel, SearchInput } from "@/features/admin/admin-shared";
import type { AuditLog } from "@/types";

type ActionFilter = "all" | AuditLog["action"];

const actionFilterLabels: Record<AuditLog["action"], string> = {
  login: "Sign-ins",
  logout: "Sign-outs",
  upload: "Uploads",
  create: "Added",
  edit: "Edited",
  delete: "Deleted"
};

// Dot color hints at the kind of change without adding another column.
const actionDot: Record<AuditLog["action"], string> = {
  login: "bg-emerald-500",
  logout: "bg-slate-400",
  create: "bg-blue-600",
  upload: "bg-sky-500",
  edit: "bg-amber-500",
  delete: "bg-red-500"
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

export function ActivitySection({
  logs,
  hasMore,
  loadingMore,
  onLoadMore,
  filter,
  onFilterChange
}: {
  logs: AuditLog[];
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  filter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
}) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<ActionFilter>("all");
  const [actor, setActor] = useState("all");

  const counts = useMemo(() => {
    const result = { all: logs.length, "sign-ins": 0, content: 0, accounts: 0 };
    logs.forEach((log) => {
      const group = logGroup(log);
      if (group !== "other") result[group] += 1;
    });
    return result;
  }, [logs]);

  const actors = useMemo(
    () => Array.from(new Map(logs.map((log) => [log.actorId, log.actorName])).entries()).sort((a, b) => a[1].localeCompare(b[1])),
    [logs]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs
      .filter((log) => filter === "all" || logGroup(log) === filter)
      .filter((log) => action === "all" || log.action === action)
      .filter((log) => actor === "all" || log.actorId === actor)
      .filter(
        (log) =>
          !term ||
          log.actorName.toLowerCase().includes(term) ||
          log.targetTitle.toLowerCase().includes(term) ||
          log.detail.toLowerCase().includes(term) ||
          describeActivity(log).sentence.toLowerCase().includes(term)
      );
  }, [action, actor, filter, logs, search]);

  const filtersActive = action !== "all" || actor !== "all" || search.trim() !== "" || filter !== "all";

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Log type"
          value={filter}
          onChange={onFilterChange}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "sign-ins", label: "Sign-ins", count: counts["sign-ins"] },
            { value: "content", label: "Content", count: counts.content },
            { value: "accounts", label: "Accounts", count: counts.accounts }
          ]}
        />
        <div className="w-36">
          <Select aria-label="Filter by action" value={action} onChange={(event) => setAction(event.target.value as ActionFilter)}>
            <option value="all">All actions</option>
            {(Object.keys(actionFilterLabels) as AuditLog["action"][]).map((key) => (
              <option key={key} value={key}>
                {actionFilterLabels[key]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select aria-label="Filter by person" value={actor} onChange={(event) => setActor(event.target.value)}>
            <option value="all">Everyone</option>
            {actors.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div className="ml-auto flex min-w-0 flex-1 justify-end">
          <SearchInput value={search} onChange={setSearch} placeholder="Search person or item" label="Search activity" />
        </div>
      </div>

      <Panel>
        <div className="overflow-x-auto clean-scrollbar">
          <table className="w-full min-w-[780px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-28" />
              <col className="w-52" />
              <col className="w-64" />
              <col />
            </colgroup>
            <thead className="border-b border-blue-100 bg-[#f8fbff] text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">What happened</th>
                <th className="px-4 py-3">Item</th>
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
                      <tr className="border-t border-slate-100 align-top hover:bg-blue-50/40">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">{timeLabel(log.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <Avatar name={log.actorName} className="h-7 w-7 text-[10px]" />
                            <span className="truncate font-semibold text-ink">{log.actorName}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2 text-ink">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${actionDot[log.action]}`} aria-hidden="true" />
                            {sentence}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isSession ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <>
                              <p className="truncate" title={log.targetTitle}>
                                <span className="font-semibold text-ink">{log.targetTitle}</span>
                                {itemType ? <span className="text-slate-400"> · {itemType}</span> : null}
                              </p>
                              {log.detail ? <p className="mt-0.5 text-xs text-slate-500">{log.detail}</p> : null}
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
    </div>
  );
}
