"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Database, Shield, Upload, UserCog, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldHint, Label, Select } from "@/components/ui/form";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { demoUsers, learners, learningItems, mediaAssets, practiceAttempts } from "@/data/mock-data";
import { fetchMakaLearnData, updateProfileRole } from "@/lib/supabase/app-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import type { AppUser, Learner, LearningItem, MediaAsset, PracticeAttempt, UserRole } from "@/types";

export function AdminPanelView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [users, setUsers] = useState<AppUser[]>(demoUsers);
  const [learnerRecords, setLearnerRecords] = useState<Learner[]>(learners);
  const [itemRecords, setItemRecords] = useState<LearningItem[]>(learningItems);
  const [uploadRecords, setUploadRecords] = useState<MediaAsset[]>(mediaAssets);
  const [attemptRecords, setAttemptRecords] = useState<PracticeAttempt[]>(practiceAttempts);

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        setUsers(data.users.length ? data.users : demoUsers);
        setLearnerRecords(data.learners.length ? data.learners : learners);
        setItemRecords(data.learningItems.length ? data.learningItems : learningItems);
        setUploadRecords(data.mediaAssets.length ? data.mediaAssets : mediaAssets);
        setAttemptRecords(data.practiceAttempts.length ? data.practiceAttempts : practiceAttempts);
      } catch (error) {
        notify({
          title: "Using local admin data",
          description: error instanceof Error ? error.message : "Supabase admin data could not be loaded."
        });
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
    };
  }, [notify]);

  async function changeRole(candidate: AppUser, role: UserRole) {
    const updated = { ...candidate, role };
    setUsers((current) => current.map((item) => (item.id === candidate.id ? updated : item)));

    if (!isSupabaseConfigured()) {
      notify({ title: "Role updated locally", description: `${candidate.name} is now ${role}.`, tone: "success" });
      return;
    }

    try {
      const saved = await updateProfileRole(candidate.id, role);
      setUsers((current) => current.map((item) => (item.id === candidate.id ? saved : item)));
      notify({ title: "Role updated", description: `${candidate.name} was saved to profiles.`, tone: "success" });
    } catch (error) {
      setUsers((current) => current.map((item) => (item.id === candidate.id ? candidate : item)));
      notify({
        title: "Role update failed",
        description: error instanceof Error ? error.message : "Supabase profile update failed."
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
        description="Manage teacher accounts, roles, learners, uploads, and development tools."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UserCog} label="Teachers" value={users.filter((candidate) => candidate.role === "teacher").length} />
        <StatCard icon={Users} label="Learners" value={learnerRecords.length} />
        <StatCard icon={Upload} label="Uploads" value={uploadRecords.length} />
        <StatCard icon={Database} label="Learning items" value={itemRecords.length} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="flex h-full flex-col">
          <CardTitle>Teacher account management</CardTitle>
          <div className="mt-4 space-y-3">
            {users
              .filter((candidate) => candidate.role === "teacher")
              .map((teacher) => (
                <div key={teacher.id} className="rounded-lg border border-blue-100 bg-skywash p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{teacher.name}</p>
                      <p className="text-sm text-slate-600">{teacher.email}</p>
                    </div>
                    <Badge>{teacher.status}</Badge>
                  </div>
                  <Button className="mt-3" variant="secondary" size="sm" onClick={() => notify({ title: "Invite placeholder", description: "Teacher invites will use Supabase Auth later." })}>
                    Send invite
                  </Button>
                </div>
              ))}
          </div>
        </Card>

        <Card className="flex h-full flex-col">
          <CardTitle>Role management</CardTitle>
          <CardDescription>Roles are saved to the profiles table when Supabase is configured.</CardDescription>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {users.map((candidate) => (
              <div key={candidate.id} className="rounded-lg border border-blue-100 bg-[#f8fbff] p-3">
                <p className="font-semibold">{candidate.name}</p>
                <Label htmlFor={`role-${candidate.id}`} className="sr-only">
                  Role for {candidate.name}
                </Label>
                <Select
                  id={`role-${candidate.id}`}
                  value={candidate.role}
                  onChange={(event) => changeRole(candidate, event.target.value as UserRole)}
                  className="mt-2"
                >
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </Select>
                <FieldHint>{isSupabaseConfigured() ? "Saved to profiles." : "Local role preview only."}</FieldHint>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardTitle>All learners</CardTitle>
          <div className="mt-4 overflow-x-auto rounded-lg border border-blue-100 clean-scrollbar">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[#f8fbff] text-slate-500">
                <tr>
                  <th className="py-2">Learner</th>
                  <th className="py-2">Age</th>
                  <th className="py-2">Mode</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Assigned teacher</th>
                </tr>
              </thead>
              <tbody>
                {learnerRecords.map((learner) => (
                  <tr key={learner.id} className="border-t border-blue-100">
                    <td className="py-3 font-semibold">{learner.name}</td>
                    <td className="py-3">{learner.age}</td>
                    <td className="py-3">{learner.preferredLearningMode}</td>
                    <td className="py-3">{learner.status}</td>
                    <td className="py-3">{users.find((candidate) => candidate.id === learner.assignedTeacherId)?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardTitle>All uploads</CardTitle>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {uploadRecords.map((asset) => (
              <div key={asset.id} className="flex min-h-28 flex-col rounded-lg border border-blue-100 bg-skywash p-3">
                <p className="font-semibold">{asset.title}</p>
                <p className="text-sm text-slate-600">{asset.bucket}</p>
                <p className="mt-auto pt-3 text-xs text-slate-500">{formatDate(asset.uploadedAt)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <CardTitle>Development-only data seeding tools</CardTitle>
          </div>
          <CardDescription>
            These controls are marked development-only and should be hidden or protected before production.
          </CardDescription>
          <CardFooter className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => notify({ title: "Seed data refreshed", description: "Run supabase/seed.sql in your project to reseed database data." })}>
              Reseed local data
            </Button>
            <Button variant="outline" onClick={() => notify({ title: "Storage check", description: "Use supabase/storage.sql to verify buckets and development policies." })}>
              Verify storage buckets
            </Button>
          </CardFooter>
          <p className="mt-4 text-sm text-slate-600">System overview: {attemptRecords.length} practice attempts are available.</p>
        </Card>
      </section>
    </>
  );
}
