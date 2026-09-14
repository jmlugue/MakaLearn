"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { useToast } from "@/components/common/toast-provider";
import { useAuthUser } from "@/features/auth/use-auth-user";
import { fetchAuditLogs } from "@/lib/audit-logs";
import { fetchMakaLearnData } from "@/lib/supabase/app-data";
import { AccountsSection, type StatusFilter } from "@/features/admin/accounts-section";
import { ActivitySection } from "@/features/admin/activity-section";
import type { LogFilter } from "@/features/admin/admin-shared";
import { ContentSection, type ItemsFilter } from "@/features/admin/content-section";
import { OverviewSection, type OverviewJump } from "@/features/admin/overview-section";
import type { Activity as ActivityRecord, AppUser, AuditLog, LearningItem, Lesson, MediaAsset } from "@/types";

type Section = "home" | "accounts" | "content" | "activity";

const sections: { value: Section; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "accounts", label: "Accounts" },
  { value: "content", label: "Content" },
  { value: "activity", label: "Activity log" }
];

const LOG_PAGE_SIZE = 50;

function sectionFromHash(): Section {
  const hash = window.location.hash.replace("#", "");
  return sections.some((section) => section.value === hash) ? (hash as Section) : "home";
}

export function AdminPanelView() {
  const { user } = useAuthUser();
  const { notify } = useToast();
  const [section, setSection] = useState<Section>("home");
  const [addTeacherRequest, setAddTeacherRequest] = useState(0);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [items, setItems] = useState<LearningItem[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [itemsFilter, setItemsFilter] = useState<ItemsFilter>("all");
  const [logFilter, setLogFilter] = useState<LogFilter>("all");

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
      })
      .catch(() => {
        notify({ title: "Admin data unavailable", description: "Data could not be loaded. Try refreshing.", tone: "error" });
      });
    return () => {
      active = false;
    };
  }, [notify]);

  const reloadLogs = useCallback(async () => {
    try {
      const firstPage = await fetchAuditLogs({ limit: LOG_PAGE_SIZE });
      setLogs(firstPage);
      setHasMoreLogs(firstPage.length === LOG_PAGE_SIZE);
    } catch {
      setLogs([]);
      setHasMoreLogs(false);
    }
  }, []);

  useEffect(() => {
    reloadLogs();
  }, [reloadLogs]);

  async function loadMoreLogs() {
    const last = logs[logs.length - 1];
    if (!last) return;
    setLoadingMoreLogs(true);
    try {
      const nextPage = await fetchAuditLogs({ limit: LOG_PAGE_SIZE, before: last.createdAt });
      setLogs((current) => [...current, ...nextPage]);
      setHasMoreLogs(nextPage.length === LOG_PAGE_SIZE);
    } catch {
      notify({ title: "More activity unavailable", description: "Try again.", tone: "error" });
    } finally {
      setLoadingMoreLogs(false);
    }
  }

  function handleJump(jump: OverviewJump) {
    if (jump.section === "accounts") {
      setStatusFilter(jump.status ?? "all");
      if (jump.addTeacher) setAddTeacherRequest((current) => current + 1);
    }
    if (jump.section === "content") setItemsFilter(jump.itemsFilter);
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
      <PageHeader title="Admin" icon={Shield} />

      <UnderlineTabs id="admin-sections" label="Admin sections" value={section} onChange={goTo} options={sections} className="mb-6" />

      {section === "home" ? (
        <OverviewSection
          adminName={user.name}
          users={users}
          items={items}
          media={media}
          activities={activities}
          lessons={lessons}
          logs={logs}
          onJump={handleJump}
        />
      ) : null}

      {section === "accounts" ? (
        <AccountsSection
          users={users}
          currentUserId={user.id}
          initialStatusFilter={statusFilter}
          addTeacherRequest={addTeacherRequest}
          onUserChange={(changed) => setUsers((current) => current.map((account) => (account.id === changed.id ? changed : account)))}
          onUserAdd={(added) => setUsers((current) => [added, ...current.filter((account) => account.id !== added.id)])}
          onLogsChanged={reloadLogs}
        />
      ) : null}

      {section === "content" ? <ContentSection items={items} media={media} users={users} initialItemsFilter={itemsFilter} /> : null}

      {section === "activity" ? (
        <ActivitySection
          logs={logs}
          hasMore={hasMoreLogs}
          loadingMore={loadingMoreLogs}
          onLoadMore={loadMoreLogs}
          filter={logFilter}
          onFilterChange={setLogFilter}
        />
      ) : null}
    </>
  );
}
