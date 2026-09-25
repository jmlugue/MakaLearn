"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, FolderOpen, Image as ImageIcon, Layers, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PillTabs } from "@/components/ui/pill-tabs";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { LoadingState } from "@/components/common/loading-state";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { insertAuditLog } from "@/lib/audit-logs";
import {
  deleteCategory,
  deleteLearningItem,
  deleteLesson,
  detachLearningItemMedia,
  fetchMakaLearnData,
  insertCategory,
  insertLearningItem,
  insertLesson,
  updateCategoryDetails,
  updateLearningItemDetails,
  updateLearningItemMedia,
  updateLesson
} from "@/lib/supabase/app-data";
import { deleteMediaAssetFromSupabase, uploadMediaAssetToSupabase } from "@/lib/supabase/media";
import { canSee, uniqueCopyTitle } from "@/utils/lesson-activity";
import { ensurePecsManifestCategories, ensurePecsManifestItems } from "@/utils/pecs-content-library";
import { upgradeStarterLearningItemPrompts } from "@/utils/starter-learning-item-prompts";
import { CardDetailDialog, type CardTextValues } from "@/features/content/card-detail-dialog";
import { CardFormDialog, type NewCardFiles, type NewCardValues } from "@/features/content/card-form-dialog";
import { CategoriesTab } from "@/features/content/categories-tab";
import { CategoryDialog, type CategoryFormValues } from "@/features/content/category-dialog";
import { createLearningItemInstruction, fileCategoryName, nameFor, visibleCategories, type ContentKind } from "@/features/content/content-shared";
import { GuideBanner } from "@/features/guide/guide-banner";
import { GuideTip } from "@/features/guide/guide-tip";
import { MaterialsTab } from "@/features/content/materials-tab";
import { LessonFormDialog, type LessonFormMode, type LessonFormValues } from "@/features/content/lesson-form-dialog";
import { LessonPreviewDialog } from "@/features/content/lesson-preview-dialog";
import { LessonsTab } from "@/features/content/lessons-tab";
import { MediaPreviewDialog } from "@/features/content/media-preview-dialog";
import { MediaTab } from "@/features/content/media-tab";
import type { ActivityType, AppUser, Category, LearningItem, Lesson, MediaAsset } from "@/types";

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

