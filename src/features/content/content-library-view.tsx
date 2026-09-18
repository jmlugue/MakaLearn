"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FolderOpen, Image as ImageIcon, Layers, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { LoadingState } from "@/components/common/loading-state";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { insertAuditLog } from "@/lib/audit-logs";
import {
  createActivityQuestions,
  deleteCategory,
  deleteLearningItem,
  deleteLesson,
  detachLearningItemMedia,
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
import { deleteMediaAssetFromSupabase, uploadMediaAssetToSupabase } from "@/lib/supabase/media";
import { createLessonDraftFromItem } from "@/utils/lesson-template";
import { findLessonActivity as findActivityForLesson, lessonActivityId } from "@/utils/lesson-activity";
import { ensurePecsManifestCategories, ensurePecsManifestItems } from "@/utils/pecs-content-library";
import { upgradeStarterLearningItemPrompts } from "@/utils/starter-learning-item-prompts";
import { CardDetailDialog, type CardTextValues } from "@/features/content/card-detail-dialog";
import { CardFormDialog, type NewCardFiles, type NewCardValues } from "@/features/content/card-form-dialog";
import { CategoriesTab } from "@/features/content/categories-tab";
import { CategoryDialog, type CategoryFormValues } from "@/features/content/category-dialog";
import { createLearningItemInstruction, nameFor, type ContentKind } from "@/features/content/content-shared";
import { GuideBanner } from "@/features/guide/guide-banner";
import { GuideTip } from "@/features/guide/guide-tip";
import { MaterialsTab } from "@/features/content/materials-tab";
import { cn } from "@/lib/utils";
import { LessonFormDialog, type LessonFormMode, type LessonFormValues } from "@/features/content/lesson-form-dialog";
import { LessonPreviewDialog } from "@/features/content/lesson-preview-dialog";
import { LessonsTab } from "@/features/content/lessons-tab";
import { MediaPreviewDialog } from "@/features/content/media-preview-dialog";
import { MediaTab } from "@/features/content/media-tab";
import type { Activity, ActivityType, AppUser, Category, LearningItem, Lesson, MediaAsset } from "@/types";

type Tab = "materials" | "lessons" | "categories" | "media";
type UploadConfig = Pick<MediaAsset, "bucket" | "type">;

function applyMediaUrlToItem(item: LearningItem, type: MediaAsset["type"], publicUrl: string, updatedAt: string): LearningItem {
  if (type === "symbol-image") return { ...item, symbolImageUrl: publicUrl, updatedAt };
  if (type === "gesture-media") return { ...item, gestureMediaUrl: publicUrl, updatedAt };
  return { ...item, audioUrl: publicUrl, updatedAt };
}

function urlOnItem(item: LearningItem, type: MediaAsset["type"]) {
  if (type === "symbol-image") return item.symbolImageUrl;
  if (type === "gesture-media") return item.gestureMediaUrl;
  return item.audioUrl;
}

/** Plain name for a media type, used in titles, toasts, and the audit log. */
function mediaTypeText(type: MediaAsset["type"]) {
  if (type === "symbol-image") return "image";
  if (type === "gesture-media") return "video";
  return "audio";
}

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export function ContentLibraryView({ initialItemId }: { initialItemId?: string } = {}) {
  const { notify } = useToast();
  const { user } = useAuthUser();
  const [tab, setTab] = useState<Tab>("materials");
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);

  // Materials filters live here so a deep link can open the right type.
  const [kind, setKind] = useState<ContentKind>("pecs");
  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");

  const [cardFormOpen, setCardFormOpen] = useState(false);
  const [openItemId, setOpenItemId] = useState("");
  const [itemToDelete, setItemToDelete] = useState<LearningItem | null>(null);
  const [deleteMedia, setDeleteMedia] = useState(true);
  const [mediaToRemove, setMediaToRemove] = useState<{ item: LearningItem; type: MediaAsset["type"] } | null>(null);
  const [removeFile, setRemoveFile] = useState(true);
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lessonMode, setLessonMode] = useState<LessonFormMode | null>(null);
  const [openLessonId, setOpenLessonId] = useState("");
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<{ categoryId: string | null; mode: "view" | "edit" } | null>(null);
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

  // Deep link from the Admin page (/content?item=<id>): open that material once content has loaded.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (!ready || !initialItemId || deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const target = items.find((item) => item.id === initialItemId);
    if (!target) {
      notify({ title: "Material not found", description: "It may have been deleted." });
      return;
    }
    setTab("materials");
    setKind(target.contentType);
    setOpenItemId(target.id);
  }, [initialItemId, items, notify, ready]);

  const userNames = useMemo(() => new Map(users.map((candidate) => [candidate.id, candidate.name])), [users]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const libraryMedia = useMemo(() => media.filter((asset) => asset.type !== "learner-photo"), [media]);
  const openItem = itemById.get(openItemId) ?? null;
  const openLesson = lessons.find((lesson) => lesson.id === openLessonId) ?? null;
  const dialogCategory = categoryDialog?.categoryId ? categories.find((category) => category.id === categoryDialog.categoryId) ?? null : null;
  const openAsset = libraryMedia.find((asset) => asset.id === openAssetId) ?? null;

  function itemsOf(lesson: Lesson) {
    return lesson.learningItemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
  }

  function findLessonActivity(lesson: Lesson) {
    return findActivityForLesson(lesson, activities);
  }

  function log(action: "upload" | "create" | "edit" | "delete", targetType: string, targetTitle: string, detail: string, targetId?: string) {
    insertAuditLog({ category: "content", action, actor: user, targetType, targetId, targetTitle, detail }).catch(() => undefined);
  }

  function errorText(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
  }

  // Materials

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
      notify({ title: `${kindLabel(values.kind)} added`, description: `${saved.label} is in the library.`, tone: "success" });
      return true;
    } catch (error) {
      notify({ title: "Not saved", description: errorText(error, "The material could not be saved."), tone: "error" });
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
      log("edit", "learning-item", saved.label, "Updated material details.", saved.id);
      notify({ title: "Material updated", tone: "success" });
      return true;
    } catch (error) {
      notify({ title: "Not saved", description: errorText(error, "The material could not be updated."), tone: "error" });
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

  /** The Media library row behind a material's image, video, or audio, when one exists. */
  function assetFor(item: LearningItem, type: MediaAsset["type"]) {
    const url = urlOnItem(item, type);
    if (!url) return undefined;
    return media.find((asset) => asset.relatedItemId === item.id && asset.type === type && asset.publicUrl === url);
  }

  function clearMediaUrlInState(itemId: string, type: MediaAsset["type"]) {
    const updatedAt = new Date().toISOString();
    setItems((current) =>
      current.map((candidate) => {
        if (candidate.id !== itemId) return candidate;
        if (type === "symbol-image") return { ...candidate, symbolImageUrl: undefined, updatedAt };
        if (type === "gesture-media") return { ...candidate, gestureMediaUrl: undefined, updatedAt };
        return { ...candidate, audioUrl: undefined, updatedAt };
      })
    );
  }

  async function confirmRemoveMedia() {
    if (!mediaToRemove) return;
    const { item, type } = mediaToRemove;
    const asset = assetFor(item, type);
    // Seeded materials point at a URL with no Media row behind it, so there is no file to delete even
    // when the box is ticked. The message has to reflect what actually happened, not what was asked.
    const fileDeleted = removeFile && Boolean(asset);
    setDeleting(true);
    try {
      // Deleting the file already nulls the column, so only a detach needs the separate call.
      if (fileDeleted && asset) {
        await deleteMediaAssetFromSupabase(asset);
        setMedia((current) => current.filter((candidate) => candidate.id !== asset.id));
      } else {
        await detachLearningItemMedia(item.id, type);
      }
      clearMediaUrlInState(item.id, type);
      log(
        "delete",
        "media",
        `${item.label} ${mediaTypeText(type)}`,
        fileDeleted ? `Removed the ${mediaTypeText(type)} from ${item.label} and deleted the file.` : `Removed the ${mediaTypeText(type)} from ${item.label}.`,
        asset?.id
      );
      notify({
        title: fileDeleted ? "Media removed and deleted" : "Media removed",
        description: removeFile && !asset ? "There was no stored file to delete." : undefined,
        tone: "success"
      });
      setMediaToRemove(null);
    } catch (error) {
      notify({ title: "Not removed", description: errorText(error, "The file could not be removed."), tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteAsset() {
    if (!assetToDelete) return;
    setDeleting(true);
    try {
      await deleteMediaAssetFromSupabase(assetToDelete);
      setMedia((current) => current.filter((candidate) => candidate.id !== assetToDelete.id));
      if (assetToDelete.relatedItemId && assetToDelete.type !== "learner-photo") {
        clearMediaUrlInState(assetToDelete.relatedItemId, assetToDelete.type);
      }
      log("delete", "media", assetToDelete.title, `Deleted ${assetToDelete.fileName} from the media library.`, assetToDelete.id);
      notify({ title: "File deleted", tone: "success" });
      setAssetToDelete(null);
      setOpenAssetId("");
    } catch (error) {
      notify({ title: "Delete failed", description: errorText(error, "The file could not be deleted."), tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  async function confirmDeleteItem() {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      await deleteLearningItem(itemToDelete.id, deleteMedia);
      setItems((current) => current.filter((candidate) => candidate.id !== itemToDelete.id));
      if (deleteMedia) setMedia((current) => current.filter((asset) => asset.relatedItemId !== itemToDelete.id));
      log("delete", "learning-item", itemToDelete.label, deleteMedia ? "Deleted a material and its media." : "Deleted a material and kept its media.", itemToDelete.id);
      notify({ title: "Material deleted", tone: "success" });
      setItemToDelete(null);
      setOpenItemId("");
    } catch (error) {
      notify({ title: "Delete failed", description: errorText(error, "The material could not be deleted."), tone: "error" });
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

  /**
   * Keeps a lesson's practice step in step with the lesson. An existing activity is always updated; a new
   * one is only made when the teacher ticked "Create activity". Gesture-only lessons have no activity.
   */
  async function syncLessonActivity(
    lesson: Lesson,
    previous: Lesson | null,
    pecsItems: LearningItem[],
    activityType: ActivityType,
    createActivity: boolean
  ) {
    if (!pecsItems.length) return;
    const existing = findLessonActivity(previous ?? lesson);
    if (!existing && !createActivity) return;
    const pecsIds = pecsItems.map((item) => item.id);
    const title = `${lesson.title} activity`;
    const prompt = lesson.instructions || "Complete each activity step with teacher guidance.";

    if (!existing) {
      const created = await insertActivity({
        id: lessonActivityId(lesson),
        title,
        type: activityType,
        prompt,
        learningItemIds: pecsIds,
        questions: createActivityQuestions(activityType, pecsItems, items),
        visibility: "shared",
        createdBy: user.id
      });
      setActivities((current) => [created, ...current]);
      await rememberLessonActivity(lesson, created.id);
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
    await rememberLessonActivity(lesson, updated.id);
  }

  /** Saves the activity id onto the lesson row, so the link survives a reload and an activity rename. */
  async function rememberLessonActivity(lesson: Lesson, activityId: string) {
    if (lesson.relatedActivityId === activityId) return;
    const next = { ...lesson, relatedActivityId: activityId };
    const saved = await updateLesson(next, lesson);
    setLessons((current) => current.map((candidate) => (candidate.id === saved.id ? saved : candidate)));
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
      instructions: values.instructions,
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
      await syncLessonActivity(saved, previous, pecsItems, activityType, values.createActivity);
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
    const editing = dialogCategory;
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
        setCategoryDialog({ categoryId: saved.id, mode: "view" });
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
      notify({ title: "Category in use", description: "Move its materials to another category first." });
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
      setCategoryDialog(null);
    } catch (error) {
      notify({ title: "Category not deleted", description: errorText(error, "The category could not be deleted."), tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  const sections: Array<{ value: Tab; label: string; count: number; icon: LucideIcon }> = [
    { value: "materials", label: "Materials", count: items.length, icon: Layers },
    { value: "lessons", label: "Lessons", count: lessons.length, icon: BookOpen },
    { value: "categories", label: "Categories", count: categories.length, icon: FolderOpen },
    { value: "media", label: "Media", count: libraryMedia.length, icon: ImageIcon }
  ];

  return (
    <div>
      <PageHeader title="Content" icon={Layers} />
      <GuideBanner pageKey="content" />
      <GuideTip id="content.sections">
        <SectionTiles sections={sections} value={tab} onChange={setTab} />
      </GuideTip>

      <div className="mt-5">
        {!ready ? (
          <LoadingState label="Loading content" />
        ) : tab === "materials" ? (
          <MaterialsTab
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
            onAdd={() => setCardFormOpen(true)}
          />
        ) : tab === "lessons" ? (
          <LessonsTab
            lessons={lessons}
            itemById={itemById}
            activityFor={findLessonActivity}
            onOpenLesson={(lesson) => setOpenLessonId(lesson.id)}
            onNewLesson={() => setLessonMode({ kind: "new" })}
          />
        ) : tab === "categories" ? (
          <CategoriesTab
            categories={categories}
            items={items}
            onOpenCategory={(category) => setCategoryDialog({ categoryId: category.id, mode: "view" })}
            onNewCategory={() => setCategoryDialog({ categoryId: null, mode: "edit" })}
          />
        ) : (
          <MediaTab media={libraryMedia} itemById={itemById} userNames={userNames} onOpenAsset={(asset) => setOpenAssetId(asset.id)} />
        )}
      </div>

      <CardFormDialog open={cardFormOpen} initialKind={kind} categories={categories} onClose={() => setCardFormOpen(false)} onSubmit={addCard} />

      <CardDetailDialog
        item={openItem}
        categories={categories}
        creator={openItem ? nameFor(userNames, openItem.createdBy) : ""}
        canManage={Boolean(openItem && (user.role === "admin" || openItem.createdBy === user.id))}
        onClose={() => setOpenItemId("")}
        onSaveText={saveCardText}
        onUpload={uploadCardMedia}
        onRemoveMedia={(item, type) => {
          setRemoveFile(true);
          setMediaToRemove({ item, type });
        }}
        onGenerateLesson={generateLesson}
        onDelete={(item) => {
          setDeleteMedia(true);
          setItemToDelete(item);
        }}
      />

      <Dialog
        open={Boolean(itemToDelete)}
        onClose={deleting ? () => undefined : () => setItemToDelete(null)}
        title={`Delete ${itemToDelete?.label ?? "material"}?`}
        description="This removes it from the library. It cannot be undone."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setItemToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={confirmDeleteItem} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
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

      <LessonFormDialog
        mode={lessonMode}
        items={items}
        categories={categories}
        linkedActivity={lessonMode?.kind === "edit" ? findLessonActivity(lessonMode.lesson) : undefined}
        onClose={() => setLessonMode(null)}
        onSave={saveLesson}
      />

      <LessonPreviewDialog
        lesson={openLesson}
        items={openLesson ? itemsOf(openLesson) : []}
        pool={items}
        creator={openLesson ? nameFor(userNames, openLesson.createdBy) : ""}
        activity={openLesson ? findLessonActivity(openLesson) : undefined}
        onClose={() => setOpenLessonId("")}
        onCreateActivity={(lesson) => {
          setOpenLessonId("");
          setLessonMode({ kind: "edit", lesson, step: 2, createActivity: true });
        }}
        onEdit={(lesson) => {
          setOpenLessonId("");
          setLessonMode({ kind: "edit", lesson });
        }}
        onDelete={setLessonToDelete}
      />

      <ConfirmDialog
        open={Boolean(lessonToDelete)}
        title={`Delete ${lessonToDelete?.title ?? "lesson"}?`}
        description="The lesson is removed. Its materials and activity stay."
        confirmLabel="Delete lesson"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDeleteLesson}
        onClose={() => setLessonToDelete(null)}
      />

      <CategoryDialog
        state={categoryDialog ? { category: dialogCategory, mode: categoryDialog.mode } : null}
        items={items}
        onClose={() => setCategoryDialog(null)}
        onModeChange={(mode) => setCategoryDialog((current) => (current ? { ...current, mode } : current))}
        onSave={saveCategory}
        onDelete={setCategoryToDelete}
        onOpenItem={(item) => setOpenItemId(item.id)}
      />

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
        canDelete={Boolean(openAsset && (user.role === "admin" || openAsset.uploadedBy === user.id))}
        onClose={() => setOpenAssetId("")}
        onOpenCard={(item) => {
          setOpenAssetId("");
          setOpenItemId(item.id);
        }}
        onDelete={setAssetToDelete}
      />

      <Dialog
        open={Boolean(mediaToRemove)}
        onClose={deleting ? () => undefined : () => setMediaToRemove(null)}
        title={mediaToRemove ? `Remove the ${mediaTypeText(mediaToRemove.type)} from ${mediaToRemove.item.label}?` : "Remove media?"}
        description="The material keeps everything else."
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setMediaToRemove(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={confirmRemoveMedia} disabled={deleting}>
              {deleting ? "Removing..." : "Remove"}
            </Button>
          </>
        }
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-100 bg-[#fff] p-3">
          <input
            type="checkbox"
            checked={removeFile}
            onChange={(event) => setRemoveFile(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-blue-200 text-blue-600"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Also delete the file from Media</span>
            <span className="block text-xs text-slate-500">Turn off to keep the file in the Media library.</span>
          </span>
        </label>
      </Dialog>

      <ConfirmDialog
        open={Boolean(assetToDelete)}
        title={`Delete ${assetToDelete?.fileName ?? "this file"}?`}
        description={
          assetToDelete?.relatedItemId && itemById.get(assetToDelete.relatedItemId)
            ? `This is the ${mediaTypeText(assetToDelete.type)} for ${itemById.get(assetToDelete.relatedItemId)!.label}. Deleting it leaves that material without one.`
            : "This file is not linked to a material. It cannot be undone."
        }
        confirmLabel="Delete file"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDeleteAsset}
        onClose={() => setAssetToDelete(null)}
      />
    </div>
  );
}

function kindLabel(kind: ContentKind) {
  return kind === "pecs" ? "PECS card" : "Gesture";
}

/** Page sections as large glassy tiles. The selected one fills blue. */
function SectionTiles({
  sections,
  value,
  onChange
}: {
  sections: Array<{ value: Tab; label: string; count: number; icon: LucideIcon }>;
  value: Tab;
  onChange: (value: Tab) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="tablist" aria-label="Content sections">
      {sections.map((section) => {
        const selected = section.value === value;
        const Icon = section.icon;
        return (
          <button
            key={section.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(section.value)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
              selected
                ? "border-blue-500 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)]"
                : "border-white/80 bg-[#fff]/70 text-ink shadow-sm backdrop-blur-xl hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            )}
          >
            <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", selected ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600")}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-sm font-semibold", selected ? "text-blue-50" : "text-slate-500")}>{section.label}</span>
              <span className="block text-2xl font-black leading-tight">{section.count}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
