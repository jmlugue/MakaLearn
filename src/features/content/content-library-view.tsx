"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { LoadingState } from "@/components/common/loading-state";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { insertAuditLog } from "@/lib/audit-logs";
import {
  createActivityQuestions,
  deleteCategory,
  deleteLearningItem,
  deleteLesson,
  fetchMakaLearnData,
  insertActivity,
  insertCategory,
  insertLearningItem,
  insertLesson,
  updateActivity,
  updateCategoryDetails,
  updateLearningItemDetails,
  updateLearningItemMedia,
  updateLesson
} from "@/lib/supabase/app-data";
import { uploadMediaAssetToSupabase } from "@/lib/supabase/media";
import { createLessonDraftFromItem } from "@/utils/lesson-template";
import { ensurePecsManifestCategories, ensurePecsManifestItems } from "@/utils/pecs-content-library";
import { upgradeStarterLearningItemPrompts } from "@/utils/starter-learning-item-prompts";
import { CardDetailDialog, type CardTextValues } from "@/features/content/card-detail-dialog";
import { CardFormDialog, type NewCardFiles, type NewCardValues } from "@/features/content/card-form-dialog";
import { CardsTab } from "@/features/content/cards-tab";
import { CategoriesTab } from "@/features/content/categories-tab";
import { CategoryFormDialog, type CategoryFormValues } from "@/features/content/category-form-dialog";
import { createLearningItemInstruction, nameFor, type ContentKind } from "@/features/content/content-shared";
import { LessonFormDialog, type LessonFormMode, type LessonFormValues } from "@/features/content/lesson-form-dialog";
import { LessonPreviewDialog } from "@/features/content/lesson-preview-dialog";
import { LessonsTab } from "@/features/content/lessons-tab";
import { MediaPreviewDialog } from "@/features/content/media-preview-dialog";
import { MediaTab } from "@/features/content/media-tab";
import type { Activity, ActivityType, AppUser, Category, LearningItem, Lesson, MediaAsset } from "@/types";

type Tab = "cards" | "lessons" | "categories" | "media";
type UploadConfig = Pick<MediaAsset, "bucket" | "type">;

function applyMediaUrlToItem(item: LearningItem, type: MediaAsset["type"], publicUrl: string, updatedAt: string): LearningItem {
  if (type === "symbol-image") return { ...item, symbolImageUrl: publicUrl, updatedAt };
  if (type === "gesture-media") return { ...item, gestureMediaUrl: publicUrl, updatedAt };
  return { ...item, audioUrl: publicUrl, updatedAt };
}