export function ContentLibraryView({ initialItemId }: { initialItemId?: string } = {}) {
  const { notify } = useToast();
  const { user } = useAuthUser();
  const [tab, setTab] = useState<Tab>("materials");
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
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

  // "Fixed gestures" stays in the data for Guided 7 but is not shown as a category.
  const shownCategories = useMemo(() => visibleCategories(categories), [categories]);
  const userNames = useMemo(() => new Map(users.map((candidate) => [candidate.id, candidate.name])), [users]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const openItem = itemById.get(openItemId) ?? null;
  const openLesson = lessons.find((lesson) => lesson.id === openLessonId) ?? null;
  const dialogCategory = categoryDialog?.categoryId ? categories.find((category) => category.id === categoryDialog.categoryId) ?? null : null;
  const openAsset = media.find((asset) => asset.id === openAssetId) ?? null;

  function itemsOf(lesson: Lesson) {
    return lesson.learningItemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
  }

  // Others' private lessons stay hidden. The read rules allow them, so this is the only filter.
  const visibleLessons = useMemo(() => lessons.filter((lesson) => canSee(lesson, user)), [lessons, user]);

  /** Teachers collaborate on shared lessons; private lessons stay with their creator. */
  function canEditLesson(lesson: Lesson) {
    return user.role === "teacher" && (lesson.visibility === "shared" || lesson.createdBy === user.id);
  }

  /** Owner name, shown on shared lessons made by someone else. */
  function sharedCreator(lesson: Lesson) {
    return lesson.createdBy !== user.id && lesson.visibility === "shared" ? nameFor(userNames, lesson.createdBy) : undefined;
  }

  /** Other lesson names the teacher can see, so a new or renamed lesson does not repeat one. */
  const takenLessonTitles = useMemo(() => {
    const editingId = lessonMode?.kind === "edit" ? lessonMode.lesson.id : "";
    return visibleLessons.filter((lesson) => lesson.id !== editingId).map((lesson) => lesson.title);
  }, [lessonMode, visibleLessons]);

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
      relatedItemId: item.id,
      expectedName: { label: item.label, category: fileCategoryName(categories.find((category) => category.id === item.categoryId)) }
    });
    if (uploaded.publicUrl) {
      try {
        await updateLearningItemMedia(item.id, uploaded);
      } catch (error) {
        // The file and media row are optional until the material points at them.
        await deleteMediaAssetFromSupabase(uploaded).catch(() => undefined);
        throw error;
      }
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
      { key: "audio", bucket: "audio-files", type: "audio-file" }
    ];

    let saved: LearningItem | undefined;
    try {
      saved = await insertLearningItem(draft);
      for (const upload of uploads) {
        const file = values.files[upload.key];
        if (!file) continue;
        const asset = await uploadToItem(saved, file, upload);
        if (asset.publicUrl) saved = applyMediaUrlToItem(saved, asset.type, asset.publicUrl, asset.uploadedAt);
      }
      const completedItem = saved;
      setItems((current) => [completedItem, ...current]);
      log("create", "learning-item", completedItem.label, values.kind === "pecs" ? "Added a PECS card." : "Added a gesture.", completedItem.id);
      setKind(values.kind);
      setCategoryId("all");
      setSearch("");
      notify({ title: `${kindLabel(values.kind)} added`, description: `${completedItem.label} is in the library.`, tone: "success" });
      return true;
    } catch (error) {
      if (saved) {
        const partiallySavedItem = saved;
        setItems((current) => [partiallySavedItem, ...current.filter((item) => item.id !== partiallySavedItem.id)]);
        log("create", "learning-item", partiallySavedItem.label, "Added a material, but one or more media files did not finish uploading.", partiallySavedItem.id);
        notify({
          title: `${kindLabel(values.kind)} added`,
          description: "The material was saved. Add the missing media from its details.",
          tone: "info"
        });
        return true;
      }
      notify({ title: "Not saved", description: errorText(error, "The material could not be saved."), tone: "error" });
      return false;
    }
  }

  async function saveCardText(item: LearningItem, values: CardTextValues) {
    const next: LearningItem = {
      ...item,
      ...values,
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
      notify({ title: "Upload failed", description: errorText(error, "The file could not be added. Try again."), tone: "error" });
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
      if (assetToDelete.relatedItemId) {
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

  async function saveLesson(mode: LessonFormMode, values: LessonFormValues) {
    const selected = values.itemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item));
    const hasPecs = selected.some((item) => item.contentType === "pecs");
    const previous = mode.kind === "edit" ? mode.lesson : null;
    // Lessons no longer pick a format (activities do), but the column is kept filled for older code.
    const activityType: ActivityType = previous?.activityType ?? (hasPecs ? "choose-correct-symbol" : "gesture-practice");
    const newRecord = {
      id: `lesson-${Date.now()}`,
      createdBy: user.id,
      relatedActivityId: undefined,
      visibility: values.isPrivate ? ("private" as const) : ("shared" as const)
    };
    const base: Omit<Lesson, "title" | "objective" | "instructions" | "learningItemIds" | "activityType"> =
      mode.kind === "edit"
        ? mode.lesson
        : mode.kind === "copy"
          ? { ...mode.source, ...newRecord, source: "manual" as const }
          : { ...newRecord, estimatedDuration: 10, notes: "", source: "manual" as const };
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
      previous
        ? "Updated a lesson."
        : mode.kind === "copy"
          ? `Copied the lesson "${mode.source.title}".`
          : "Created a lesson.",
      saved.id
    );
    notify({ title: previous ? "Lesson updated" : mode.kind === "copy" ? "Copy saved" : "Lesson saved", tone: "success" });
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
    { value: "categories", label: "Categories", count: shownCategories.length, icon: FolderOpen },
    { value: "media", label: "Media", count: media.length, icon: ImageIcon }
  ];

  return (
    <div>
      <PageHeader title="Content" icon={Layers} />
      <GuideBanner pageKey="content" />
      <GuideTip id="content.sections">
        <PillTabs id="content-sections" label="Content sections" value={tab} onChange={setTab} options={sections} />
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
            canAdd={user.role === "teacher"}
          />
        ) : tab === "lessons" ? (
          <LessonsTab
            lessons={visibleLessons}
            itemById={itemById}
            creatorFor={sharedCreator}
            canCreate={user.role === "teacher"}
            onOpenLesson={(lesson) => setOpenLessonId(lesson.id)}
            onNewLesson={() => setLessonMode({ kind: "new" })}
          />
        ) : tab === "categories" ? (
          <CategoriesTab
            categories={shownCategories}
            items={items}
            canCreate={user.role === "teacher"}
            onOpenCategory={(category) => setCategoryDialog({ categoryId: category.id, mode: "view" })}
            onNewCategory={() => setCategoryDialog({ categoryId: null, mode: "edit" })}
          />
        ) : (
          <MediaTab media={media} itemById={itemById} userNames={userNames} onOpenAsset={(asset) => setOpenAssetId(asset.id)} />
        )}
      </div>

      <CardFormDialog open={cardFormOpen} initialKind={kind} categories={categories} onClose={() => setCardFormOpen(false)} onSubmit={addCard} />

      <CardDetailDialog
        item={openItem}
        categories={categories}
        creator={openItem ? nameFor(userNames, openItem.createdBy) : ""}
        canManage={Boolean(openItem && user.role === "teacher")}
        onClose={() => setOpenItemId("")}
        onSaveText={saveCardText}
        onUpload={uploadCardMedia}
        onRemoveMedia={(item, type) => {
          setRemoveFile(true);
          setMediaToRemove({ item, type });
        }}
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
        takenTitles={takenLessonTitles}
        onClose={() => setLessonMode(null)}
        onSave={saveLesson}
      />

      <LessonPreviewDialog
        lesson={openLesson}
        items={openLesson ? itemsOf(openLesson) : []}
        creator={openLesson ? nameFor(userNames, openLesson.createdBy) : ""}
        canEdit={Boolean(openLesson && canEditLesson(openLesson))}
        onClose={() => setOpenLessonId("")}
        onCopy={(lesson) => {
          setOpenLessonId("");
          setLessonMode({ kind: "copy", source: lesson, title: uniqueCopyTitle(lesson.title, visibleLessons.map((candidate) => candidate.title)) });
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
        description="The lesson is removed. Its materials and activities stay."
        confirmLabel="Delete lesson"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDeleteLesson}
        onClose={() => setLessonToDelete(null)}
      />

      <CategoryDialog
        state={categoryDialog ? { category: dialogCategory, mode: categoryDialog.mode } : null}
        items={items}
        canManage={user.role === "teacher"}
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
        canDelete={Boolean(openAsset && user.role === "teacher")}
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
