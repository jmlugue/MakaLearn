"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  BookOpen,
  BookPlus,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileAudio,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User,
  type LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { SelectionList } from "@/components/ui/selection-list";
import { EmptyState } from "@/components/common/empty-state";
import { useToast } from "@/components/common/toast-provider";
import {
  categories as mockCategories,
  demoUsers,
  learningItems,
  lessons as mockLessons,
  mediaAssets
} from "@/data/mock-data";
import { createLessonDraftFromItem } from "@/utils/lesson-template";
import { formatDate } from "@/lib/utils";
import { activityTypeLabels, getActivityTypeLabel } from "@/utils/activity-labels";
import type { ActivityType, Category, LearningItem, Lesson } from "@/types";

type Tab = "items" | "lessons" | "categories" | "media";

const tabMeta: Record<Tab, { label: string; description: string; icon: LucideIcon }> = {
  items: {
    label: "Learning Items",
    description: "Cue cards, prompts, and upload placeholders",
    icon: Layers
  },
  lessons: {
    label: "Lessons",
    description: "Manual and generated teacher plans",
    icon: BookOpen
  },
  categories: {
    label: "Categories",
    description: "Shared grouping for classroom routines",
    icon: FolderOpen
  },
  media: {
    label: "Media Library",
    description: "Placeholder symbol, gesture, and audio uploads",
    icon: Upload
  }
};

const activityTypes: ActivityType[] = [
  "match-word-symbol",
  "choose-correct-symbol",
  "fill-blank",
  "drag-drop-symbol",
  "gesture-practice",
  "simple-quiz"
];

const userNameById = new Map(demoUsers.map((user) => [user.id, user.name]));

