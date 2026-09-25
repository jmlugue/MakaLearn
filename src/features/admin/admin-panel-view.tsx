"use client";

import { withBuiltInCategoryColors } from "@/lib/category-colors";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, LayoutDashboard, Layers, Users } from "lucide-react";
import { ShieldUser } from "@/components/icons/shield-user";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PillTabs } from "@/components/ui/pill-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { GuideBanner } from "@/features/guide/guide-banner";
import { GuideTip } from "@/features/guide/guide-tip";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { fetchAuditLogs } from "@/lib/audit-logs";
import { fetchMakaLearnData } from "@/lib/supabase/app-data";
import { AccountsSection, type StatusFilter } from "@/features/admin/accounts-section";
import { ActivitySection } from "@/features/admin/activity-section";
import { type LogFilter, type LogRange, rangeBounds } from "@/features/admin/admin-shared";
import { ContentSection, type ContentView } from "@/features/admin/content-section";
import { OverviewSection, type OverviewJump } from "@/features/admin/overview-section";
import type {
  Activity as ActivityRecord,
  AppUser,
  AuditLog,
  Category,
  LearningItem,
  Lesson,
  MediaAsset
} from "@/types";

type Section = "home" | "accounts" | "content" | "activity";

const sections: { value: Section; label: string; icon: LucideIcon }[] = [
  { value: "home", label: "Home", icon: LayoutDashboard },
  { value: "accounts", label: "Accounts", icon: Users },
  { value: "content", label: "Content", icon: Layers },
  { value: "activity", label: "Activity log", icon: Activity }
];

const LOG_PAGE_SIZE = 50;

function sectionFromHash(): Section {
  const hash = window.location.hash.replace("#", "");
  return sections.some((section) => section.value === hash) ? (hash as Section) : "home";
}

