"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, ClipboardList, KeyRound, Shield, ToggleLeft, ToggleRight, Upload, UserCog, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldHint, Input, Label, Select } from "@/components/ui/form";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { fetchAuditLogs } from "@/lib/audit-logs";
import { fetchMakaLearnData, updateProfileRole } from "@/lib/supabase/app-data";
import { formatDate } from "@/lib/utils";
import type { Activity as ActivityRecord, AppUser, AuditLog, LearningItem, MediaAsset, UserRole } from "@/types";

type ContentLogFilter = "all" | "upload" | "create" | "edit" | "delete";

export function AdminPanelView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [itemRecords, setItemRecords] = useState<LearningItem[]>([]);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>([]);
  const [uploadRecords, setUploadRecords] = useState<MediaAsset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [contentLogFilter, setContentLogFilter] = useState<ContentLogFilter>("all");
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active) return;
        setUsers(data.users);
        setItemRecords(data.learningItems);
        setActivityRecords(data.activities);
        setUploadRecords(data.mediaAssets);
      } catch (error) {
        notify({
          title: "Admin data unavailable",
          description: "Supabase admin data could not be loaded.",
          tone: "error"
        });
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
    };
  }, [notify]);

  useEffect(() => {
    let active = true;

    async function loadAuditLogs() {
      try {
        const logs = await fetchAuditLogs();
        if (active) {
          setAuditLogs(logs);
        }
      } catch {
        if (active) setAuditLogs([]);
      }
    }

    loadAuditLogs();

    return () => {
      active = false;
    };
  }, []);

  const teacherCount = users.filter((candidate) => candidate.role === "teacher").length;
  const adminCount = users.filter((candidate) => candidate.role === "admin").length;
  const pecsCount = itemRecords.filter((item) => item.contentType === "pecs").length;
  const visibleLogs = auditLogs;
  const accountLogs = visibleLogs.filter((log) => log.category === "auth");
  const contentLogs = visibleLogs.filter(
    (log) => log.category === "content" && (contentLogFilter === "all" || log.action === contentLogFilter)
  );

  async function changeRole(candidate: AppUser, role: UserRole) {
    try {
      const saved = await updateProfileRole(candidate.id, role);
      setUsers((current) => current.map((item) => (item.id === candidate.id ? saved : item)));
      notify({ title: "Role updated", description: `${candidate.name} was saved to profiles.`, tone: "success" });
    } catch {
      setUsers((current) => current.map((item) => (item.id === candidate.id ? candidate : item)));
      notify({
        title: "Role update failed",
        description: "The role could not be updated. Try again."
      });
    }
  }

  async function toggleAccountStatus(candidate: AppUser) {
    const nextStatus = candidate.status === "deactivated" ? "active" : "deactivated";
    try {
      const response = await fetch("/api/admin/account-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: candidate.id, status: nextStatus })
      });
      const payload = (await response.json().catch(() => ({}))) as { user?: AppUser; error?: string };
      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Account status could not be updated.");
      }
      setUsers((current) => current.map((item) => (item.id === candidate.id ? payload.user as AppUser : item)));
      notify({
        title: nextStatus === "active" ? "Account activated" : "Account deactivated",
        description: `${candidate.name} was updated.`,
        tone: "success"
      });
    } catch (error) {
      notify({
        title: "Account update failed",
        description: error instanceof Error ? error.message : "Account status could not be updated.",
        tone: "error"
      });
    }
  }

  async function resetTeacherPassword(candidate: AppUser) {
    if (candidate.role !== "teacher") {
      notify({ title: "Teacher account required", description: "Only teacher passwords can be reset from this panel." });
      return;
    }

    const confirmed = window.confirm(`Set a temporary password for ${candidate.name}?`);
    if (!confirmed) return;

    setResettingPasswordUserId(candidate.id);

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId: candidate.id })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Password reset could not be completed.");
      }

      notify({
        title: "Temporary password set",
        description: `${candidate.name} can sign in with the configured temporary password.`,
        tone: "success"
      });
    } catch (error) {
      notify({
        title: "Password reset failed",
        description: error instanceof Error ? error.message : "Password reset could not be completed.",
        tone: "error"
      });
    } finally {
      setResettingPasswordUserId(null);
    }
  }

  async function createTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("teacherName") ?? "").trim();
    const email = String(form.get("teacherEmail") ?? "").trim();

    if (!name || !email.includes("@")) {
      notify({ title: "Check teacher details", description: "Enter a teacher name and valid email address." });
      return;
    }

    try {
      const response = await fetch("/api/admin/create-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email })
      });
      const payload = (await response.json().catch(() => ({}))) as { user?: AppUser; error?: string };
      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? "Teacher account could not be created.");
      }

      setUsers((current) => [payload.user as AppUser, ...current.filter((candidate) => candidate.id !== payload.user?.id)]);
      event.currentTarget.reset();
      notify({
        title: "Teacher account created",
        description: "Teacher account was added.",
        tone: "success"
      });
    } catch (error) {
      notify({
        title: "Teacher account not created",
        description: error instanceof Error ? error.message : "Teacher account could not be created.",
        tone: "error"
      });
    }
  }

  if (user.role !== "admin") {
    return (
      <Card>
        <CardTitle>Admin access required</CardTitle>
        <CardDescription>The Admin Panel is visible only for admin users.</CardDescription>
        <Link href="/login" className="mt-4 inline-flex">
          <Button>Sign in as admin</Button>
        </Link>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin Panel"
        title="Administration workspace"
        description="Create accounts, manage roles, monitor teacher-managed content, and review system logs."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UserCog} label="Teachers" value={teacherCount} />
        <StatCard icon={Shield} label="Admins" value={adminCount} />
        <StatCard icon={BookOpen} label="PECS cards" value={pecsCount} />
        <StatCard icon={Activity} label="Activities" value={activityRecords.length} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-[#fbfdff]">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-600 text-white">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Create teacher account</CardTitle>
              <CardDescription>Admins own teacher account creation and activation status.</CardDescription>
            </div>
          </div>
          <form className="mt-5 space-y-4" onSubmit={createTeacher}>
            <div>
              <Label htmlFor="teacherName">Teacher name</Label>
              <Input id="teacherName" name="teacherName" placeholder="Teacher name" required />
            </div>
            <div>
              <Label htmlFor="teacherEmail">Email</Label>
              <Input id="teacherEmail" name="teacherEmail" type="email" placeholder="teacher@school.edu" required />
              <FieldHint>Use the teacher&apos;s school email address.</FieldHint>
            </div>
            <Button type="submit">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Create teacher
            </Button>
          </form>
        </Card>

        <Card className="flex h-full flex-col">
          <CardTitle>Account management</CardTitle>
          <CardDescription>View every admin and teacher account so role changes can be reversed later.</CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {users.map((account) => {
              const isCurrentUser = account.id === user.id;

              return (
                <div key={account.id} className="rounded-lg border border-blue-100 bg-skywash p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{account.name}</p>
                      <p className="text-sm text-slate-600">{account.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-white text-blue-700">{account.role}</Badge>
                      <Badge className={account.status === "deactivated" ? "bg-coral text-orange-700" : "bg-mint text-green-700"}>
                        {account.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <div>
                      <Label htmlFor={`role-${account.id}`} className="sr-only">
                        Role for {account.name}
                      </Label>
                      <Select
                        id={`role-${account.id}`}
                        value={account.role}
                        onChange={(event) => changeRole(account, event.target.value as UserRole)}
                        disabled={isCurrentUser}
                      >
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </Select>
                      {isCurrentUser ? (
                        <FieldHint>Sign in with another admin to change your own role.</FieldHint>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {account.role === "teacher" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => resetTeacherPassword(account)}
                          disabled={isCurrentUser || resettingPasswordUserId === account.id}
                        >
                          <KeyRound className="h-4 w-4" aria-hidden="true" />
                          {resettingPasswordUserId === account.id ? "Setting..." : "Temp password"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => toggleAccountStatus(account)}
                        disabled={isCurrentUser}
                      >
                        {account.status === "deactivated" ? (
                          <ToggleRight className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                        )}
                        {account.status === "deactivated" ? "Activate" : "Deactivate"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardTitle>Teacher-managed content</CardTitle>
          <CardDescription>Monitor the content teachers can create and edit.</CardDescription>
          <div className="mt-4 overflow-x-auto rounded-lg border border-blue-100 clean-scrollbar">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#f8fbff] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Content</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Created by</th>
                  <th className="px-3 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {itemRecords.map((item) => (
                  <tr key={item.id} className="border-t border-blue-100">
                    <td className="px-3 py-3 font-semibold">{item.label}</td>
                    <td className="px-3 py-3 uppercase">{item.contentType}</td>
                    <td className="px-3 py-3">{users.find((candidate) => candidate.id === item.createdBy)?.name ?? "MakaLearn user"}</td>
                    <td className="px-3 py-3">{formatDate(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Account activity</CardTitle>
          </div>
          <CardDescription>Login and logout records for teacher and admin accounts.</CardDescription>
          <LogList logs={accountLogs} emptyText="No login or logout logs yet." />
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Content activity</CardTitle>
          </div>
          <CardDescription>Filter uploads, creates, edits, and deletes.</CardDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["all", "upload", "create", "edit", "delete"] as ContentLogFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setContentLogFilter(filter)}
                className={`min-h-9 rounded-lg border px-3 text-sm font-semibold capitalize transition ${
                  contentLogFilter === filter
                    ? "border-blue-500 bg-blue-600 text-white"
                    : "border-blue-100 bg-white text-slate-700 hover:border-blue-300"
                }`}
              >
                {filter === "all" ? "All" : `${filter}s`}
              </button>
            ))}
          </div>
          <LogList logs={contentLogs} emptyText="No content logs match this filter." />
        </Card>
      </section>
    </>
  );
}

function LogList({ logs, emptyText }: { logs: AuditLog[]; emptyText: string }) {
  return (
    <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1 clean-scrollbar">
      {logs.length ? (
        logs.map((log) => (
          <div key={log.id} className="rounded-lg border border-blue-100 bg-[#f8fbff] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                {log.action} / {log.targetType}
              </p>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                {formatDate(log.createdAt)}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{log.targetTitle}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{log.detail}</p>
            <p className="mt-2 text-xs text-slate-500">By {log.actorName}</p>
          </div>
        ))
      ) : (
        <p className="rounded-lg border border-dashed border-blue-100 bg-skywash p-4 text-sm font-semibold text-slate-600">
          {emptyText}
        </p>
      )}
    </div>
  );
}
