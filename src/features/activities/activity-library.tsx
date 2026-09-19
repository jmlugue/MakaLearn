"use client";

import { useMemo, useState } from "react";
import { BookOpen, Layers, Library, Lock, Search } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { Select } from "@/components/ui/form";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import { SearchInput } from "@/features/admin/admin-shared";
import { sortLabels, sortRecords, type SortOrder } from "@/features/content/content-shared";
import { GuideTip } from "@/features/guide/guide-tip";
import { ActivityCard } from "@/features/activities/activity-card";
import { activityTypes, itemsOfActivity } from "@/features/activities/activity-helpers";
import { activityTypeLabels } from "@/utils/activity-labels";
import type { Activity, ActivityType, LearningItem, Lesson } from "@/types";

type LibraryFilter = "all" | "lessons" | "private";

export function ActivityLibrary({
  activities,
  itemById,
  lessonOf,
  creatorOf,
  onOpen,
  onPlay
}: {
  activities: Activity[];
  itemById: Map<string, LearningItem>;
  lessonOf: (activity: Activity) => Lesson | undefined;
  /** Owner name for shared activities made by someone else. */
  creatorOf: (activity: Activity) => string | undefined;
  onOpen: (activity: Activity) => void;
  onPlay: (activity: Activity) => void;
}) {
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [type, setType] = useState<ActivityType | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("name-asc");

  const fromLessons = useMemo(() => activities.filter((activity) => lessonOf(activity)), [activities, lessonOf]);
  const privateOnes = useMemo(() => activities.filter((activity) => activity.visibility === "private"), [activities]);

  const visible = useMemo(() => {
    const tabbed = filter === "lessons" ? fromLessons : filter === "private" ? privateOnes : activities;
    const pool = type === "all" ? tabbed : tabbed.filter((activity) => activity.type === type);
    const query = search.trim().toLowerCase();
    const matches = query
      ? pool.filter((activity) => {
          const labels = itemsOfActivity(activity, itemById).map((item) => item.label).join(" ");
          return [activity.title, activityTypeLabels[activity.type], lessonOf(activity)?.title ?? "", labels].join(" ").toLowerCase().includes(query);
        })
      : pool;
    // Activities have no created date, so "newest" keeps the saved order (newest first from the database).
    return sort === "newest" ? matches : sort === "oldest" ? [...matches].reverse() : sortRecords(matches, sort, (activity) => activity.title, () => "");
  }, [activities, filter, fromLessons, itemById, lessonOf, privateOnes, search, sort, type]);

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
            { value: "private", label: "Private", count: privateOnes.length, icon: Lock }
          ]}
        />
      </GuideTip>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput label="Search activities" placeholder="Search activities or cards" value={search} onChange={setSearch} />
        <GuideTip id="activities.typeFilter">
          <div className="w-52">
            <Select aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value as ActivityType | "all")}>
              <option value="all">All types</option>
              {activityTypes.map((option) => (
                <option key={option} value={option}>
                  {activityTypeLabels[option]}
                </option>
              ))}
            </Select>
          </div>
        </GuideTip>
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
              creator={creatorOf(activity)}
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