export function AdminPanelView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const reduceMotion = useReducedMotion();
  const [section, setSection] = useState<Section>("home");
  const [users, setUsers] = useState<AppUser[]>([]);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [contentView, setContentView] = useState<ContentView>("materials");
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [logRange, setLogRange] = useState<LogRange>("all");
  const [dashboardLogs, setDashboardLogs] = useState<AuditLog[]>([]);
  // Set when a Home tile asks the Content section to open a material's pop-up; `at` makes repeat clicks re-trigger.
  const [openItemRequest, setOpenItemRequest] = useState<{ id: string; at: number } | null>(null);

  // Sections are kept in the URL hash so refresh and the browser back button keep your place.
  useEffect(() => {
    setSection(sectionFromHash());
    function handleHashChange() {
      setSection(sectionFromHash());
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function goTo(next: Section) {
    setSection(next);
    window.history.replaceState(null, "", next === "home" ? window.location.pathname : `#${next}`);
  }

  useEffect(() => {
    let active = true;
    fetchMakaLearnData()
      .then((data) => {
        if (!active) return;
        setUsers(data.users);
        setItems(data.learningItems);
        setMedia(data.mediaAssets);
        setActivities(data.activities);
        setLessons(data.lessons);
        setCategories(withBuiltInCategoryColors(data.categories));
      })
      .catch(() => {
        notify({ title: "Admin data unavailable", description: "Data could not be loaded. Try refreshing.", tone: "error" });
      });
    return () => {
      active = false;
    };
  }, [notify]);

  const reloadActivityLogs = useCallback(async () => {
    try {
      const firstPage = await fetchAuditLogs({ limit: LOG_PAGE_SIZE, ...rangeBounds(logRange) });
      setLogs(firstPage);
      setHasMoreLogs(firstPage.length === LOG_PAGE_SIZE);
    } catch {
      setLogs([]);
      setHasMoreLogs(false);
    }
  }, [logRange]);

  // The dashboard trend needs up to 6 months, independent of the Activity log's paging and date range.
  const reloadDashboardLogs = useCallback(async () => {
    const since = new Date();
    since.setMonth(since.getMonth() - 6);
    since.setHours(0, 0, 0, 0);
    try {
      setDashboardLogs(await fetchAuditLogs({ limit: 5000, since: since.toISOString() }));
    } catch {
      setDashboardLogs([]);
    }
  }, []);

  const reloadLogs = useCallback(() => {
    reloadActivityLogs();
    reloadDashboardLogs();
  }, [reloadActivityLogs, reloadDashboardLogs]);

  useEffect(() => {
    reloadActivityLogs();
  }, [reloadActivityLogs]);

  useEffect(() => {
    reloadDashboardLogs();
  }, [reloadDashboardLogs]);

  async function loadMoreLogs() {
    const last = logs[logs.length - 1];
    if (!last) return;
    setLoadingMoreLogs(true);
    try {
      // Paging moves `before` back to the last loaded log, which is always inside the range.
      const nextPage = await fetchAuditLogs({ limit: LOG_PAGE_SIZE, since: rangeBounds(logRange).since, before: last.createdAt });
      setLogs((current) => [...current, ...nextPage]);
      setHasMoreLogs(nextPage.length === LOG_PAGE_SIZE);
    } catch {
      notify({ title: "More activity unavailable", description: "Try again.", tone: "error" });
    } finally {
      setLoadingMoreLogs(false);
    }
  }

  function handleJump(jump: OverviewJump) {
    if (jump.section === "accounts") setStatusFilter(jump.status ?? "all");
    if (jump.section === "content") {
      setContentView(jump.view ?? "materials");
      setOpenItemRequest(jump.openItemId ? { id: jump.openItemId, at: Date.now() } : null);
    }
    goTo(jump.section);
  }

  if (user.role !== "admin") {
    return (
      <Card>
        <CardTitle>Admin access required</CardTitle>
        <CardDescription>The Admin page is only for admin accounts.</CardDescription>
        <Link href="/login" className="mt-4 inline-flex">
          <Button>Sign in as admin</Button>
        </Link>
      </Card>
    );
  }

  return (
    <>
      <PageHeader title="Admin" icon={ShieldUser} />
      <GuideBanner pageKey="admin" />

      <GuideTip id="admin.sections">
        <PillTabs id="admin-sections" label="Admin sections" value={section} onChange={goTo} options={sections} className="mb-6" />
      </GuideTip>

      {/* Each section rises in when chosen, like a page change. */}
      <motion.div
        key={section}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {section === "home" ? (
          <OverviewSection
            adminName={user.name}
            users={users}
            items={items}
            media={media}
            activities={activities}
            lessons={lessons}
            logs={dashboardLogs}
            onJump={handleJump}
          />
        ) : null}

        {section === "accounts" ? (
          <AccountsSection
            users={users}
            currentUserId={user.id}
            initialStatusFilter={statusFilter}
            onUserChange={(changed) => setUsers((current) => current.map((account) => (account.id === changed.id ? changed : account)))}
            onUserAdd={(added) => setUsers((current) => [added, ...current.filter((account) => account.id !== added.id)])}
            onLogsChanged={reloadLogs}
          />
        ) : null}

        {section === "content" ? (
          <ContentSection
            items={items}
            media={media}
            users={users}
            categories={categories}
            initialView={contentView}
            openItemRequest={openItemRequest}
            onItemSaved={(saved) => setItems((current) => current.map((item) => (item.id === saved.id ? saved : item)))}
            onItemDeleted={(deleted, deletedMedia) => {
              setItems((current) => current.filter((item) => item.id !== deleted.id));
              if (deletedMedia) setMedia((current) => current.filter((asset) => asset.relatedItemId !== deleted.id));
              reloadLogs();
            }}
            onMediaDeleted={(deleted) => {
              setMedia((current) => current.filter((asset) => asset.id !== deleted.id));
              // Clear the matching URL locally too, mirroring what the delete did in the database.
              if (deleted.relatedItemId && deleted.publicUrl) {
                setItems((current) =>
                  current.map((item) => {
                    if (item.id !== deleted.relatedItemId) return item;
                    return {
                      ...item,
                      symbolImageUrl: item.symbolImageUrl === deleted.publicUrl ? undefined : item.symbolImageUrl,
                      gestureMediaUrl: item.gestureMediaUrl === deleted.publicUrl ? undefined : item.gestureMediaUrl,
                      audioUrl: item.audioUrl === deleted.publicUrl ? undefined : item.audioUrl
                    };
                  })
                );
              }
              reloadLogs();
            }}
          />
        ) : null}

        {section === "activity" ? (
          <ActivitySection
            logs={logs}
            hasMore={hasMoreLogs}
            loadingMore={loadingMoreLogs}
            onLoadMore={loadMoreLogs}
            filter={logFilter}
            onFilterChange={setLogFilter}
            range={logRange}
            onRangeChange={setLogRange}
          />
        ) : null}
      </motion.div>
    </>
  );
}
