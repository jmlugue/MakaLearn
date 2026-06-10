"use client";

import { FormEvent, useMemo, useState } from "react";
import { BookPlus, FileAudio, Film, Image, Layers, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/common/toast-provider";
import { categories as mockCategories, learningItems, lessons as mockLessons, mediaAssets } from "@/data/mock-data";
import { createLessonDraftFromItem } from "@/utils/lesson-template";
import { formatDate } from "@/lib/utils";
import type { ActivityType, Category, LearningItem, Lesson } from "@/types";

type Tab = "items" | "lessons" | "categories" | "media";

const tabLabels: Record<Tab, string> = {
  items: "Learning Items",
  lessons: "Lessons",
  categories: "Categories",
  media: "Media Library"
};

const activityTypes: ActivityType[] = [
  "match-word-symbol",
  "choose-correct-symbol",
  "fill-blank",
  "drag-drop-symbol",
  "gesture-practice",
  "simple-quiz"
];

export function ContentLibraryView() {
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<LearningItem[]>(learningItems);
  const [lessons, setLessons] = useState<Lesson[]>(mockLessons);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Omit<Lesson, "id" | "createdBy"> | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonError, setLessonError] = useState("");
  const filteredItems = useMemo(
    () => items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  function generateDraft(item: LearningItem) {
    const nextDraft = createLessonDraftFromItem(item);
    setDraft(nextDraft);
    setLessonTitle(nextDraft.title);
    setTab("lessons");
    notify({
      title: "Lesson draft generated",
      description: `Review the ${item.label} lesson before saving.`,
      tone: "success"
    });
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lessonTitle.trim()) {
      setLessonError("Lesson title is required.");
      return;
    }
    const base = draft ?? {
      title: lessonTitle,
      objective: "Practice selected learning items with teacher guidance.",
      learningItemIds: items.slice(0, 2).map((item) => item.id),
      instructions: "Model each item, practice together, then run the selected activity.",
      activityType: "simple-quiz" as ActivityType,
      estimatedDuration: 10,
      notes: "Manual lesson draft created locally.",
      source: "manual" as const,
      visibility: "shared" as const
    };
    setLessons((current) => [
      {
        ...base,
        title: lessonTitle,
        id: `lesson-${Date.now()}`,
        createdBy: "user-teacher"
      },
      ...current
    ]);
    setDraft(null);
    setLessonTitle("");
    setLessonError("");
    notify({ title: "Lesson saved", description: "The lesson was added to local data.", tone: "success" });
  }

  function deleteItem(item: LearningItem) {
    const shouldDelete = window.confirm(`Delete ${item.label}?`);
    if (!shouldDelete) return;
    const deleteMedia = window.confirm("Delete associated uploaded media placeholders too?");
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    notify({
      title: "Learning item deleted",
      description: deleteMedia ? "Associated media placeholders would be removed." : "Media placeholders were kept."
    });
  }

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("categoryName") ?? "").trim();
    if (!name) return;
    setCategories((current) => [
      {
        id: `cat-${Date.now()}`,
        name,
        description: String(form.get("categoryDescription") ?? "Shared category"),
        color: "#dbeafe",
        createdBy: "user-teacher"
      },
      ...current
    ]);
    event.currentTarget.reset();
    notify({ title: "Category added", description: "Categories are shared with all teachers locally.", tone: "success" });
  }

  return (
    <>
      <PageHeader
        eyebrow="Content Library"
        title="Learning content workspace"
        description="Use demo-only labels and generic media placeholders until approved learning content is provided."
        actions={
          <Button onClick={() => notify({ title: "Learning item form", description: "Use the upload fields on each card for now." })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add item
          </Button>
        }
      />
      <div className="mb-5 flex gap-2 overflow-x-auto rounded-lg bg-white p-2 shadow-soft">
        {(Object.keys(tabLabels) as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`min-h-11 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition ${
              tab === item ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-skywash"
            }`}
          >
            {tabLabels[item]}
          </button>
        ))}
      </div>

      {tab === "items" ? (
        <section>
          <div className="mb-4 max-w-lg">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search learning items" className="pl-10" />
            </div>
          </div>
          {filteredItems.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const category = categories.find((candidate) => candidate.id === item.categoryId);
                return (
                  <Card key={item.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge>{category?.name ?? "Uncategorized"}</Badge>
                        <CardTitle className="mt-3 text-2xl">{item.label}</CardTitle>
                      </div>
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-skywash text-lg font-bold text-blue-700">
                        {item.symbolImageUrl}
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.instruction}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.tags.map((tag) => (
                        <Badge key={tag} className="bg-slate-100 text-slate-600">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3">
                      <UploadField icon={Image} label="Symbol image" accept="image/*" note="Future Supabase Storage: symbol-images bucket." />
                      <UploadField icon={Film} label="Gesture image/video" accept="image/*,video/*" note="Future Supabase Storage: gesture-media bucket." />
                      <UploadField icon={FileAudio} label="Audio" accept="audio/*" note="Future Supabase Storage: audio-files bucket." />
                    </div>
                    <p className="mt-4 text-xs text-slate-500">Last updated {formatDate(item.updatedAt)}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => generateDraft(item)}>
                        <BookPlus className="h-4 w-4" aria-hidden="true" />
                        Generate lesson
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => deleteItem(item)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={Layers} title="No learning items" description="Add placeholder learning items before connecting approved content." />
          )}
        </section>
      ) : null}

      {tab === "lessons" ? (
        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardTitle>{draft ? "Review generated draft" : "Create manual lesson"}</CardTitle>
            <CardDescription>Lessons are visible to all teachers in the local-first MVP.</CardDescription>
            <form className="mt-4 space-y-4" onSubmit={saveDraft}>
              <div>
                <Label htmlFor="lesson-title">Lesson title</Label>
                <Input id="lesson-title" value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} placeholder="Lesson title" />
                <FieldError message={lessonError} />
              </div>
              <div>
                <Label htmlFor="lesson-objective">Objective</Label>
                <Textarea id="lesson-objective" defaultValue={draft?.objective} placeholder="What should the learner practice?" />
              </div>
              <div>
                <Label htmlFor="lesson-activity">Activity type</Label>
                <Select id="lesson-activity" defaultValue={draft?.activityType ?? "simple-quiz"}>
                  {activityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="lesson-duration">Estimated duration</Label>
                  <Input id="lesson-duration" type="number" min={5} defaultValue={draft?.estimatedDuration ?? 10} />
                </div>
                <div>
                  <Label htmlFor="lesson-items">Selected items</Label>
                  <Select id="lesson-items" multiple className="min-h-24 py-2" defaultValue={draft?.learningItemIds}>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="lesson-notes">Notes</Label>
                <Textarea id="lesson-notes" defaultValue={draft?.notes} placeholder="Teacher notes for this lesson" />
              </div>
              <Button type="submit">Save lesson</Button>
            </form>
          </Card>
          <div className="grid gap-4">
            {lessons.map((lesson) => (
              <Card key={lesson.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge>{lesson.source}</Badge>
                    <CardTitle className="mt-2">{lesson.title}</CardTitle>
                  </div>
                  <Badge className="bg-mint text-green-700">{lesson.visibility}</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{lesson.objective}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.instructions}</p>
                <p className="mt-3 text-sm font-semibold text-blue-700">
                  {lesson.estimatedDuration} minutes · {lesson.activityType}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "categories" ? (
        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Card>
            <CardTitle>Create category</CardTitle>
            <CardDescription>Teachers and admins can create categories for shared use.</CardDescription>
            <form className="mt-4 space-y-4" onSubmit={addCategory}>
              <div>
                <Label htmlFor="categoryName">Name</Label>
                <Input id="categoryName" name="categoryName" required />
              </div>
              <div>
                <Label htmlFor="categoryDescription">Description</Label>
                <Textarea id="categoryDescription" name="categoryDescription" />
              </div>
              <Button type="submit">Save category</Button>
            </form>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            {categories.map((category) => (
              <Card key={category.id}>
                <div className="mb-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                <CardTitle>{category.name}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
                <Button className="mt-4" variant="outline" size="sm" onClick={() => notify({ title: "Category editor", description: "Inline editing can be connected to Supabase later." })}>
                  Edit category
                </Button>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "media" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mediaAssets.map((asset) => (
            <Card key={asset.id}>
              <Badge>{asset.bucket}</Badge>
              <CardTitle className="mt-3">{asset.title}</CardTitle>
              <CardDescription>{asset.fileName}</CardDescription>
              <p className="mt-3 text-sm text-slate-600">Uploaded {formatDate(asset.uploadedAt)}</p>
            </Card>
          ))}
        </section>
      ) : null}
    </>
  );
}

function UploadField({
  icon: Icon,
  label,
  accept,
  note
}: {
  icon: typeof Image;
  label: string;
  accept: string;
  note: string;
}) {
  return (
    <label className="block rounded-lg border border-dashed border-blue-200 bg-skywash p-3">
      <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon className="h-4 w-4 text-blue-600" aria-hidden="true" />
        {label}
      </span>
      <Input type="file" accept={accept} className="mt-2 bg-white" />
      <span className="mt-1 block text-xs text-slate-500">{note}</span>
    </label>
  );
}
