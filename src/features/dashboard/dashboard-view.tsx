"use client";

import Link from "next/link";
import { Activity, BookOpen, Clock, Upload, UserRound, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { useDemoUser } from "@/features/auth/use-demo-user";
import {
  activityResults,
  demoUsers,
  learners,
  learningItems,
  lessons,
  mediaAssets,
  practiceAttempts
} from "@/data/mock-data";
import { formatDate } from "@/lib/utils";

const chartData = [
  { name: "Mon", attempts: 3 },
  { name: "Tue", attempts: 5 },
  { name: "Wed", attempts: 4 },
  { name: "Thu", attempts: 7 },
  { name: "Fri", attempts: 6 }
];

export function DashboardView() {
  const { user } = useDemoUser();
  const isAdmin = user.role === "admin";
  const assignedLearners = learners.filter((learner) => learner.assignedTeacherId === user.id);

  return (
    <>
      <PageHeader
        eyebrow={isAdmin ? "Admin dashboard" : "Teacher dashboard"}
        title={isAdmin ? "System overview" : "Classroom overview"}
        description={
          isAdmin
            ? "Review teachers, learners, content, uploads, and recent local activity."
            : "Review your assigned learners, recent practice, and recommended lessons."
        }
        actions={
          <>
            <Link href="/content">
              <Button variant="secondary">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                Content Library
              </Button>
            </Link>
            <Link href="/gesture-practice">
              <Button>
                <Activity className="h-4 w-4" aria-hidden="true" />
                Start Practice
              </Button>
            </Link>
          </>
        }
      />

      {isAdmin ? <AdminDashboard /> : <TeacherDashboard assignedCount={assignedLearners.length} />}
    </>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={UserRound} label="Teachers" value={demoUsers.filter((u) => u.role === "teacher").length} />
        <StatCard icon={Users} label="Learners" value={learners.length} />
        <StatCard icon={BookOpen} label="Learning items" value={learningItems.length} />
        <StatCard icon={Clock} label="Lessons" value={lessons.length} />
        <StatCard icon={Activity} label="Attempts" value={practiceAttempts.length} />
      </section>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardTitle>Recent learner activity</CardTitle>
          <CardDescription>Local activity and practice records used for the dashboard.</CardDescription>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="attempts" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle>Teacher accounts</CardTitle>
          <div className="mt-4 space-y-3">
            {demoUsers
              .filter((item) => item.role === "teacher")
              .map((teacher) => (
                <div key={teacher.id} className="flex items-center justify-between gap-3 rounded-lg bg-skywash p-3">
                  <div>
                    <p className="font-semibold">{teacher.name}</p>
                    <p className="text-sm text-slate-600">{teacher.email}</p>
                  </div>
                  <Badge className={teacher.status === "active" ? "bg-mint text-green-700" : "bg-coral text-orange-700"}>
                    {teacher.status}
                  </Badge>
                </div>
              ))}
          </div>
        </Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Recent uploads</CardTitle>
          <div className="mt-4 space-y-3">
            {mediaAssets.slice(0, 3).map((asset) => (
              <div key={asset.id} className="flex gap-3">
                <Upload className="mt-1 h-5 w-5 text-blue-600" aria-hidden="true" />
                <div>
                  <p className="font-semibold">{asset.title}</p>
                  <p className="text-sm text-slate-600">{formatDate(asset.uploadedAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle>System reminders</CardTitle>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-skywash p-4">
              <p className="font-semibold">Supabase setup pending</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Connect Auth, database tables, Storage buckets, and RLS in a later phase.
              </p>
            </div>
            <div className="rounded-lg bg-skywash p-4">
              <p className="font-semibold">Approved content pending</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Placeholder labels and media should be replaced with approved content later.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

function TeacherDashboard({ assignedCount }: { assignedCount: number }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Assigned learners" value={assignedCount} />
        <StatCard icon={BookOpen} label="Recent items" value={learningItems.slice(0, 4).length} />
        <StatCard icon={Activity} label="Practice attempts" value={practiceAttempts.length} />
        <StatCard icon={Clock} label="Recommended lessons" value={lessons.length} />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardTitle>Quick actions</CardTitle>
          <div className="mt-4 grid gap-3">
            <Link href="/learners">
              <Button className="w-full justify-start" variant="secondary">
                Add or update learner
              </Button>
            </Link>
            <Link href="/activities">
              <Button className="w-full justify-start" variant="outline">
                Run activity
              </Button>
            </Link>
            <Link href="/progress">
              <Button className="w-full justify-start" variant="outline">
                Review progress
              </Button>
            </Link>
          </div>
        </Card>
        <Card>
          <CardTitle>Recent practice attempts</CardTitle>
          <div className="mt-4 space-y-3">
            {practiceAttempts.map((attempt) => {
              const item = learningItems.find((learningItem) => learningItem.id === attempt.learningItemId);
              return (
                <div key={attempt.id} className="rounded-lg bg-skywash p-3">
                  <p className="font-semibold">{item?.label}</p>
                  <p className="text-sm text-slate-600">{attempt.status}</p>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardTitle>Learner progress alerts</CardTitle>
          <div className="mt-4 space-y-3">
            {activityResults.map((result) => (
              <div key={result.id} className="rounded-lg bg-coral p-3">
                <p className="font-semibold">{result.scorePercentage}% activity score</p>
                <p className="text-sm text-slate-600">Review missed items in the next guided session.</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
