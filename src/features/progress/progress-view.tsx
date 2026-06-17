"use client";

import { useMemo, useState } from "react";
import { Download, FileText, LineChart as LineChartIcon, UserRound } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldHint, Label, Select } from "@/components/ui/form";
import { StatCard } from "@/components/common/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { activityResults, learners, learningItems, lessons, practiceAttempts } from "@/data/mock-data";
import { useDemoUser } from "@/features/auth/use-demo-user";
import { formatDate } from "@/lib/utils";
import { getActivityTypeLabel } from "@/utils/activity-labels";
import { getLearnerAccuracy, getMostPracticedItemIds } from "@/utils/progress";

export function ProgressView() {
  const { user } = useDemoUser();
  const { notify } = useToast();
  const visibleLearners = learners.filter((learner) => user.role === "admin" || learner.assignedTeacherId === user.id);
  const [selectedLearnerId, setSelectedLearnerId] = useState(visibleLearners[0]?.id ?? "");
  const learner = visibleLearners.find((item) => item.id === selectedLearnerId) ?? visibleLearners[0];
  const learnerResults = activityResults.filter((result) => result.learnerId === learner?.id);
  const learnerAttempts = practiceAttempts.filter((attempt) => attempt.learnerId === learner?.id);
  const accuracy = learner ? getLearnerAccuracy(learner, activityResults, practiceAttempts) : 0;
  const practiced = useMemo(() => getMostPracticedItemIds(learnerAttempts, learnerResults), [learnerAttempts, learnerResults]);
  const chartData = [
    { name: "Week 1", accuracy: Math.max(30, accuracy - 18) },
    { name: "Week 2", accuracy: Math.max(35, accuracy - 8) },
    { name: "Week 3", accuracy },
    { name: "Week 4", accuracy: Math.min(100, accuracy + 6) }
  ];

  function exportReport() {
    // Future PDF export: replace this printable browser report with a proper PDF
    // generator after report design and storage requirements are finalized.
    notify({
      title: "PDF export prepared",
      description: "Use the browser print dialog for this local placeholder report.",
      tone: "success"
    });
    window.setTimeout(() => window.print(), 250);
  }

  return (
    <>
      <PageHeader
        eyebrow="Progress"
        title="Learner progress reports"
        description="Progress is calculated from local activity results and gesture practice attempts."
        actions={
          <Button onClick={exportReport}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export PDF
          </Button>
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        {visibleLearners.map((item) => (
          <Card key={item.id} className={`flex h-full flex-col ${item.id === selectedLearnerId ? "ring-4 ring-blue-100" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg border border-blue-100 bg-[#f8fbff] font-bold text-blue-700 shadow-inner">
                {item.name.slice(0, 1)}
              </div>
              <div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription>{item.preferredLearningMode}</CardDescription>
              </div>
            </div>
            <CardFooter className="mt-4">
              <Button className="w-full" variant="secondary" onClick={() => setSelectedLearnerId(item.id)}>
                View report
              </Button>
            </CardFooter>
          </Card>
        ))}
      </section>

      {learner ? (
        <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Card>
              <Label htmlFor="learner-report">Selected learner</Label>
              <Select id="learner-report" value={selectedLearnerId} onChange={(event) => setSelectedLearnerId(event.target.value)}>
                {visibleLearners.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <FieldHint>Switch reports without leaving the progress page.</FieldHint>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard icon={UserRound} label="Accuracy" value={`${accuracy}%`} />
              <StatCard icon={FileText} label="Completed lessons" value={lessons.length} />
            </div>
            <Card>
              <CardTitle>Most practiced items</CardTitle>
              <div className="mt-4 flex flex-wrap gap-2">
                {practiced.map(([itemId, count]) => {
                  const item = learningItems.find((candidate) => candidate.id === itemId);
                  return (
                    <Badge key={itemId} className="bg-skywash text-blue-700">
                      {item?.label ?? itemId}: {count}
                    </Badge>
                  );
                })}
                {!practiced.length ? <p className="text-sm text-slate-600">No practice records yet.</p> : null}
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <div className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <CardTitle>Progress chart</CardTitle>
              </div>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="accuracy" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card>
              <CardTitle>Practice attempts history</CardTitle>
              <div className="mt-4 space-y-3">
                {learnerAttempts.map((attempt) => {
                  const item = learningItems.find((candidate) => candidate.id === attempt.learningItemId);
                  return (
                    <div key={attempt.id} className="rounded-lg border border-blue-100 bg-skywash p-3">
                      <p className="font-semibold">
                        {item?.label} · {attempt.status}
                      </p>
                      <p className="text-sm text-slate-600">{formatDate(attempt.attemptedAt)}</p>
                      <p className="mt-1 text-sm text-slate-600">{attempt.feedback}</p>
                    </div>
                  );
                })}
                {!learnerAttempts.length ? <p className="text-sm text-slate-600">No gesture attempts yet.</p> : null}
              </div>
            </Card>
            <Card>
              <CardTitle>Activity results</CardTitle>
              <div className="mt-4 overflow-x-auto rounded-lg border border-blue-100 clean-scrollbar">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="bg-[#f8fbff] text-slate-500">
                    <tr>
                      <th className="py-2">Activity</th>
                      <th className="py-2">Score</th>
                      <th className="py-2">Correct</th>
                      <th className="py-2">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {learnerResults.map((result) => (
                      <tr key={result.id} className="border-t border-blue-100">
                        <td className="py-3">{getActivityTypeLabel(result.activityType)}</td>
                        <td className="py-3 font-semibold">{result.scorePercentage}%</td>
                        <td className="py-3">{result.correctCount}</td>
                        <td className="py-3">{formatDate(result.completedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!learnerResults.length ? <p className="mt-3 text-sm text-slate-600">No activity results yet.</p> : null}
              </div>
            </Card>
          </div>
        </section>
      ) : null}
    </>
  );
}
