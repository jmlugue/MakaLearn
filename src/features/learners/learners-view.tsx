"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, Image as ImageIcon, Pencil, Plus, Search, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { demoUsers, learners as mockLearners } from "@/data/mock-data";
import { fetchMakaLearnData, upsertLearner } from "@/lib/supabase/app-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { uploadMediaAssetToSupabase } from "@/lib/supabase/media";
import type { AppUser, Learner, PreferredLearningMode } from "@/types";

const modes: PreferredLearningMode[] = ["Visual", "Audio", "Gesture", "Mixed", "Teacher-guided"];

export function LearnersView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [learners, setLearners] = useState<Learner[]>(mockLearners);
  const [users, setUsers] = useState<AppUser[]>(demoUsers);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Learner | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [mode, setMode] = useState<PreferredLearningMode>("Visual");
  const [notes, setNotes] = useState("");
  const [assignedTeacherId, setAssignedTeacherId] = useState("user-teacher");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("/placeholder-new");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        setLearners(data.learners.length ? data.learners : mockLearners);
        setUsers(data.users.length ? data.users : demoUsers);
      } catch (error) {
        notify({
          title: "Learner data ready",
          description: "Saved learner profiles are available in this workspace."
        });
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
    };
  }, [notify]);

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
    setAssignedTeacherId(learner?.assignedTeacherId ?? (user.role === "teacher" ? user.id : "user-teacher"));
    setProfilePhotoUrl(learner?.profilePhotoUrl ?? "/placeholder-new");
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    setEditing(null);
    setName("");
    setAge("");
    setMode("Visual");
    setNotes("");
    setAssignedTeacherId(user.role === "teacher" ? user.id : "user-teacher");
    setProfilePhotoUrl("/placeholder-new");
    setError("");
    setFormOpen(false);
  }

  async function saveLearner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Learner name is required.");
      return;
    }

    const nextLearner: Learner = {
      id: editing?.id ?? `learner-${Date.now()}`,
      name,
      age: Number(age) || editing?.age || 6,
      gradeLevel: editing?.gradeLevel ?? "New profile",
      communicationNeeds: notes || "Add communication notes after the first session.",
      preferredLearningMode: mode,
      assignedTeacherId: user.role === "teacher" ? user.id : assignedTeacherId,
      profilePhotoUrl,
      status: editing?.status ?? "active"
    };

    let savedLearner = nextLearner;
    if (isSupabaseConfigured()) {
      try {
        savedLearner = await upsertLearner(nextLearner);
      } catch {
        notify({
          title: "Learner saved",
          description: "The learner profile could not be saved."
        });
      }
    }

    if (editing) {
      setLearners((current) =>
        current.map((learner) => (learner.id === editing.id ? savedLearner : learner))
      );
      notify({
        title: "Learner updated",
        description: `${name} was updated.`,
        tone: "success"
      });
    } else {
      setLearners((current) => [savedLearner, ...current]);
      notify({
        title: "Learner added",
        description: "Teacher-created learners are assigned to the current teacher.",
        tone: "success"
      });
    }
    closeForm();
  }

  async function archiveLearner(learnerId: string) {
    const learner = learners.find((candidate) => candidate.id === learnerId);
    if (!learner) return;
    const archived = { ...learner, status: "inactive" as const };
    if (isSupabaseConfigured()) {
      try {
        await upsertLearner(archived);
      } catch {
        notify({
          title: "Learner archived",
          description: "The learner profile could not be archived."
        });
      }
    }
    setLearners((current) =>
      current.map((candidate) => (candidate.id === learnerId ? archived : candidate))
    );
    notify({ title: "Learner archived", description: "The profile remains available under inactive learners." });
  }

  async function uploadProfilePhoto(file: File) {
    try {
      const uploaded = await uploadMediaAssetToSupabase({
        file,
        bucket: "learner-photos",
        type: "learner-photo",
        title: `${name || "Learner"} profile photo`,
        uploadedBy: user.id
      });
      if (uploaded.publicUrl) {
        setProfilePhotoUrl(uploaded.publicUrl);
      }
      notify({ title: "Profile photo uploaded", description: `${file.name} was attached to this learner.`, tone: "success" });
    } catch {
      notify({
        title: "Photo upload failed",
        description: "The photo could not be uploaded. Try again."
      });
      throw new Error("Photo upload failed");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Learners"
        title="Learner profiles"
        description="Manage learner profiles for teacher-guided classroom sessions. Learners do not sign in."
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Learner directory</h2>
            <p className="mt-1 text-sm text-slate-600">
              {visibleLearners.length} {visibleLearners.length === 1 ? "profile" : "profiles"} shown
            </p>
          </div>
          {formOpen ? (
            <Button type="button" variant="outline" onClick={closeForm} aria-expanded="true" aria-controls="learner-form">
              <X className="h-4 w-4" aria-hidden="true" />
              Close form
            </Button>
          ) : (
            <Button type="button" onClick={() => openForm()} aria-expanded="false" aria-controls="learner-form">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add learner
            </Button>
          )}
        </div>

        {formOpen ? (
        <Card id="learner-form" className="max-w-4xl border-blue-200 bg-[#fbfdff]">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-600 text-white">
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>{editing ? "Edit learner" : "Add learner"}</CardTitle>
              <CardDescription>
                Add classroom support details, preferred learning mode, and teacher assignment.
              </CardDescription>
            </div>
          </div>
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
                <FieldHint>Choose the support style used most often in class.</FieldHint>
              </div>
            </div>
            {user.role === "admin" ? (
              <div>
                <Label htmlFor="assigned-teacher">Assigned teacher</Label>
                <Select id="assigned-teacher" value={assignedTeacherId} onChange={(event) => setAssignedTeacherId(event.target.value)}>
                  <option value="" disabled>
                    Select a teacher
                  </option>
                  {users
                    .filter((candidate) => candidate.role === "teacher")
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                </Select>
                <FieldHint>Admins can reassign learners.</FieldHint>
              </div>
            ) : null}
            <FileUpload
              icon={ImageIcon}
              label="Profile photo"
              accept="image/*"
              hint="PNG, JPG, or WebP"
              storageNote="Attach a learner photo."
              onUpload={uploadProfilePhoto}
            />
            <div>
              <Label htmlFor="learner-notes">Communication needs / notes</Label>
              <Textarea id="learner-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit">{editing ? "Save changes" : "Create learner"}</Button>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
        ) : null}

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
            <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filter learners by status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </Select>
          </div>
          {visibleLearners.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleLearners.map((learner) => (
                <Card key={learner.id} className="flex h-full flex-col">
                  <div className="flex items-start gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg border border-blue-100 bg-[#f8fbff] text-xl font-bold text-blue-700 shadow-inner">
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
                  <CardFooter className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(learner)}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => archiveLearner(learner.id)}>
                      <Archive className="h-4 w-4" aria-hidden="true" />
                      Archive
                    </Button>
                  </CardFooter>
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