export function ContentLibraryView() {
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<LearningItem[]>(learningItems);
  const [lessons, setLessons] = useState<Lesson[]>(mockLessons);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Omit<Lesson, "id" | "createdBy"> | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonObjective, setLessonObjective] = useState("Practice selected learning items with teacher guidance.");
  const [lessonActivityType, setLessonActivityType] = useState<ActivityType>("simple-quiz");
  const [lessonDuration, setLessonDuration] = useState(10);
  const [lessonItemIds, setLessonItemIds] = useState<string[]>(learningItems.slice(0, 2).map((item) => item.id));
  const [lessonNotes, setLessonNotes] = useState("Manual lesson draft created locally.");
  const [lessonError, setLessonError] = useState("");

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const filteredItems = useMemo(
    () => items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );
  const counts: Record<Tab, number> = {
    items: items.length,
    lessons: lessons.length,
    categories: categories.length,
    media: mediaAssets.length
  };

  function generateDraft(item: LearningItem) {
    const nextDraft = createLessonDraftFromItem(item);
    setDraft(nextDraft);
    setLessonTitle(nextDraft.title);
    setLessonObjective(nextDraft.objective);
    setLessonActivityType(nextDraft.activityType);
    setLessonDuration(nextDraft.estimatedDuration);
    setLessonItemIds(nextDraft.learningItemIds);
    setLessonNotes(nextDraft.notes);
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
      objective: lessonObjective,
      learningItemIds: lessonItemIds,
      instructions: "Model each item, practice together, then run the selected activity.",
      activityType: lessonActivityType,
      estimatedDuration: lessonDuration,
      notes: lessonNotes,
      source: "manual" as const,
      visibility: "shared" as const
    };
    setLessons((current) => [
      {
        ...base,
        title: lessonTitle,
        objective: lessonObjective,
        learningItemIds: lessonItemIds,
        activityType: lessonActivityType,
        estimatedDuration: lessonDuration,
        notes: lessonNotes,
        id: `lesson-${Date.now()}`,
        createdBy: "user-teacher"
      },
      ...current
    ]);
    setDraft(null);
    setLessonTitle("");
    setLessonObjective("Practice selected learning items with teacher guidance.");
    setLessonActivityType("simple-quiz");
    setLessonDuration(10);
    setLessonItemIds(items.slice(0, 2).map((item) => item.id));
    setLessonNotes("Manual lesson draft created locally.");
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
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-soft">
        <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
          <div className="relative min-h-[18rem] overflow-hidden bg-[#f7fbff] p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-y-0 right-0 hidden w-40 border-l border-blue-100 bg-[repeating-linear-gradient(180deg,#dbeafe_0,#dbeafe_12px,#f8fbff_12px,#f8fbff_24px)] opacity-70 lg:block" />
            <div className="relative max-w-3xl">
              <p className="mb-3 inline-flex rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm">
                Content Library
              </p>
              <h1 className="max-w-2xl text-3xl font-bold leading-tight text-ink md:text-5xl">
                Prepare classroom-ready learning cues.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Keep demo labels, lessons, categories, and placeholder media in one teacher-facing workspace until approved learning content is added.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => notify({ title: "Learning item form", description: "Use the upload fields on each card for now." })}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add item
                </Button>
                <Button variant="outline" onClick={() => setTab("lessons")}>
                  <BookPlus className="h-4 w-4" aria-hidden="true" />
                  Build lesson
                </Button>
              </div>
            </div>
          </div>
          <aside className="grid border-t border-blue-100 bg-[#eef7ff] p-4 sm:grid-cols-2 lg:grid-cols-1 lg:border-l lg:border-t-0">
            <LibraryMetric label="Learning items" value={items.length} detail={`${categories.length} shared categories`} icon={Layers} />
            <LibraryMetric label="Lesson drafts" value={lessons.length} detail="Manual and generated" icon={ClipboardList} />
            <LibraryMetric label="Media records" value={mediaAssets.length} detail="Storage-ready placeholders" icon={Upload} />
            <LibraryMetric label="Demo scope" value="Local" detail="Supabase integration point prepared" icon={Sparkles} />
          </aside>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(tabMeta) as Tab[]).map((item) => {
          const Icon = tabMeta[item].icon;
          const active = tab === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`min-h-[6rem] rounded-lg border p-4 text-left shadow-sm transition ${
                active
                  ? "border-blue-500 bg-blue-600 text-white shadow-soft"
                  : "border-blue-100 bg-white text-slate-700 hover:border-blue-300 hover:bg-skywash"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${active ? "bg-white/18" : "bg-blue-50 text-blue-700"}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className={`text-2xl font-bold ${active ? "text-white" : "text-blue-700"}`}>{counts[item]}</span>
              </span>
              <span className="mt-3 block text-sm font-bold">{tabMeta[item].label}</span>
              <span className={`mt-1 block text-xs leading-5 ${active ? "text-blue-50" : "text-slate-500"}`}>
                {tabMeta[item].description}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "items" ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Learning item board</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Search demo words and generate editable lesson drafts from any card.</p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search learning items" className="pl-10" />
            </div>
          </div>

          {filteredItems.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const category = categoryById.get(item.categoryId);
                const creator = userNameById.get(item.createdBy) ?? "Demo user";
                return (
                  <Card key={item.id} className="relative flex h-full flex-col overflow-hidden p-0">
                    <div className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: category?.color ?? "#dbeafe" }} />
                    <div className="flex h-full flex-col p-5 pl-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Badge className="bg-white text-blue-700 ring-1 ring-blue-100">{category?.name ?? "Uncategorized"}</Badge>
                          <CardTitle className="mt-3 text-2xl leading-tight">{item.label}</CardTitle>
                          <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <User className="h-3.5 w-3.5" aria-hidden="true" />
                            Created by {creator}
                          </p>
                        </div>
                        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-blue-100 bg-[#f8fbff] text-xl font-black text-blue-700 shadow-inner">
                          {item.symbolImageUrl}
                        </div>
                      </div>

                      <div className="mt-5 rounded-lg bg-[#f7fbff] p-4">
                        <p className="text-sm leading-6 text-slate-700">{item.description}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.instruction}</p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <Badge key={tag} className="bg-slate-100 text-slate-600">
                            <Tag className="h-3 w-3" aria-hidden="true" />
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-3">
                        <FileUpload icon={ImageIcon} label="Symbol image" accept="image/*" hint="PNG, JPG, or WebP" storageNote="Future Supabase Storage: symbol-images bucket." compact />
                        <FileUpload icon={Film} label="Gesture image/video" accept="image/*,video/*" hint="Image or short video" storageNote="Future Supabase Storage: gesture-media bucket." compact />
                        <FileUpload icon={FileAudio} label="Audio" accept="audio/*" hint="MP3, WAV, or M4A" storageNote="Future Supabase Storage: audio-files bucket." compact />
                      </div>

                      <CardFooter className="mt-5 grid min-h-[6.75rem] grid-cols-[minmax(0,1fr)_11rem] items-end gap-3">
                        <p className="pb-1 text-xs font-medium leading-5 text-slate-500">
                          Last updated {formatDate(item.updatedAt)}
                        </p>
                        <div className="grid w-44 gap-2 justify-self-end">
                          <Button className="w-full whitespace-nowrap" variant="secondary" size="sm" onClick={() => generateDraft(item)}>
                            <BookPlus className="h-4 w-4" aria-hidden="true" />
                            Generate lesson
                          </Button>
                          <Button className="w-full whitespace-nowrap" variant="danger" size="sm" onClick={() => deleteItem(item)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete
                          </Button>
                        </div>
                      </CardFooter>
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
          <Card className="bg-[#fbfdff]">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-600 text-white">
                <BookPlus className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>{draft ? "Review generated draft" : "Create manual lesson"}</CardTitle>
                <CardDescription>Lessons are visible to all teachers in the local-first MVP.</CardDescription>
              </div>
            </div>
            <form className="mt-5 space-y-4" onSubmit={saveDraft}>
              <div>
                <Label htmlFor="lesson-title">Lesson title</Label>
                <Input id="lesson-title" value={lessonTitle} onChange={(event) => setLessonTitle(event.target.value)} placeholder="Lesson title" />
                <FieldError message={lessonError} />
              </div>
              <div>
                <Label htmlFor="lesson-objective">Objective</Label>
                <Textarea id="lesson-objective" value={lessonObjective} onChange={(event) => setLessonObjective(event.target.value)} placeholder="What should the learner practice?" />
              </div>
              <div>
                <Label htmlFor="lesson-activity">Activity type</Label>
                <Select id="lesson-activity" value={lessonActivityType} onChange={(event) => setLessonActivityType(event.target.value as ActivityType)}>
                  {activityTypes.map((type) => (
                    <option key={type} value={type}>
                      {activityTypeLabels[type]}
                    </option>
                  ))}
                </Select>
                <FieldHint>Choose the teacher-guided activity this lesson should open with.</FieldHint>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="lesson-duration">Estimated duration</Label>
                  <Input id="lesson-duration" type="number" min={5} value={lessonDuration} onChange={(event) => setLessonDuration(Number(event.target.value) || 10)} />
                </div>
                <SelectionList
                  label="Selected learning items"
                  helper="Use the scrollable list to choose lesson cues."
                  options={items.map((item) => ({
                    value: item.id,
                    label: item.label,
                    description: categoryById.get(item.categoryId)?.name ?? "Uncategorized"
                  }))}
                  selectedValues={lessonItemIds}
                  onChange={setLessonItemIds}
                />
              </div>
              <div>
                <Label htmlFor="lesson-notes">Notes</Label>
                <Textarea id="lesson-notes" value={lessonNotes} onChange={(event) => setLessonNotes(event.target.value)} placeholder="Teacher notes for this lesson" />
              </div>
              <Button type="submit">Save lesson</Button>
            </form>
          </Card>

          <div className="grid gap-4">
            {lessons.map((lesson) => (
              <Card key={lesson.id} className="flex h-full flex-col border-l-4 border-l-blue-300">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge className="bg-blue-50 text-blue-700">{lesson.source}</Badge>
                    <CardTitle className="mt-2">{lesson.title}</CardTitle>
                  </div>
                  <Badge className="bg-mint text-green-700">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    {lesson.visibility}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{lesson.objective}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.instructions}</p>
                <CardFooter className="mt-4 flex flex-wrap gap-2 text-sm font-semibold text-blue-700">
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    {lesson.estimatedDuration} minutes
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1">{getActivityTypeLabel(lesson.activityType)}</span>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "categories" ? (
        <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="bg-[#fbfdff]">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-600 text-white">
                <FolderOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Create category</CardTitle>
                <CardDescription>Teachers and admins can create categories for shared use.</CardDescription>
              </div>
            </div>
            <form className="mt-5 space-y-4" onSubmit={addCategory}>
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
              <Card key={category.id} className="flex h-full flex-col overflow-hidden p-0">
                <div className="h-3" style={{ backgroundColor: category.color }} />
                <div className="flex h-full flex-col p-5">
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription className="mt-2">{category.description}</CardDescription>
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Created by {userNameById.get(category.createdBy) ?? "Demo user"}
                  </p>
                  <CardFooter className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => notify({ title: "Category editor", description: "Inline editing can be connected to Supabase later." })}
                  >
                    Edit category
                  </Button>
                  </CardFooter>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "media" ? (
        <section className="space-y-4">
          <div className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-bold text-ink">Media library</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              These are local placeholder records for future Supabase Storage buckets.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mediaAssets.map((asset) => (
              <Card key={asset.id} className="flex h-full flex-col border-dashed">
                <div className="flex items-start justify-between gap-3">
                  <Badge className="bg-blue-50 text-blue-700">{asset.bucket}</Badge>
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-skywash text-blue-700">
                    {asset.type === "audio-file" ? <FileAudio className="h-5 w-5" aria-hidden="true" /> : null}
                    {asset.type === "gesture-media" ? <Film className="h-5 w-5" aria-hidden="true" /> : null}
                    {asset.type === "symbol-image" ? <ImageIcon className="h-5 w-5" aria-hidden="true" /> : null}
                  </span>
                </div>
                <CardTitle className="mt-3">{asset.title}</CardTitle>
                <CardDescription>{asset.fileName}</CardDescription>
                <CardFooter className="mt-3">
                  <p className="text-sm text-slate-600">Uploaded {formatDate(asset.uploadedAt)}</p>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function LibraryMetric({
  label,
  value,
  detail,
  icon: Icon
}: {
  label: string;
  value: number | string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-h-24 items-center gap-3 border-b border-blue-100 p-3 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-r-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-blue-700 shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-2xl font-bold text-ink">{value}</span>
        <span className="block text-sm font-semibold text-slate-700">{label}</span>
        <span className="block text-xs leading-5 text-slate-500">{detail}</span>
      </span>
    </div>
  );
}
