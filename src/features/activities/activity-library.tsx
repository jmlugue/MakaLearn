"use client";

import { useMemo, useState } from "react";
import { BookOpen, Layers, Library, Search, User } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Select } from "@/components/ui/form";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { SearchInput } from "@/features/admin/admin-shared";
import { sortLabels, sortRecords, type SortOrder } from "@/features/content/content-shared";
import { GuideTip } from "@/features/guide/guide-tip";
import { ActivityCard } from "@/features/activities/activity-card";
import { itemsOfActivity } from "@/features/activities/activity-helpers";
import { activityTypeLabels } from "@/utils/activity-labels";
import type { Activity, LearningItem, Lesson } from "@/types";

type LibraryFilter = "all" | "lessons" | "mine";

export function ActivityLibrary({
  activities,
  itemById,
  lessonOf,
  userId,
  onOpen,
  onPlay
}: {
  activities: Activity[];
  itemById: Map<string, LearningItem>;
  lessonOf: (activity: Activity) => Lesson | undefined;
  userId: string;
  onOpen: (activity: Activity) => void;
  onPlay: (activity: Activity) => void;
}) {
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("name-asc");

  const fromLessons = useMemo(() => activities.filter((activity) => lessonOf(activity)), [activities, lessonOf]);
  const mine = useMemo(() => activities.filter((activity) => activity.createdBy === userId), [activities, userId]);

  const visible = useMemo(() => {
    const pool = filter === "lessons" ? fromLessons : filter === "mine" ? mine : activities;
    const query = search.trim().toLowerCase();
    const matches = query
      ? pool.filter((activity) => {
          const labels = itemsOfActivity(activity, itemById).map((item) => item.label).join(" ");
          return [activity.title, activityTypeLabels[activity.type], lessonOf(activity)?.title ?? "", labels].join(" ").toLowerCase().includes(query);
        })
      : pool;
    // Activities have no created date, so "newest" keeps the saved order (newest first from the database).
    return sort === "newest" ? matches : sort === "oldest" ? [...matches].reverse() : sortRecords(matches, sort, (activity) => activity.title, () => "");
  }, [activities, filter, fromLessons, itemById, lessonOf, mine, search, sort]);

  return (
    <section className="space-y-4">
      <GuideTip id="activities.filter">
        <UnderlineTabs
          id="activity-library"
          label="Show activities"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: activities.length, icon: Layers },
            { value: "lessons", label: "From lessons", count: fromLessons.length, icon: BookOpen },
            { value: "mine", label: "Mine", count: mine.length, icon: User }
          ]}
        />
      </GuideTip>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput label="Search activities" placeholder="Search activities or cards" value={search} onChange={setSearch} />
        <div className="w-44">
          <Select aria-label="Sort activities" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}>
            {(Object.keys(sortLabels) as SortOrder[]).map((key) => (
              <option key={key} value={key}>
                {sortLabels[key]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {visible.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              items={itemsOfActivity(activity, itemById)}
              lesson={lessonOf(activity)}
              onOpen={() => onOpen(activity)}
              onPlay={() => onPlay(activity)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={search ? Search : Library}
          title={activities.length ? "No activities found" : "No activities yet"}
          description={
            activities.length
              ? "Try another search or filter."
              : "Use Create activity, or tick Create activity when you save a lesson."
          }
        />
      )}
    </section>
  );
}
