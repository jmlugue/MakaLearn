"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, BookOpen, ClipboardList, Shield, ToggleLeft, ToggleRight, Upload, UserCog, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldHint, Input, Label, Select } from "@/components/ui/form";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { fetchAuditLogs } from "@/lib/audit-logs";
import { activities, demoUsers, learningItems, mediaAssets } from "@/data/mock-data";
import { fetchMakaLearnData, updateProfileRole } from "@/lib/supabase/app-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { Activity as ActivityRecord, AppUser, AuditLog, LearningItem, MediaAsset, UserRole } from "@/types";

type ContentLogFilter = "all" | "upload" | "create" | "edit" | "delete";

export function AdminPanelView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [users, setUsers] = useState<AppUser[]>(demoUsers);
  const [itemRecords, setItemRecords] = useState<LearningItem[]>(learningItems);
  const [activityRecords, setActivityRecords] = useState<ActivityRecord[]>(activities);
  const [uploadRecords, setUploadRecords] = useState<MediaAsset[]>(mediaAssets);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [contentLogFilter, setContentLogFilter] = useState<ContentLogFilter>("all");

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        setUsers(data.users.length ? data.users : demoUsers);
        setItemRecords(data.learningItems.length ? data.learningItems : learningItems);
        setActivityRecords(data.activities.length ? data.activities : activities);
        setUploadRecords(data.mediaAssets.length ? data.mediaAssets : mediaAssets);
      } catch (error) {
        notify({
          title: "Admin data ready",
          description: "Saved admin data is available in this workspace."
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
      const logs = await fetchAuditLogs();
      if (active) {
        setAuditLogs(logs);
      }
    }

    loadAuditLogs();

    return () => {
      active = false;
    };
  }, []);

  const teachers = users.filter((candidate) => candidate.role === "teacher");
  const pecsCount = itemRecords.filter((item) => item.contentType === "pecs").length;
  const gestureCount = itemRecords.filter((item) => item.contentType === "gesture").length;
  const previewLogs = useMemo<AuditLog[]>(
    () => [
      ...users.slice(0, 4).map((candidate) => ({
        id: `preview-auth-${candidate.id}`,
        category: "auth" as const,
        action: candidate.status === "deactivated" ? ("logout" as const) : ("login" as const),
        actorId: candidate.id,
        actorName: candidate.name,
        targetType: "session",
        targetTitle: candidate.status === "deactivated" ? "Signed out" : "Signed in",
        detail: `${candidate.name} is ${candidate.status}.`,
        createdAt: new Date().toISOString()
      })),
      ...uploadRecords.slice(0, 3).map((asset) => ({
        id: `preview-upload-${asset.id}`,
        category: "content" as const,
        action: "upload" as const,
        actorId: asset.uploadedBy,
        actorName: users.find((candidate) => candidate.id === asset.uploadedBy)?.name ?? "MakaLearn user",
        targetType: "media",
        targetId: asset.id,
        targetTitle: asset.title,
        detail: `${asset.title} in ${asset.bucket}.`,
        createdAt: asset.uploadedAt
      })),
      ...activityRecords.slice(0, 3).map((activity) => ({
        id: `preview-activity-${activity.id}`,
        category: "content" as const,
        action: "edit" as const,
        actorId: activity.createdBy,
        actorName: users.find((candidate) => candidate.id === activity.createdBy)?.name ?? "MakaLearn user",
        targetType: "activity",
        targetId: activity.id,
        targetTitle: activity.title,
        detail: `${activity.title} uses ${activity.learningItemIds.length} PECS card(s).`,
        createdAt: new Date().toISOString()
      }))
    ],
    [activityRecords, uploadRecords, users]
  );
  const visibleLogs = auditLogs.length ? auditLogs : previewLogs;
  const accountLogs = visibleLogs.filter((log) => log.category === "auth");
  const contentLogs = visibleLogs.filter(
    (log) => log.category === "content" && (contentLogFilter === "all" || log.action === contentLogFilter)
  );

  async function changeRole(candidate: AppUser, role: UserRole) {
    const updated = { ...candidate, role };
    setUsers((current) => current.map((item) => (item.id === candidate.id ? updated : item)));

    if (!isSupabaseConfigured()) {
      notify({ title: "Role updated", description: `${candidate.name} is now ${role}.`, tone: "success" });
      return;
    }

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

  function toggleTeacherStatus(candidate: AppUser) {
    const nextStatus = candidate.status === "deactivated" ? "active" : "deactivated";
    setUsers((current) => current.map((item) => (item.id === candidate.id ? { ...item, status: nextStatus } : item)));
    notify({
      title: nextStatus === "active" ? "Teacher activated" : "Teacher deactivated",
      description: `${candidate.name} was updated.`,
      tone: "success"
    });
  }

  function createTeacher(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("teacherName") ?? "").trim();
    const email = String(form.get("teacherEmail") ?? "").trim();

    if (!name || !email.includes("@")) {
      notify({ title: "Check teacher details", description: "Enter a teacher name and valid email address." });
      return;
    }

    const nextTeacher: AppUser = {
      id: `user-teacher-${Date.now()}`,
      name,
      email,
      role: "teacher",
      status: "active"
    };

    setUsers((current) => [nextTeacher, ...current]);
    event.currentTarget.reset();
    notify({
      title: "Teacher account created",
      description: "Teacher account was added.",
      tone: "success"
    });
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
        description="Create and deactivate teacher accounts, monitor teacher-managed content, and review system logs."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UserCog} label="Teachers" value={teachers.length} />
        <StatCard icon={BookOpen} label="PECS cards" value={pecsCount} />
        <StatCard icon={Activity} label="Activities" value={activityRecords.length} />
        <StatCard icon={Shield} label="Fixed gestures" value={gestureCount} />
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
          <CardTitle>Teacher account management</CardTitle>
          <CardDescription>Deactivate accounts when teachers should no longer manage content.</CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="rounded-lg border border-blue-100 bg-skywash p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{teacher.name}</p>
                    <p className="text-sm text-slate-600">{teacher.email}</p>
                  </div>
                  <Badge className={teacher.status === "deactivated" ? "bg-coral text-orange-700" : "bg-mint text-green-700"}>
                    {teacher.status}
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div>
                    <Label htmlFor={`role-${teacher.id}`} className="sr-only">
                      Role for {teacher.name}
                    </Label>
                    <Select
                      id={`role-${teacher.id}`}
                      value={teacher.role}
                      onChange={(event) => changeRole(teacher, event.target.value as UserRole)}
                    >
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => toggleTeacherStatus(teacher)}>
                    {teacher.status === "deactivated" ? (
                      <ToggleRight className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                    )}
                    {teacher.status === "deactivated" ? "Activate" : "Deactivate"}
                  </Button>
                </div>
              </div>
            ))}
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
