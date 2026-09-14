"use client";

import { ReactNode } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { AppUser, AuditLog } from "@/types";

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)).toUpperCase();
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white", className)}>
      {initialsOf(name)}
    </span>
  );
}

export function RoleBadge({ role }: { role: AppUser["role"] }) {
  return <Badge className={role === "admin" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}>{titleCase(role)}</Badge>;
}

export function StatusBadge({ status }: { status: AppUser["status"] }) {
  const tone =
    status === "active" ? "bg-emerald-100 text-emerald-700" : status === "invited" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600";
  return <Badge className={tone}>{titleCase(status)}</Badge>;
}

export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      {/* z-10: the Input's backdrop blur creates a layer that would otherwise hide the icon. */}
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <Input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="pl-9" />
    </div>
  );
}

/** White rounded surface used for tables and lists in the Admin sections. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-2xl border border-blue-100 bg-[#fff] shadow-sm", className)}>{children}</div>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
        {children}
      </td>
    </tr>
  );
}

export type LogFilter = "all" | "accounts" | "content" | "admin";

/** Maps a log to the Activity log filter it belongs to. Login/logout logs count as Accounts. */
export function logGroup(log: AuditLog): Exclude<LogFilter, "all"> | "other" {
  if (log.category === "auth") return "accounts";
  if (log.category === "admin") return "admin";
  if (log.category === "content") return "content";
  return "other";
}
