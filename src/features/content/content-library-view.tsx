"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  BookPlus,
  Clock,
  FileAudio,
  Film,
  FolderOpen,
  Maximize2,
  Image as ImageIcon,
  Layers,
  Plus,
  Search,
  Trash2,
  Upload,
  User,
  X,
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
import { useAuthUser } from "@/features/auth/use-auth-user";
import {
  categories as mockCategories,
  demoUsers,
  learningItems,
  lessons as mockLessons,
  mediaAssets
} from "@/data/mock-data";
import {
  clearLearningItemMedia,
  deleteLearningItem,
  deleteLesson,
  fetchMakaLearnData,
  insertCategory,
  insertLearningItem,
  insertLesson,
  updateLearningItemMedia
} from "@/lib/supabase/app-data";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { uploadMediaAssetToSupabase } from "@/lib/supabase/media";
import { createLessonDraftFromItem } from "@/utils/lesson-template";
import { formatDate } from "@/lib/utils";
import { activityTypeLabels, getActivityTypeLabel } from "@/utils/activity-labels";
import type { ActivityType, Category, LearningItem, Lesson, MediaAsset } from "@/types";

type Tab = "items" | "lessons" | "categories" | "media";
type ContentKind = "pecs" | "gesture";
type NewItemMediaKey = "symbol" | "gesture" | "audio";
type NewItemFiles = Partial<Record<NewItemMediaKey, File>>;
type MediaPreview = {
  title: string;
  value?: string;
  type: MediaAsset["type"];
  label: string;
};
type ContentLibraryLocalState = {
  items: LearningItem[];
  lessons: Lesson[];
  categories: Category[];
  mediaRecords: MediaAsset[];
};

const CONTENT_LIBRARY_STORAGE_KEY = "makalearn-content-library";

const tabMeta: Record<Tab, { label: string; description: string; icon: LucideIcon }> = {
  items: {
    label: "Content",
    description: "Separate PECS cards and fixed gestures",
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
    description: "PECS images, gesture media, and audio",
    icon: Upload
  }
};

const activityTypes: ActivityType[] = [
  "match-word-symbol",
  "choose-correct-symbol",
  "fill-blank",
  "drag-drop-symbol",
  "simple-quiz"
];

const fixedGestureLabels = new Set([
  "I want to go to toilet",
  "I want to eat food",
  "I want to drink water",
  "Help",
  "Yes",
  "No",
  "Sit down"
]);

function readLocalContentLibrary(): ContentLibraryLocalState | null {
  if (typeof window === "undefined" || isSupabaseConfigured()) return null;

  try {
    const value = window.localStorage.getItem(CONTENT_LIBRARY_STORAGE_KEY);
    return value ? (JSON.parse(value) as ContentLibraryLocalState) : null;
  } catch {
    return null;
  }
}

function normalizeLearningItems(records: LearningItem[]) {
  return records.map((item) => ({
    ...item,
    contentType:
      item.contentType ??
      (item.tags?.includes("gesture") ? ("gesture" as const) : ("pecs" as const))
  }));
}

function isFixedGesture(item: LearningItem) {
  return item.contentType === "gesture" && (item.tags.includes("fixed") || fixedGestureLabels.has(item.label));
}