function mediaTypeText(type: MediaAsset["type"]) {
  if (type === "symbol-image") return "image";
  if (type === "gesture-media") return "gesture media";
  return "audio";
}

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function ContentLibraryView({ initialItemId }: { initialItemId?: string } = {}) {
  const { notify } = useToast();
  const { user } = useAuthUser();
  const [tab, setTab] = useState<Tab>("cards");
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  // Cards tab filters live here so category tiles can jump into a filtered view.
  const [kind, setKind] = useState<ContentKind>("pecs");
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");

  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [openItemId, setOpenItemId] = useState("");
  const [itemToDelete, setItemToDelete] = useState<LearningItem | null>(null);
  const [deleteMedia, setDeleteMedia] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [lessonMode, setLessonMode] = useState<LessonFormMode | null>(null);
  const [openLessonId, setOpenLessonId] = useState("");
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [categoryForm, setCategoryForm] = useState<{ category: Category | null } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [openAssetId, setOpenAssetId] = useState("");

  useEffect(() => {
    let active = true;
    fetchMakaLearnData()
      .then((data) => {
        if (!active) return;
        setUsers(data.users);
        setItems(ensurePecsManifestItems(upgradeStarterLearningItemPrompts(data.learningItems).map((item) => ({
          ...item,
          contentType: item.contentType ?? (item.tags?.includes("gesture") ? "gesture" : "pecs")
        }))));
        setLessons(data.lessons);
        setCategories(ensurePecsManifestCategories(data.categories));
        setMedia(data.mediaAssets);
        setActivities(data.activities);
      })
      .catch(() => {
        if (!active) return;
        notify({ title: "Content unavailable", description: "Content could not be loaded.", tone: "error" });
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [notify]);

  // Deep link from the Admin page (/content?item=<id>): open that card once content has loaded.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (!ready || !initialItemId || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const target = items.find((item) => item.id === initialItemId);
    if (!target) {
      notify({ title: "Card not found", description: "It may have been deleted." });
      return;
    }
    setTab("cards");
    setKind(target.contentType);
    setOpenItemId(target.id);
  }, [initialItemId, items, notify, ready]);

  const userNames = useMemo(() => new Map(users.map((candidate) => [candidate.id, candidate.name])), [users]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const libraryMedia = useMemo(() => media.filter((asset) => asset.type !== "learner-photo"), [media]);
  const openItem = itemById.get(openItemId) ?? null;
  const openLesson = lessons.find((lesson) => lesson.id === openLessonId) ?? null;
  const openAsset = libraryMedia.find((asset) => asset.id === openAssetId) ?? null;

  function itemsOf(lesson: Lesson) {
    return lesson.learningItemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
  }

  /** Lessons do not store their activity id, so find it by the id pattern used on save, then by title. */
  function findLessonActivity(lesson: Lesson) {
    return (
      activities.find((activity) => activity.id === lesson.relatedActivityId) ??
      activities.find((activity) => activity.id === `activity-${lesson.id}`) ??
      activities.find((activity) => activity.id.startsWith("activity-lesson-") && activity.title === `${lesson.title} activity`)
    );
  }

  function lessonActivityHref(lesson: Lesson) {
    if (!itemsOf(lesson).some((item) => item.contentType === "pecs")) return "/gesture-practice";
    const activity = findLessonActivity(lesson);
    return activity ? `/activities?activityId=${activity.id}` : `/activities?type=${lesson.activityType}`;
  }

  function log(action: "upload" | "create" | "edit" | "delete", targetType: string, targetTitle: string, detail: string, targetId?: string) {
    insertAuditLog({ category: "content", action, actor: user, targetType, targetId, targetTitle, detail }).catch(() => undefined);
  }

  function errorText(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }

  // Cards

  async function uploadToItem(item: LearningItem, file: File, config: UploadConfig) {
    const uploaded = await uploadMediaAssetToSupabase({
      file,
      bucket: config.bucket,
      type: config.type,
      title: `${item.label} ${mediaTypeText(config.type)}`,
      uploadedBy: user.id,
      relatedItemId: item.id
    });
    if (uploaded.publicUrl) {
      await updateLearningItemMedia(item.id, uploaded);
    }
    setMedia((current) => [uploaded, ...current]);
    return uploaded;
  }

  async function addCard(values: NewCardValues) {
    const draft: LearningItem = {
      id: `item-${Date.now()}`,
      contentType: values.kind,
      label: values.label,
      categoryId: values.categoryId,
      description: values.description,
      instruction: createLearningItemInstruction(values.kind, values.label, values.description),
      tags: [values.kind],
      createdBy: user.id,
      updatedAt: new Date().toISOString()
    };
    const uploads: Array<{ key: keyof NewCardFiles } & UploadConfig> = [
      { key: "symbol", bucket: "symbol-images", type: "symbol-image" },
      { key: "gesture", bucket: "gesture-media", type: "gesture-media" },
      { key: "audio", bucket: "audio-files", type: "audio-file" }
    ];

    try {
      let saved = await insertLearningItem(draft);
      for (const upload of uploads) {
        const file = values.files[upload.key];
        if (!file) continue;
        const asset = await uploadToItem(saved, file, upload);
        if (asset.publicUrl) saved = applyMediaUrlToItem(saved, asset.type, asset.publicUrl, asset.uploadedAt);
      }
      setItems((current) => [saved, ...current]);
      log("create", "learning-item", saved.label, values.kind === "pecs" ? "Added a PECS card." : "Added a gesture.", saved.id);
      setKind(values.kind);
      setCategoryId("all");
      setSearch("");
      notify({ title: "Card added", description: `${saved.label} is in the library.`, tone: "success" });
      return true;
    } catch (error) {
      notify({ title: "Card not saved", description: errorText(error, "The card could not be saved."), tone: "error" });
      return false;
    }
  }

  async function saveCardText(item: LearningItem, values: CardTextValues) {
    const next: LearningItem = {
      ...item,
      ...values,
      tags: values.tags.length ? values.tags : item.tags,
      instruction: createLearningItemInstruction(item.contentType, values.label, values.description),
      updatedAt: new Date().toISOString()
    };
    try {
      const saved = await updateLearningItemDetails(next);
      setItems((current) => current.map((candidate) => (candidate.id === item.id ? saved : candidate)));
      log("edit", "learning-item", saved.label, "Updated card details.", saved.id);
      notify({ title: "Card updated", tone: "success" });
      return true;
    } catch (error) {
      notify({ title: "Card not saved", description: errorText(error, "The card could not be updated."), tone: "error" });
      return false;
    }
  }

  async function uploadCardMedia(item: LearningItem, file: File, config: UploadConfig) {
    try {
      const asset = await uploadToItem(item, file, config);
      if (asset.publicUrl) {
        setItems((current) =>
          current.map((candidate) => (candidate.id === item.id ? applyMediaUrlToItem(candidate, asset.type, asset.publicUrl!, asset.uploadedAt) : candidate))
        );
      }
      log("upload", "media", asset.title, `Uploaded ${mediaTypeText(asset.type)} for ${item.label}.`, asset.id);
      notify({ title: "Media uploaded", description: `${file.name} was added to ${item.label}.`, tone: "success" });
    } catch (error) {
      notify({ title: "Upload failed", description: "The file could not be added. Try again.", tone: "error" });
      throw error;
    }
  }

  async function confirmDeleteItem() {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await deleteLearningItem(itemToDelete.id, deleteMedia);
      setItems((current) => current.filter((candidate) => candidate.id !== itemToDelete.id));
      if (deleteMedia) setMedia((current) => current.filter((asset) => asset.relatedItemId !== itemToDelete.id));
      log("delete", "learning-item", itemToDelete.label, deleteMedia ? "Deleted a card and its media." : "Deleted a card and kept its media.", itemToDelete.id);
      notify({ title: "Card deleted", tone: "success" });
      setItemToDelete(null);
      setOpenItemId("");
    } catch (error) {
      notify({ title: "Delete failed", description: errorText(error, "The card could not be deleted."), tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  // Lessons

  function generateLesson(item: LearningItem) {
    setOpenItemId("");
    setTab("lessons");
    setLessonMode({ kind: "draft", draft: createLessonDraftFromItem(item) });
  }

  /** Creates or updates the PECS activity that belongs to a lesson. Gesture-only lessons have none. */
  async function syncLessonActivity(lesson: Lesson, previous: Lesson | null, pecsItems: LearningItem[], activityType: ActivityType) {
    if (!pecsItems.length) return;
    const existing = previous ? findLessonActivity(previous) : undefined;
    const pecsIds = pecsItems.map((item) => item.id);
    const title = `${lesson.title} activity`;
    const prompt = lesson.instructions || "Complete each activity step with teacher guidance.";

    if (!existing) {
      const created = await insertActivity({
        id: `activity-${lesson.id}`,
        title,
        type: activityType,
        prompt,
        learningItemIds: pecsIds,
        questions: createActivityQuestions(activityType, pecsItems, items),
        visibility: "shared",
        createdBy: user.id
      });
      setActivities((current) => [created, ...current]);
      return;
    }

    const cardsOrTypeChanged = existing.type !== activityType || !sameIds(existing.learningItemIds, pecsIds);
    if (!cardsOrTypeChanged && existing.title === title && existing.prompt === prompt) return;
    const updated = await updateActivity(
      {
        ...existing,
        title,
        prompt,
        type: activityType,
        learningItemIds: pecsIds,
        // Keep questions a teacher may have edited unless the cards or format changed.
        questions: cardsOrTypeChanged ? createActivityQuestions(activityType, pecsItems, items) : existing.questions
      },
      existing
    );
    setActivities((current) => current.map((activity) => (activity.id === updated.id ? updated : activity)));
  }

  async function saveLesson(mode: LessonFormMode, values: LessonFormValues) {
    const selected = values.itemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
    const pecsItems = selected.filter((item) => item.contentType === "pecs");
    const activityType: ActivityType = pecsItems.length ? values.activityType : "gesture-practice";
    const previous = mode.kind === "edit" ? mode.lesson : null;
    const base =
      mode.kind === "edit"
        ? mode.lesson
        : mode.kind === "draft"
          ? { ...mode.draft, id: `lesson-${Date.now()}`, createdBy: user.id }
          : {
              id: `lesson-${Date.now()}`,
              createdBy: user.id,
              estimatedDuration: 10,
              notes: "",
              source: "manual" as const,
              visibility: "shared" as const
            };
    const next: Lesson = {
      ...base,
      title: values.title,
      objective: values.objective,
      instructions: values.steps.join("\n"),
      learningItemIds: selected.map((item) => item.id),
      activityType
    };

    let saved: Lesson;
    try {
      saved = previous ? await updateLesson(next, previous) : await insertLesson(next);
    } catch (error) {
      notify({ title: "Lesson not saved", description: errorText(error, "The lesson could not be saved."), tone: "error" });
      return false;
    }

    setLessons((current) => (previous ? current.map((lesson) => (lesson.id === saved.id ? saved : lesson)) : [saved, ...current]));
    log(
      previous ? "edit" : "create",
      "lesson",
      saved.title,
      previous ? "Updated a lesson." : mode.kind === "draft" ? "Saved a generated lesson." : "Created a manual lesson.",
      saved.id
    );

    try {
      await syncLessonActivity(saved, previous, pecsItems, activityType);
      notify({ title: previous ? "Lesson updated" : "Lesson saved", tone: "success" });
    } catch (error) {
      notify({ title: "Lesson saved, activity not updated", description: errorText(error, "The activity could not be saved."), tone: "error" });
    }
    return true;
  }

  async function confirmDeleteLesson() {
    if (!lessonToDelete) return;
    setDeleting(true);
    try {
      await deleteLesson(lessonToDelete.id);
      setLessons((current) => current.filter((lesson) => lesson.id !== lessonToDelete.id));
      log("delete", "lesson", lessonToDelete.title, "Deleted a lesson.", lessonToDelete.id);
      notify({ title: "Lesson deleted", tone: "success" });
      setLessonToDelete(null);
      setOpenLessonId("");
    } catch (error) {
      notify({ title: "Delete failed", description: errorText(error, "The lesson could not be deleted."), tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  // Categories

  async function saveCategory(values: CategoryFormValues) {
    const editing = categoryForm?.category ?? null;
    try {
      if (editing) {
        const saved = await updateCategoryDetails({ ...editing, ...values, description: values.description || "Shared category" });
        setCategories((current) => current.map((category) => (category.id === saved.id ? saved : category)));
        log("edit", "category", saved.name, "Updated a category.", saved.id);
        notify({ title: "Category updated", tone: "success" });
      } else {
        const saved = await insertCategory({
          id: `cat-${Date.now()}`,
          ...values,
          description: values.description || "Shared category",
          createdBy: user.id
        });
        setCategories((current) => [...current, saved]);
        log("create", "category", saved.name, "Created a category.", saved.id);
        notify({ title: "Category created", tone: "success" });
      }
      return true;
    } catch (error) {
      notify({ title: "Category not saved", description: errorText(error, "The category could not be saved."), tone: "error" });
      return false;
    }
  }

  async function confirmDeleteCategory() {
    if (!categoryToDelete) return;
    if (items.some((item) => item.categoryId === categoryToDelete.id)) {
      notify({ title: "Category in use", description: "Move its cards to another category first." });
      setCategoryToDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategories((current) => current.filter((category) => category.id !== categoryToDelete.id));
      if (categoryId === categoryToDelete.id) setCategoryId("all");
      log("delete", "category", categoryToDelete.name, "Deleted a category.", categoryToDelete.id);
      notify({ title: "Category deleted", tone: "success" });
      setCategoryToDelete(null);
    } catch (error) {
      notify({ title: "Category not deleted", description: errorText(error, "The category could not be deleted."), tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  const tabs = [
    { value: "cards" as const, label: "Cards", count: items.length },
    { value: "lessons" as const, label: "Lessons", count: lessons.length },
    { value: "categories" as const, label: "Categories", count: categories.length },
    { value: "media" as const, label: "Media", count: libraryMedia.length }
  ];

  return (
    <div>
      <PageHeader title="Content" icon={Layers} />
      <UnderlineTabs id="content-tabs" label="Content sections" options={tabs} value={tab} onChange={setTab} />

      <div className="mt-5">
        {!ready ? (
          <LoadingState label="Loading content" />
        ) : tab === "cards" ? (
          <CardsTab
            items={items}
            categories={categories}
            kind={kind}
            onKindChange={(next) => {
              setKind(next);
              setCategoryId("all");
            }}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            search={search}
            onSearchChange={setSearch}
            onOpenItem={(item) => setOpenItemId(item.id)}
            onAddCard={() => setCardFormOpen(true)}
          />
        ) : tab === "lessons" ? (
          <LessonsTab
            lessons={lessons}
            itemById={itemById}
            onOpenLesson={(lesson) => setOpenLessonId(lesson.id)}
            onNewLesson={() => setLessonMode({ kind: "new" })}
          />
        ) : tab === "categories" ? (
          <CategoriesTab
            categories={categories}
            items={items}
            onOpenCategory={(category, categoryKind) => {
              setKind(categoryKind);
              setCategoryId(category.id);
              setSearch("");
              setTab("cards");
            }}
            onNewCategory={() => setCategoryForm({ category: null })}
            onEditCategory={(category) => setCategoryForm({ category })}
            onDeleteCategory={setCategoryToDelete}
          />
        ) : (
          <MediaTab media={libraryMedia} itemById={itemById} onOpenAsset={(asset) => setOpenAssetId(asset.id)} />
        )}
      </div>

      <CardFormDialog open={cardFormOpen} initialKind={kind} categories={categories} onClose={() => setCardFormOpen(false)} onSubmit={addCard} />

      <CardDetailDialog
        item={openItem}
        categories={categories}
        creator={openItem ? nameFor(userNames, openItem.createdBy) : ""}
        onClose={() => setOpenItemId("")}
        onSaveText={saveCardText}
        onUpload={uploadCardMedia}
        onGenerateLesson={generateLesson}
        onDelete={(item) => {
          setDeleteMedia(true);
          setItemToDelete(item);
        }}
      />

      <Dialog
        open={Boolean(itemToDelete)}
        onClose={deleting ? () => undefined : () => setItemToDelete(null)}
        title={`Delete ${itemToDelete?.label ?? "card"}?`}
        description="This removes the card from the library. It cannot be undone."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setItemToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={confirmDeleteItem} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete card"}
            </Button>
          </>
        }
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-100 bg-[#fff] p-3">
          <input
            type="checkbox"
            checked={deleteMedia}
            onChange={(event) => setDeleteMedia(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-blue-200 text-blue-600"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Also delete its media</span>
            <span className="block text-xs text-slate-500">Turn off to keep the files in Media.</span>
          </span>
        </label>
      </Dialog>

      <LessonFormDialog mode={lessonMode} items={items} categories={categories} onClose={() => setLessonMode(null)} onSave={saveLesson} />

      <LessonPreviewDialog
        lesson={openLesson}
        items={openLesson ? itemsOf(openLesson) : []}
        activityHref={openLesson ? lessonActivityHref(openLesson) : "/activities"}
        onClose={() => setOpenLessonId("")}
        onEdit={(lesson) => {
          setOpenLessonId("");
          setLessonMode({ kind: "edit", lesson });
        }}
        onDelete={setLessonToDelete}
      />

      <ConfirmDialog
        open={Boolean(lessonToDelete)}
        title={`Delete ${lessonToDelete?.title ?? "lesson"}?`}
        description="The lesson is removed. Its cards and activity stay."
        confirmLabel="Delete lesson"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDeleteLesson}
        onClose={() => setLessonToDelete(null)}
      />

      <CategoryFormDialog open={Boolean(categoryForm)} category={categoryForm?.category ?? null} onClose={() => setCategoryForm(null)} onSave={saveCategory} />

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title={`Delete ${categoryToDelete?.name ?? "category"}?`}
        description="This category will be removed."
        confirmLabel="Delete category"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDeleteCategory}
        onClose={() => setCategoryToDelete(null)}
      />

      <MediaPreviewDialog
        asset={openAsset}
        item={openAsset?.relatedItemId ? itemById.get(openAsset.relatedItemId) : undefined}
        uploaderName={openAsset ? nameFor(userNames, openAsset.uploadedBy) : ""}
        onClose={() => setOpenAssetId("")}
        onOpenCard={(item) => {
          setOpenAssetId("");
          setOpenItemId(item.id);
        }}
      />
    </div>
  );
}
