"use client";

import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Avatar, EmptyRow, logGroup, type LogFilter, Panel, SearchInput, titleCase } from "@/features/admin/admin-shared";
import type { AuditLog } from "@/types";

type ActionFilter = "all" | AuditLog["action"];

const actionLabels: Record<AuditLog["action"], string> = {
  login: "Sign-ins",
  logout: "Sign-outs",
  upload: "Uploads",
  create: "Creates",
  edit: "Edits",
  delete: "Deletes"
};

const actionTone: Record<AuditLog["action"], string> = {
  login: "bg-emerald-100 text-emerald-700",
  logout: "bg-slate-200 text-slate-600",
  create: "bg-blue-100 text-blue-700",
  upload: "bg-sky-100 text-sky-700",
  edit: "bg-amber-100 text-amber-700",
  delete: "bg-red-100 text-red-700"
};

const groupLabels = { accounts: "Account", content: "Content", admin: "Admin", other: "Other" } as const;

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
    const result = { all: logs.length, accounts: 0, content: 0, admin: 0 };
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
          log.detail.toLowerCase().includes(term)
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
            { value: "accounts", label: "Accounts", count: counts.accounts },
            { value: "content", label: "Content", count: counts.content },
            { value: "admin", label: "Admin", count: counts.admin }
          ]}
        />
        <div className="w-40">
          <Select aria-label="Filter by action" value={action} onChange={(event) => setAction(event.target.value as ActionFilter)}>
            <option value="all">All actions</option>
            {(Object.keys(actionLabels) as AuditLog["action"][]).map((key) => (
              <option key={key} value={key}>
                {actionLabels[key]}
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
          <table className="w-full min-w-[820px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-28" />
              <col className="w-52" />
              <col className="w-28" />
              <col className="w-28" />
              <col />
            </colgroup>
            <thead className="border-b border-blue-100 bg-[#f8fbff] text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">What</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <EmptyRow colSpan={5}>{filtersActive ? "No activity matches these filters." : "No activity yet."}</EmptyRow>
              ) : (
                visible.map((log, index) => {
                  const day = dayLabel(log.createdAt);
                  const showDay = index === 0 || dayLabel(visible[index - 1].createdAt) !== day;
                  return (
                    <Fragment key={log.id}>
                      {showDay ? (
                        <tr className="border-t border-blue-100 bg-slate-50/80 first:border-t-0">
                          <th colSpan={5} scope="colgroup" className="px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
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
                          <Badge className={actionTone[log.action]}>{titleCase(log.action)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{groupLabels[logGroup(log)]}</td>
                        <td className="px-4 py-3">
                          <p className="truncate font-semibold text-ink" title={log.targetTitle}>
                            {log.targetTitle}
                          </p>
                          {log.detail ? <p className="mt-0.5 text-slate-500">{log.detail}</p> : null}
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