export function ContentLibraryView() {
  const { notify } = useToast();
  const { user } = useAuthUser();
  const [tab, setTab] = useState<Tab>("items");
  const [items, setItems] = useState<LearningItem[]>(learningItems);
  const [lessons, setLessons] = useState<Lesson[]>(mockLessons);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [mediaRecords, setMediaRecords] = useState<MediaAsset[]>(mediaAssets);
  const [users, setUsers] = useState(demoUsers);
  const [contentKind, setContentKind] = useState<ContentKind>("pecs");
  const [search, setSearch] = useState("");
  const [lessonSearch, setLessonSearch] = useState("");
  const [mediaSearch, setMediaSearch] = useState("");
  const [draft, setDraft] = useState<Omit<Lesson, "id" | "createdBy"> | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonObjective, setLessonObjective] = useState("Practice selected learning items with teacher guidance.");
  const [lessonActivityType, setLessonActivityType] = useState<ActivityType>("simple-quiz");
  const [lessonDuration, setLessonDuration] = useState(10);
  const [lessonItemIds, setLessonItemIds] = useState<string[]>(
    learningItems.filter((item) => item.contentType === "pecs").slice(0, 2).map((item) => item.id)
  );
  const [lessonNotes, setLessonNotes] = useState("Manual lesson draft created locally.");
  const [lessonError, setLessonError] = useState("");
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemError, setItemError] = useState("");
  const [newItemFiles, setNewItemFiles] = useState<NewItemFiles>({});
  const [contentReady, setContentReady] = useState(isSupabaseConfigured());
  const [itemPendingDelete, setItemPendingDelete] = useState<LearningItem | null>(null);
  const [lessonPendingDelete, setLessonPendingDelete] = useState<Lesson | null>(null);
  const [deleteAssociatedMedia, setDeleteAssociatedMedia] = useState(true);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<MediaPreview | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      if (!isSupabaseConfigured()) {
        const localContent = readLocalContentLibrary();
        if (active && localContent) {
          setItems(normalizeLearningItems(localContent.items));
          setLessons(localContent.lessons);
          setCategories(localContent.categories);
          setMediaRecords(localContent.mediaRecords);
        }
        if (active) {
          setContentReady(true);
        }
        return;
      }

      try {
        const data = await fetchMakaLearnData();
        if (!active || !data) return;
        setUsers(data.users.length ? data.users : demoUsers);
        setItems(normalizeLearningItems(data.learningItems.length ? data.learningItems : learningItems));
        setLessons(data.lessons.length ? data.lessons : mockLessons);
        setCategories(data.categories.length ? data.categories : mockCategories);
        setMediaRecords(data.mediaAssets.length ? data.mediaAssets : mediaAssets);
        setContentReady(true);
      } catch (error) {
        notify({
          title: "Using local content data",
          description: error instanceof Error ? error.message : "Supabase content could not be loaded."
        });
        setContentReady(true);
      }
    }

    loadSupabaseData();

    return () => {
      active = false;
    };
  }, [notify]);

  useEffect(() => {
    if (!contentReady || typeof window === "undefined" || isSupabaseConfigured()) return;

    const value: ContentLibraryLocalState = {
      items,
      lessons,
      categories,
      mediaRecords
    };
    window.localStorage.setItem(CONTENT_LIBRARY_STORAGE_KEY, JSON.stringify(value));
  }, [categories, contentReady, items, lessons, mediaRecords]);

  const userNameById = useMemo(() => new Map(users.map((candidate) => [candidate.id, candidate.name])), [users]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const pecsItems = useMemo(() => items.filter((item) => item.contentType === "pecs"), [items]);
  const gestureItems = useMemo(() => items.filter((item) => item.contentType === "gesture"), [items]);
  const activeItems = contentKind === "pecs" ? pecsItems : gestureItems;
  const defaultCategoryId =
    contentKind === "gesture"
      ? categories.find((category) => category.id === "cat-gestures")?.id ?? categories[0]?.id ?? ""
      : categories.find((category) => category.id !== "cat-gestures")?.id ?? categories[0]?.id ?? "";
  const filteredItems = useMemo(
    () => activeItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())),
    [activeItems, search]
  );
  const filteredLessons = useMemo(() => {
    const query = lessonSearch.trim().toLowerCase();
    if (!query) return lessons;

    return lessons.filter((lesson) => {
      const activityLabel = getActivityTypeLabel(lesson.activityType).toLowerCase();
      const selectedItemLabels = lesson.learningItemIds
        .map((id) => items.find((item) => item.id === id)?.label ?? "")
        .join(" ")
        .toLowerCase();

      return [lesson.title, lesson.objective, lesson.instructions, activityLabel, selectedItemLabels]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [items, lessonSearch, lessons]);
  const filteredMediaRecords = useMemo(() => {
    const query = mediaSearch.trim().toLowerCase();
    if (!query) return mediaRecords;

    return mediaRecords.filter((asset) => {
      const relatedItem = items.find((item) => item.id === asset.relatedItemId)?.label ?? "";
      const uploader = userNameById.get(asset.uploadedBy) ?? "";

      return [asset.title, asset.fileName, asset.type, asset.bucket, relatedItem, uploader]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [items, mediaRecords, mediaSearch, userNameById]);
  const counts: Record<Tab, number> = {
    items: activeItems.length,
    lessons: lessons.length,
    categories: categories.length,
    media: mediaRecords.length
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
    setLessonFormOpen(true);
    notify({
      title: "Lesson draft generated",
      description: `Review the ${item.label} lesson before saving.`,
      tone: "success"
    });
  }

  function resetLessonForm() {
    setDraft(null);
    setLessonTitle("");
    setLessonObjective("Practice selected learning items with teacher guidance.");
    setLessonActivityType("simple-quiz");
    setLessonDuration(10);
    setLessonItemIds(pecsItems.slice(0, 2).map((item) => item.id));
    setLessonNotes("Manual lesson draft created locally.");
    setLessonError("");
  }

  function openManualLessonForm() {
    resetLessonForm();
    setTab("lessons");
    setLessonFormOpen(true);
  }

  function closeLessonForm() {
    resetLessonForm();
    setLessonFormOpen(false);
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
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
    const nextLesson: Lesson = {
      ...base,
      title: lessonTitle,
      objective: lessonObjective,
      learningItemIds: lessonItemIds,
      activityType: lessonActivityType,
      estimatedDuration: lessonDuration,
      notes: lessonNotes,
      id: `lesson-${Date.now()}`,
      createdBy: user.id
    };

    let savedLesson = nextLesson;
    if (isSupabaseConfigured()) {
      try {
        savedLesson = await insertLesson(nextLesson);
      } catch (error) {
        notify({
          title: "Lesson saved locally",
          description: error instanceof Error ? error.message : "Supabase lesson insert failed."
        });
      }
    }

    setLessons((current) => [savedLesson, ...current]);
    resetLessonForm();
    setLessonFormOpen(false);
    notify({
      title: "Lesson saved",
      description: isSupabaseConfigured() ? "The lesson was saved to the lessons table." : "The lesson was added locally.",
      tone: "success"
    });
  }

  function requestDeleteItem(item: LearningItem) {
    setItemPendingDelete(item);
    setDeleteAssociatedMedia(true);
  }

  async function deleteItem(item: LearningItem, deleteMedia: boolean) {
    setDeleteInProgress(true);
    if (isSupabaseConfigured()) {
      try {
        await deleteLearningItem(item.id, deleteMedia);
      } catch (error) {
        notify({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "The learning item was not deleted from Supabase."
        });
        setDeleteInProgress(false);
        return;
      }
    }

    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    if (deleteMedia) {
      setMediaRecords((current) => current.filter((asset) => asset.relatedItemId !== item.id));
    }
    notify({
      title: "Learning item deleted",
      description: deleteMedia ? "Associated media records were removed." : "Media records were kept.",
      tone: "success"
    });
    setItemPendingDelete(null);
    setDeleteInProgress(false);
  }

  async function deleteLessonRecord(lesson: Lesson) {
    setDeleteInProgress(true);

    if (isSupabaseConfigured()) {
      try {
        await deleteLesson(lesson.id);
      } catch (error) {
        notify({
          title: "Delete failed",
          description: error instanceof Error ? error.message : "The lesson was not deleted from Supabase."
        });
        setDeleteInProgress(false);
        return;
      }
    }

    setLessons((current) => current.filter((candidate) => candidate.id !== lesson.id));
    notify({
      title: "Lesson deleted",
      description: `${lesson.title} was removed from Lessons.`,
      tone: "success"
    });
    setLessonPendingDelete(null);
    setDeleteInProgress(false);
  }

  async function addLearningItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const label = String(form.get("itemLabel") ?? "").trim();
    const categoryId = String(form.get("itemCategory") ?? "").trim();
    const description = String(form.get("itemDescription") ?? "").trim();
    const instruction = String(form.get("itemInstruction") ?? "").trim();

    if (!label || !categoryId || !description || !instruction) {
      setItemError("Add a label, category, description, and classroom instruction.");
      return;
    }

    const nextItem: LearningItem = {
      id: `item-${Date.now()}`,
      contentType: contentKind,
      label,
      categoryId,
      description,
      instruction,
      symbolImageUrl: getSymbolPlaceholder(label),
      gestureMediaUrl: undefined,
      audioUrl: undefined,
      tags: [contentKind],
      createdBy: user.id,
      updatedAt: new Date().toISOString()
    };

    let savedItem = nextItem;
    let savedRemotely = false;
    if (isSupabaseConfigured()) {
      try {
        savedItem = await insertLearningItem(nextItem);
        savedRemotely = true;
      } catch (error) {
        notify({
          title: "Learning item saved locally",
          description: error instanceof Error ? error.message : "Supabase learning item insert failed."
        });
      }
    }

    if (savedRemotely) {
      try {
        savedItem = await uploadNewItemMedia(savedItem, newItemFiles);
      } catch {
        savedRemotely = false;
      }
    } else {
      savedItem = applyLocalMediaToItem(savedItem, newItemFiles);
      addLocalMediaRecords(savedItem, newItemFiles);
    }

    setItems((current) => [savedItem, ...current]);
    setSearch("");
    setShowItemForm(false);
    setItemError("");
    setNewItemFiles({});
    formElement.reset();
    notify({
      title: contentKind === "pecs" ? "PECS card added" : "Gesture stored",
      description: savedRemotely
        ? `${savedItem.label} was saved to the learning items table.`
        : `${savedItem.label} was added to this local session.`,
      tone: "success"
    });
  }

  function stageNewItemFile(key: NewItemMediaKey, file: File) {
    setNewItemFiles((current) => ({ ...current, [key]: file }));
    setItemError("");
    return Promise.resolve();
  }

  function removeNewItemFile(key: NewItemMediaKey) {
    setNewItemFiles((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addLocalMediaRecords(item: LearningItem, files: NewItemFiles) {
    const records = createLocalMediaRecords(item, files, user.id);
    if (records.length) {
      setMediaRecords((current) => [...records, ...current]);
    }
  }

  async function uploadNewItemMedia(item: LearningItem, files: NewItemFiles) {
    const uploadConfigs: Array<{
      key: NewItemMediaKey;
      bucket: MediaAsset["bucket"];
      type: MediaAsset["type"];
    }> = [
      { key: "symbol", bucket: "symbol-images", type: "symbol-image" },
      { key: "gesture", bucket: "gesture-media", type: "gesture-media" },
      { key: "audio", bucket: "audio-files", type: "audio-file" }
    ];

    let updatedItem = item;
    let remainingLocalFiles: NewItemFiles = { ...files };
    for (const config of uploadConfigs) {
      const file = files[config.key];
      if (!file) continue;

      try {
        const uploaded = await uploadMediaAssetToSupabase({
          file,
          bucket: config.bucket,
          type: config.type,
          title: `${item.label} ${config.type.replace("-", " ")}`,
          uploadedBy: user.id,
          relatedItemId: item.id
        });

        if (uploaded.publicUrl) {
          await updateLearningItemMedia(item.id, uploaded);
          updatedItem = applyMediaUrlToItem(updatedItem, uploaded.type, uploaded.publicUrl, uploaded.uploadedAt);
        }

        remainingLocalFiles = removeFileKey(remainingLocalFiles, config.key);
        setMediaRecords((current) => [uploaded, ...current]);
      } catch (error) {
        notify({
          title: "Media saved locally",
          description: error instanceof Error ? error.message : "One upload failed, so attached files were kept locally."
        });
        const localItem = applyLocalMediaToItem(updatedItem, remainingLocalFiles);
        addLocalMediaRecords(localItem, remainingLocalFiles);
        return localItem;
      }
    }

    return updatedItem;
  }

  async function handleMediaUpload(
    item: LearningItem,
    file: File,
    config: Pick<MediaAsset, "bucket" | "type">
  ) {
    if (!isSupabaseConfigured()) {
      const uploadedAt = new Date().toISOString();
      const publicUrl = URL.createObjectURL(file);
      const localRecord: MediaAsset = {
        id: `media-${Date.now()}-${config.type}`,
        title: `${item.label} ${config.type.replace("-", " ")}`,
        type: config.type,
        fileName: file.name,
        bucket: config.bucket,
        publicUrl,
        uploadedBy: user.id,
        uploadedAt,
        relatedItemId: item.id
      };

      setMediaRecords((current) => [
        localRecord,
        ...current.filter((asset) => !(asset.relatedItemId === item.id && asset.type === config.type))
      ]);
      setItems((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? applyMediaUrlToItem(candidate, config.type, publicUrl, uploadedAt) : candidate
        )
      );
      notify({
        title: "Media attached",
        description: `${file.name} was added for this local session.`,
        tone: "success"
      });
      return;
    }

    try {
      const uploaded = await uploadMediaAssetToSupabase({
        file,
        bucket: config.bucket,
        type: config.type,
        title: `${item.label} ${config.type.replace("-", " ")}`,
        uploadedBy: user.id,
        relatedItemId: item.id
      });

      if (uploaded.publicUrl) {
        await updateLearningItemMedia(item.id, uploaded);
      }

      setMediaRecords((current) => [uploaded, ...current]);

      setItems((current) =>
        current.map((candidate) => {
          if (candidate.id !== item.id || !uploaded.publicUrl) return candidate;

          if (uploaded.type === "symbol-image") {
            return { ...candidate, symbolImageUrl: uploaded.publicUrl, updatedAt: uploaded.uploadedAt };
          }

          if (uploaded.type === "gesture-media") {
            return { ...candidate, gestureMediaUrl: uploaded.publicUrl, updatedAt: uploaded.uploadedAt };
          }

          return { ...candidate, audioUrl: uploaded.publicUrl, updatedAt: uploaded.uploadedAt };
        })
      );

      notify({
        title: "Media uploaded",
        description: `${file.name} was saved to ${uploaded.bucket}.`,
        tone: "success"
      });
    } catch (error) {
      notify({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Check your Supabase setup and try again."
      });
      throw error;
    }
  }

  async function clearItemMedia(item: LearningItem, type: MediaAsset["type"]) {
    if (!getItemMediaValue(item, type)) return;

    if (isSupabaseConfigured()) {
      try {
        await clearLearningItemMedia(item.id, type);
      } catch (error) {
        notify({
          title: "Media remove failed",
          description: error instanceof Error ? error.message : "The media was not removed from Supabase."
        });
        throw error;
      }
    }

    const updatedAt = new Date().toISOString();
    setItems((current) =>
      current.map((candidate) => (candidate.id === item.id ? clearMediaFromItem(candidate, type, updatedAt) : candidate))
    );
    setMediaRecords((current) => current.filter((asset) => !(asset.relatedItemId === item.id && asset.type === type)));
    notify({
      title: "Media removed",
      description: `${getMediaTypeLabel(type)} was removed from ${item.label}.`,
      tone: "success"
    });
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get("categoryName") ?? "").trim();
    if (!name) return;
    const nextCategory: Category = {
      id: `cat-${Date.now()}`,
      name,
      description: String(form.get("categoryDescription") ?? "Shared category"),
      color: "#dbeafe",
      createdBy: user.id
    };
    let savedCategory = nextCategory;
    if (isSupabaseConfigured()) {
      try {
        savedCategory = await insertCategory(nextCategory);
      } catch (error) {
        notify({
          title: "Category saved locally",
          description: error instanceof Error ? error.message : "Supabase category insert failed."
        });
      }
    }
    setCategories((current) => [savedCategory, ...current]);
    formElement.reset();
    notify({
      title: "Category added",
      description: isSupabaseConfigured() ? "Categories are shared through Supabase." : "Categories are shared locally.",
      tone: "success"
    });
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-soft">
        <div>
          <div className="relative min-h-[18rem] overflow-hidden bg-[#f7fbff] p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-y-0 right-0 hidden w-40 border-l border-blue-100 bg-[repeating-linear-gradient(180deg,#dbeafe_0,#dbeafe_12px,#f8fbff_12px,#f8fbff_24px)] opacity-70 lg:block" />
            <div className="relative max-w-3xl">
              <p className="mb-3 inline-flex rounded-full border border-blue-100 bg-white px-3 py-1 text-sm font-semibold text-blue-700 shadow-sm">
                Content Library
              </p>
              <h1 className="max-w-2xl text-3xl font-bold leading-tight text-ink md:text-5xl">
                Prepare PECS cards and fixed gesture references.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Keep PECS activities separate from the seven gesture-recognition presentation gestures while approved content is still pending.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => {
                    setTab("items");
                    setShowItemForm(true);
                    setItemError("");
                    setNewItemFiles({});
                  }}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {contentKind === "pecs" ? "Add PECS card" : "Add gesture"}
                </Button>
                <Button variant="outline" onClick={openManualLessonForm}>
                  <BookPlus className="h-4 w-4" aria-hidden="true" />
                  Build lesson
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {showItemForm ? (
        <Card className="border-blue-200 bg-[#fbfdff]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-600 text-white">
                <Plus className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>{contentKind === "pecs" ? "Add PECS card" : "Add gesture"}</CardTitle>
                <CardDescription>
                  {contentKind === "pecs"
                    ? "Create a demo PECS card with only a card image and optional audio cue."
                    : "Store a gesture reference with optional image, video, and audio. Only the seven fixed gestures appear in recognition."}
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Close add item form"
              onClick={() => {
                setShowItemForm(false);
                setItemError("");
                setNewItemFiles({});
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={addLearningItem}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <Label htmlFor="itemLabel">{contentKind === "pecs" ? "PECS word or label" : "Gesture label"}</Label>
                <Input
                  id="itemLabel"
                  name="itemLabel"
                  placeholder={contentKind === "pecs" ? "Yes" : "Classroom gesture"}
                  onChange={() => itemError && setItemError("")}
                  required
                />
              </div>
              <div>
                <Label htmlFor="itemCategory">Category</Label>
                <Select
                  id="itemCategory"
                  name="itemCategory"
                  defaultValue={defaultCategoryId}
                  onChange={() => itemError && setItemError("")}
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <Label htmlFor="itemDescription">Description</Label>
                <Textarea
                  id="itemDescription"
                  name="itemDescription"
                  placeholder="Where this word is used in class."
                  onChange={() => itemError && setItemError("")}
                  required
                />
              </div>
              <div>
                <Label htmlFor="itemInstruction">Teacher instruction</Label>
                <Textarea
                  id="itemInstruction"
                  name="itemInstruction"
                  placeholder="How the teacher should model or prompt it."
                  onChange={() => itemError && setItemError("")}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Media uploads</Label>
              <div className={`mt-2 grid gap-3 ${contentKind === "gesture" ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                <FileUpload
                  icon={ImageIcon}
                  label={contentKind === "pecs" ? "PECS image" : "Reference image"}
                  accept="image/*"
                  hint="PNG, JPG, or WebP"
                  storageNote={contentKind === "pecs" ? "Choose an approved PECS image when available." : "Choose a gesture reference image when available."}
                  successMessage="Ready to save with this item."
                  onUpload={(file) => stageNewItemFile("symbol", file)}
                  onRemove={() => removeNewItemFile("symbol")}
                />
                {contentKind === "gesture" ? (
                  <FileUpload
                    icon={Film}
                    label="Gesture image/video"
                    accept="image/*,video/*"
                    hint="Image or short video"
                    storageNote="Choose a gesture reference file."
                    successMessage="Ready to save with this item."
                    onUpload={(file) => stageNewItemFile("gesture", file)}
                    onRemove={() => removeNewItemFile("gesture")}
                  />
                ) : null}
                <FileUpload
                  icon={FileAudio}
                  label="Audio"
                  accept="audio/*"
                  hint="MP3, WAV, or M4A"
                  storageNote="Choose an audio cue file."
                  successMessage="Ready to save with this item."
                  onUpload={(file) => stageNewItemFile("audio", file)}
                  onRemove={() => removeNewItemFile("audio")}
                />
              </div>
              <FieldHint>
                Files upload to Supabase Storage when configured. In local mode, they are previewed for this session only.
              </FieldHint>
            </div>

            <FieldError message={itemError} />
            <div className="flex flex-wrap gap-3">
              <Button type="submit">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Save item
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowItemForm(false);
                  setItemError("");
                  setNewItemFiles({});
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

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
              <h2 className="text-xl font-bold text-ink">
                {contentKind === "pecs" ? "PECS card board" : "Fixed gesture board"}
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {contentKind === "pecs"
                  ? "PECS cards use image and audio uploads and are the only source for activities."
                  : "Only these seven fixed gestures appear in gesture recognition and presentation practice."}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:flex-row">
              <div className="grid grid-cols-2 rounded-lg border border-blue-100 bg-skywash p-1">
                {(["pecs", "gesture"] as ContentKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setContentKind(kind);
                      setSearch("");
                    }}
                    className={`min-h-10 rounded-md px-4 text-sm font-semibold transition ${
                      contentKind === kind ? "bg-blue-600 text-white shadow-sm" : "text-blue-700 hover:bg-white"
                    }`}
                    aria-pressed={contentKind === kind}
                  >
                    {kind === "pecs" ? `PECS (${pecsItems.length})` : `Gestures (${gestureItems.length})`}
                  </button>
                ))}
              </div>
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={contentKind === "pecs" ? "Search PECS cards" : "Search fixed gestures"}
                  className="pl-10"
                />
              </div>
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
                        <LearningItemSymbolPreview value={item.symbolImageUrl} label={item.label} />
                      </div>

                      <div className="mt-5 rounded-lg bg-[#f7fbff] p-4">
                        <p className="text-sm leading-6 text-slate-700">{item.description}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.instruction}</p>
                      </div>

                      <ItemMediaGallery
                        item={item}
                        onPreview={(preview) => setMediaPreview(preview)}
                      />

                      <div className="mt-4 grid gap-3">
                        <FileUpload
                          icon={ImageIcon}
                          label={item.contentType === "pecs" ? "PECS image" : "Reference image"}
                          accept="image/*"
                          hint="PNG, JPG, or WebP"
                          storageNote="Supabase Storage: symbol-images bucket."
                          existingFileName={getMediaFileName(item.symbolImageUrl, item.contentType === "pecs" ? "Current PECS image" : "Current reference image")}
                          onUpload={(file) => handleMediaUpload(item, file, { bucket: "symbol-images", type: "symbol-image" })}
                          onRemove={() => clearItemMedia(item, "symbol-image")}
                          compact
                        />
                        {item.contentType === "gesture" ? (
                          <FileUpload
                            icon={Film}
                            label="Gesture image/video"
                            accept="image/*,video/*"
                            hint="Image or short video"
                            storageNote="Supabase Storage: gesture-media bucket."
                            existingFileName={getMediaFileName(item.gestureMediaUrl, "Current gesture media")}
                            onUpload={(file) => handleMediaUpload(item, file, { bucket: "gesture-media", type: "gesture-media" })}
                            onRemove={() => clearItemMedia(item, "gesture-media")}
                            compact
                          />
                        ) : null}
                        <FileUpload
                          icon={FileAudio}
                          label="Audio"
                          accept="audio/*"
                          hint="MP3, WAV, or M4A"
                          storageNote="Supabase Storage: audio-files bucket."
                          existingFileName={getMediaFileName(item.audioUrl, "Current audio")}
                          onUpload={(file) => handleMediaUpload(item, file, { bucket: "audio-files", type: "audio-file" })}
                          onRemove={() => clearItemMedia(item, "audio-file")}
                          compact
                        />
                      </div>

                      <CardFooter className="mt-5 grid min-h-[6.75rem] grid-cols-[minmax(0,1fr)_11rem] items-end gap-3">
                        <p className="pb-1 text-xs font-medium leading-5 text-slate-500">
                          Last updated {formatDate(item.updatedAt)}
                        </p>
                        <div className="grid w-44 gap-2 justify-self-end">
                          {item.contentType === "pecs" ? (
                            <>
                              <Button className="w-full whitespace-nowrap" variant="secondary" size="sm" onClick={() => generateDraft(item)}>
                                <BookPlus className="h-4 w-4" aria-hidden="true" />
                                Generate lesson
                              </Button>
                              <Button className="w-full whitespace-nowrap" variant="danger" size="sm" onClick={() => requestDeleteItem(item)}>
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Delete
                              </Button>
                            </>
                          ) : (
                            <>
                              {isFixedGesture(item) ? (
                                <Badge className="justify-center bg-mint text-green-700">Fixed gesture</Badge>
                              ) : (
                                <Button className="w-full whitespace-nowrap" variant="danger" size="sm" onClick={() => requestDeleteItem(item)}>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  Delete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </CardFooter>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Layers}
              title={contentKind === "pecs" ? "No PECS cards" : "No fixed gestures"}
              description={
                contentKind === "pecs"
                  ? "Add PECS cards before creating symbol-based activities."
                  : "The gesture list should contain only the seven final presentation gestures."
              }
            />
          )}
        </section>
      ) : null}

      {tab === "lessons" ? (
        <section className="space-y-4">
          <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-xl font-bold text-ink">Lessons</h2>
              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <div className="relative w-full sm:min-w-72 lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <Input
                    value={lessonSearch}
                    onChange={(event) => setLessonSearch(event.target.value)}
                    placeholder="Search lessons"
                    className="pl-10"
                  />
                </div>
                {lessonFormOpen ? (
                  <Button type="button" variant="outline" onClick={closeLessonForm} aria-expanded="true" aria-controls="lesson-form">
                    <X className="h-4 w-4" aria-hidden="true" />
                    Close form
                  </Button>
                ) : (
                  <Button type="button" onClick={openManualLessonForm} aria-expanded="false" aria-controls="lesson-form">
                    <BookPlus className="h-4 w-4" aria-hidden="true" />
                    Create manual lesson
                  </Button>
                )}
              </div>
            </div>
          </section>

          {lessonFormOpen ? (
          <Card id="lesson-form" className="bg-[#fbfdff]">
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
                  options={pecsItems.map((item) => ({
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
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit">Save lesson</Button>
                <Button type="button" variant="outline" onClick={closeLessonForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
          ) : null}

          <section className="space-y-4">
            {filteredLessons.length ? (
              <div className="grid gap-4">
                {filteredLessons.map((lesson) => (
                  <Card key={lesson.id} className="flex h-full flex-col overflow-hidden border-l-4 border-l-blue-300 bg-[#fbfdff]">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
                      <div className="min-w-0">
                        <CardTitle className="text-2xl leading-tight">{lesson.title}</CardTitle>
                        <p className="mt-3 text-sm leading-6 text-slate-700">{lesson.objective}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.instructions}</p>
                      </div>
                      <div className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        <span className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 text-sm font-semibold text-blue-700">
                          <Clock className="h-4 w-4" aria-hidden="true" />
                          {lesson.estimatedDuration} min
                        </span>
                        <span className="inline-flex min-h-11 items-center rounded-lg border border-blue-100 bg-white px-3 text-sm font-semibold text-blue-700">
                          {getActivityTypeLabel(lesson.activityType)}
                        </span>
                      </div>
                    </div>
                    <CardFooter className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs font-medium leading-5 text-slate-500">
                        {lesson.learningItemIds.length} learning item{lesson.learningItemIds.length === 1 ? "" : "s"} selected
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button size="sm" variant="danger" onClick={() => setLessonPendingDelete(lesson)}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="No lessons found"
                description="Try another search term or save a new lesson draft."
              />
            )}
          </section>
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-ink">Media library</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Uploaded picture cards and placeholder records appear here. Local records remain visible when Supabase is not configured.
                </p>
              </div>
              <div className="w-full lg:max-w-sm">
                <Label htmlFor="media-search">Search stored media</Label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
                  <Input
                    id="media-search"
                    type="search"
                    value={mediaSearch}
                    onChange={(event) => setMediaSearch(event.target.value)}
                    placeholder="Search title, filename, item, or type"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>
          {filteredMediaRecords.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMediaRecords.map((asset) => (
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
                  <CardDescription className="break-all">{asset.fileName}</CardDescription>
                  <div className="mt-3">
                    <MediaInlinePreview
                      preview={{
                        title: asset.title,
                        value: asset.publicUrl,
                        type: asset.type,
                        label: asset.title
                      }}
                      onPreview={setMediaPreview}
                    />
                  </div>
                  <CardFooter className="mt-3">
                    <p className="text-sm text-slate-600">Uploaded {formatDate(asset.uploadedAt)}</p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title={mediaRecords.length ? "No media found" : "No stored media yet"}
              description={
                mediaRecords.length
                  ? "Try a different title, filename, learning item, or media type."
                  : "Uploaded media will appear here for teachers and admins to find."
              }
            />
          )}
        </section>
      ) : null}

      {mediaPreview ? <MediaPreviewModal preview={mediaPreview} onClose={() => setMediaPreview(null)} /> : null}

      {itemPendingDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-item-title"
            aria-describedby="delete-item-description"
            className="w-full max-w-md rounded-lg border border-red-100 bg-white p-5 shadow-soft"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="delete-item-title" className="text-lg font-bold text-ink">
                  Delete {itemPendingDelete.label}?
                </h2>
                <p id="delete-item-description" className="mt-2 text-sm leading-6 text-slate-600">
                  This removes the learning item from the Content Library. This action cannot be undone.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close delete confirmation"
                disabled={deleteInProgress}
                onClick={() => setItemPendingDelete(null)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-blue-100 bg-[#f7fbff] p-3">
              <input
                type="checkbox"
                checked={deleteAssociatedMedia}
                onChange={(event) => setDeleteAssociatedMedia(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-blue-200 text-blue-600 focus:ring-blue-200"
              />
              <span>
                <span className="block text-sm font-semibold text-ink">Delete associated media records</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Turn this off if you want uploaded symbol, gesture, or audio records to remain in the Media Library.
                </span>
              </span>
            </label>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={deleteInProgress}
                onClick={() => setItemPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleteInProgress}
                onClick={() => deleteItem(itemPendingDelete, deleteAssociatedMedia)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {deleteInProgress ? "Deleting..." : "Delete item"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {lessonPendingDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-lesson-title"
            aria-describedby="delete-lesson-description"
            className="w-full max-w-md rounded-lg border border-red-100 bg-white p-5 shadow-soft"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="delete-lesson-title" className="text-lg font-bold text-ink">
                  Delete {lessonPendingDelete.title}?
                </h2>
                <p id="delete-lesson-description" className="mt-2 text-sm leading-6 text-slate-600">
                  This removes the lesson from the lesson library. Learning items and activities will stay available.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close delete lesson confirmation"
                disabled={deleteInProgress}
                onClick={() => setLessonPendingDelete(null)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={deleteInProgress}
                onClick={() => setLessonPendingDelete(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleteInProgress}
                onClick={() => deleteLessonRecord(lessonPendingDelete)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {deleteInProgress ? "Deleting..." : "Delete lesson"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
function getSymbolPlaceholder(label: string) {
  return label
    .replace(/[^a-z]/gi, "")
    .slice(0, 3)
    .toUpperCase();
}

function applyMediaUrlToItem(item: LearningItem, type: MediaAsset["type"], publicUrl: string, updatedAt: string) {
  if (type === "symbol-image") {
    return { ...item, symbolImageUrl: publicUrl, updatedAt };
  }

  if (type === "gesture-media") {
    return { ...item, gestureMediaUrl: publicUrl, updatedAt };
  }

  return { ...item, audioUrl: publicUrl, updatedAt };
}

function clearMediaFromItem(item: LearningItem, type: MediaAsset["type"], updatedAt: string) {
  if (type === "symbol-image") {
    return { ...item, symbolImageUrl: undefined, updatedAt };
  }

  if (type === "gesture-media") {
    return { ...item, gestureMediaUrl: undefined, updatedAt };
  }

  return { ...item, audioUrl: undefined, updatedAt };
}

function getItemMediaValue(item: LearningItem, type: MediaAsset["type"]) {
  if (type === "symbol-image") return item.symbolImageUrl;
  if (type === "gesture-media") return item.gestureMediaUrl;
  return item.audioUrl;
}

function getMediaTypeLabel(type: MediaAsset["type"]) {
  if (type === "symbol-image") return "Symbol image";
  if (type === "gesture-media") return "Gesture media";
  return "Audio";
}

function getMediaFileName(value: string | undefined, fallback: string) {
  if (!value) return undefined;

  if (value.startsWith("blob:")) return fallback;

  if (value.startsWith("http") || value.startsWith("/")) {
    const lastSegment = value.split("/").filter(Boolean).pop();
    return lastSegment ? decodeURIComponent(lastSegment) : fallback;
  }

  return undefined;
}

function applyLocalMediaToItem(item: LearningItem, files: NewItemFiles) {
  const updatedAt = new Date().toISOString();

  return {
    ...item,
    symbolImageUrl: files.symbol ? URL.createObjectURL(files.symbol) : item.symbolImageUrl,
    gestureMediaUrl: files.gesture ? URL.createObjectURL(files.gesture) : item.gestureMediaUrl,
    audioUrl: files.audio ? URL.createObjectURL(files.audio) : item.audioUrl,
    updatedAt
  };
}

function removeFileKey(files: NewItemFiles, key: NewItemMediaKey) {
  const next = { ...files };
  delete next[key];
  return next;
}

function createLocalMediaRecords(item: LearningItem, files: NewItemFiles, uploadedBy: string) {
  const uploadedAt = new Date().toISOString();
  const records: MediaAsset[] = [];

  if (files.symbol) {
    records.push({
      id: `media-${Date.now()}-symbol`,
      title: `${item.label} symbol image`,
      type: "symbol-image",
      fileName: files.symbol.name,
      bucket: "symbol-images",
      publicUrl: item.symbolImageUrl,
      uploadedBy,
      uploadedAt,
      relatedItemId: item.id
    });
  }

  if (files.gesture) {
    records.push({
      id: `media-${Date.now()}-gesture`,
      title: `${item.label} gesture media`,
      type: "gesture-media",
      fileName: files.gesture.name,
      bucket: "gesture-media",
      publicUrl: item.gestureMediaUrl,
      uploadedBy,
      uploadedAt,
      relatedItemId: item.id
    });
  }

  if (files.audio) {
    records.push({
      id: `media-${Date.now()}-audio`,
      title: `${item.label} audio`,
      type: "audio-file",
      fileName: files.audio.name,
      bucket: "audio-files",
      publicUrl: item.audioUrl,
      uploadedBy,
      uploadedAt,
      relatedItemId: item.id
    });
  }

  return records;
}

function ItemMediaGallery({
  item,
  onPreview
}: {
  item: LearningItem;
  onPreview: (preview: MediaPreview) => void;
}) {
  const previews: MediaPreview[] = [
    {
      title: item.contentType === "pecs" ? "PECS image" : "Reference image",
      value: item.symbolImageUrl,
      type: "symbol-image",
      label: `${item.label} image`
    },
    ...(item.contentType === "gesture"
      ? [
          {
            title: "Gesture image/video",
            value: item.gestureMediaUrl,
            type: "gesture-media" as const,
            label: `${item.label} gesture media`
          }
        ]
      : []),
    {
      title: "Audio cue",
      value: item.audioUrl,
      type: "audio-file",
      label: `${item.label} audio`
    }
  ];

  return (
    <div className="mt-4 grid gap-3">
      {previews.map((preview) => (
        <MediaInlinePreview key={preview.title} preview={preview} onPreview={onPreview} />
      ))}
    </div>
  );
}

function MediaInlinePreview({
  preview,
  onPreview
}: {
  preview: MediaPreview;
  onPreview: (preview: MediaPreview) => void;
}) {
  const value = preview.value?.trim();

  if (!value) {
    return (
      <div className="rounded-lg border border-dashed border-blue-100 bg-[#f8fbff] p-3 text-sm font-semibold text-slate-500">
        {preview.title}: no media added
      </div>
    );
  }

  if (preview.type === "audio-file" && isAudioUrl(value)) {
    return (
      <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">{preview.title}</p>
        <audio controls className="w-full" aria-label={preview.label}>
          <source src={value} />
        </audio>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onPreview(preview)}
      className="group flex min-h-20 w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-blue-100 bg-[#f8fbff] p-3 text-left transition hover:border-blue-300 hover:bg-white"
    >
      <span className="grid h-14 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-blue-100 bg-white text-sm font-black text-blue-700">
        {isImageUrl(value) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : isVideoUrl(value) ? (
          <Film className="h-5 w-5" aria-hidden="true" />
        ) : (
          value
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{preview.title}</span>
        <span className="mt-1 block truncate text-xs text-slate-500">{getMediaFileName(value, "Stored media") ?? value}</span>
      </span>
      <Maximize2 className="h-4 w-4 shrink-0 text-blue-600 opacity-70 transition group-hover:opacity-100" aria-hidden="true" />
    </button>
  );
}

function MediaPreviewModal({ preview, onClose }: { preview: MediaPreview; onClose: () => void }) {
  const value = preview.value?.trim();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={preview.title}
        className="w-full max-w-3xl overflow-hidden rounded-lg border border-blue-100 bg-white shadow-soft"
      >
        <div className="flex items-center justify-between gap-3 border-b border-blue-100 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Media preview</p>
            <h2 className="text-lg font-bold text-ink">{preview.title}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close media preview" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="bg-[#f8fbff] p-4">
          {!value ? (
            <p className="rounded-lg border border-dashed border-blue-100 bg-white p-6 text-center text-sm font-semibold text-slate-500">
              No media added.
            </p>
          ) : isImageUrl(value) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={preview.label} className="max-h-[70vh] w-full rounded-lg object-contain" />
          ) : isVideoUrl(value) ? (
            <video controls className="max-h-[70vh] w-full rounded-lg bg-black" aria-label={preview.label}>
              <source src={value} />
            </video>
          ) : isAudioUrl(value) ? (
            <div className="rounded-lg border border-blue-100 bg-white p-5">
              <audio controls className="w-full" aria-label={preview.label}>
                <source src={value} />
              </audio>
            </div>
          ) : (
            <p className="rounded-lg border border-blue-100 bg-white p-6 text-center text-3xl font-black text-blue-700">
              {value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function LearningItemSymbolPreview({ value, label }: { value?: string; label: string }) {
  const isImageUrl = Boolean(value?.startsWith("http") || value?.startsWith("/") || value?.startsWith("blob:"));

  if (isImageUrl && value) {
    return (
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-blue-100 bg-[#f8fbff] shadow-inner">
        {/* Official/approved picture-card images can be uploaded through Supabase Storage later. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- upload previews may use temporary blob URLs. */}
        <img src={value} alt={`${label} picture card`} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-blue-100 bg-[#f8fbff] text-xl font-black text-blue-700 shadow-inner">
      {value}
    </div>
  );
}

function isImageUrl(value: string) {
  return isUrl(value) && /\.(apng|avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(value);
}

function isVideoUrl(value: string) {
  return isUrl(value) && /\.(mov|mp4|mpeg|ogg|ogv|webm)(\?.*)?$/i.test(value);
}

function isAudioUrl(value: string) {
  return isUrl(value) && /\.(aac|m4a|mp3|oga|ogg|opus|wav|weba)(\?.*)?$/i.test(value);
}

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/") || value.startsWith("blob:");
}
