"use client";

import { FormEvent, useMemo, useState } from "react";
import { Archive, Pencil, Plus, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useDemoUser } from "@/features/auth/use-demo-user";
import { demoUsers, learners as mockLearners } from "@/data/mock-data";
import type { Learner, PreferredLearningMode } from "@/types";

const modes: PreferredLearningMode[] = ["Visual", "Audio", "Gesture", "Mixed", "Teacher-guided"];

export function LearnersView() {
  const { user } = useDemoUser();
  const { notify } = useToast();
  const [learners, setLearners] = useState<Learner[]>(mockLearners);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("active");
  const [editing, setEditing] = useState<Learner | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [mode, setMode] = useState<PreferredLearningMode>("Visual");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const visibleLearners = useMemo(() => {
    return learners.filter((learner) => {
      const canSee = user.role === "admin" || learner.assignedTeacherId === user.id;
      const matchesSearch = learner.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "all" || learner.status === status;
      return canSee && matchesSearch && matchesStatus;
    });
  }, [learners, search, status, user]);

  function openForm(learner?: Learner) {
    setEditing(learner ?? null);
    setName(learner?.name ?? "");
    setAge(learner?.age ? String(learner.age) : "");
    setMode(learner?.preferredLearningMode ?? "Visual");
    setNotes(learner?.communicationNeeds ?? "");
    setError("");
  }

  function saveLearner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Learner name is required.");
      return;
    }

    if (editing) {
      setLearners((current) =>
        current.map((learner) =>
          learner.id === editing.id
            ? {
                ...learner,
                name,
                age: Number(age) || learner.age,
                preferredLearningMode: mode,
                communicationNeeds: notes
              }
            : learner
        )
      );
      notify({ title: "Learner updated", description: `${name} was updated locally.`, tone: "success" });
    } else {
      const newLearner: Learner = {
        id: `learner-${Date.now()}`,
        name,
        age: Number(age) || 6,
        gradeLevel: "New profile",
        communicationNeeds: notes || "Add communication notes after the first session.",
        preferredLearningMode: mode,
        assignedTeacherId: user.role === "teacher" ? user.id : "user-teacher",
        profilePhotoUrl: "/placeholder-new",
        status: "active"
      };
      setLearners((current) => [newLearner, ...current]);
      notify({
        title: "Learner added",
        description: "Teacher-created learners are assigned to the current teacher in local mode.",
        tone: "success"
      });
    }
    openForm();
  }

  function archiveLearner(learnerId: string) {
    setLearners((current) =>
      current.map((learner) => (learner.id === learnerId ? { ...learner, status: "inactive" } : learner))
    );
    notify({ title: "Learner archived", description: "The profile remains available under inactive learners." });
  }

  return (
    <>
      <PageHeader
        eyebrow="Learners"
        title="Learner profiles"
        description="Manage learner profiles for teacher-guided classroom sessions. Learners do not sign in."
        actions={
          <Button onClick={() => openForm()}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add learner
          </Button>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardTitle>{editing ? "Edit learner" : "Add learner"}</CardTitle>
          <CardDescription>
            Future Supabase: save this form to the learners table and apply teacher assignment RLS.
          </CardDescription>
          <form className="mt-4 space-y-4" onSubmit={saveLearner}>
            <div>
              <Label htmlFor="learner-name">Learner name</Label>
              <Input id="learner-name" value={name} onChange={(event) => setName(event.target.value)} />
              <FieldError message={error} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="learner-age">Age</Label>
                <Input id="learner-age" type="number" min={1} value={age} onChange={(event) => setAge(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="learner-mode">Preferred mode</Label>
                <Select id="learner-mode" value={mode} onChange={(event) => setMode(event.target.value as PreferredLearningMode)}>
                  {modes.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </div>
            </div>
            {user.role === "admin" ? (
              <div>
                <Label htmlFor="assigned-teacher">Assigned teacher</Label>
                <Select id="assigned-teacher" defaultValue="user-teacher">
                  {demoUsers
                    .filter((candidate) => candidate.role === "teacher")
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                </Select>
              </div>
            ) : null}
            <div>
              <Label htmlFor="learner-photo">Profile photo</Label>
              <Input id="learner-photo" type="file" accept="image/*" />
              <p className="mt-1 text-xs text-slate-500">
                Future Supabase Storage: upload profile photos to the learner-photos bucket.
              </p>
            </div>
            <div>
              <Label htmlFor="learner-notes">Communication needs / notes</Label>
              <Textarea id="learner-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit">{editing ? "Save changes" : "Create learner"}</Button>
              <Button type="button" variant="secondary" onClick={() => openForm()}>
                Clear
              </Button>
            </div>
          </form>
        </Card>

        <div>
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search learners"
                className="pl-10"
              />
            </div>
            <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </Select>
          </div>
          {visibleLearners.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {visibleLearners.map((learner) => (
                <Card key={learner.id}>
                  <div className="flex items-start gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-skywash text-xl font-bold text-blue-700">
                      {learner.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-xl">{learner.name}</CardTitle>
                        <Badge className={learner.status === "active" ? "bg-mint text-green-700" : "bg-slate-100 text-slate-600"}>
                          {learner.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Age {learner.age} · {learner.gradeLevel} · {learner.preferredLearningMode}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{learner.communicationNeeds}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(learner)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => archiveLearner(learner.id)}>
                      <Archive className="h-4 w-4" aria-hidden="true" />
                      Archive
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => notify({ title: "Progress opened", description: "Use the Progress page to review this learner." })}>
                      View progress
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={UserRound} title="No learners found" description="Try a different search or add a learner profile." />
          )}
        </div>
      </section>
    </>
  );
}
