"use client";

import { useMemo, useState } from "react";
import { BookOpen, BookPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/common/empty-state";
import { SearchInput } from "@/features/admin/admin-shared";
import { sortLabels, sortRecords, type SortOrder } from "@/features/content/content-shared";
import { GuideTip } from "@/features/guide/guide-tip";
import { LessonCard } from "@/features/content/lesson-card";
import type { LearningItem, Lesson } from "@/types";

export function LessonsTab({
  lessons,
  itemById,
  creatorFor,
  canCreate,
  onOpenLesson,
  onNewLesson
}: {
  lessons: Lesson[];
  itemById: Map<string, LearningItem>;
  /** Owner name for shared lessons made by someone else. */
  creatorFor: (lesson: Lesson) => string | undefined;
  canCreate: boolean;
  onOpenLesson: (lesson: Lesson) => void;
  onNewLesson: () => void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = lessons.filter((lesson) => {
      if (!query) return true;
      const labels = lesson.learningItemIds.map((id) => itemById.get(id)?.label ?? "").join(" ");
      return [lesson.title, lesson.objective, lesson.instructions, labels].join(" ").toLowerCase().includes(query);
    });
    return sortRecords(matches, sort, (lesson) => lesson.title, (lesson) => lesson.createdAt);
  }, [itemById, lessons, search, sort]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput label="Search lessons" placeholder="Search lessons or cards" value={search} onChange={setSearch} />
        <div className="w-44">
          <Select aria-label="Sort lessons" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)}>
            {(Object.keys(sortLabels) as SortOrder[]).map((key) => (
              <option key={key} value={key}>
                {sortLabels[key]}
              </option>
            ))}
          </Select>
        </div>
        {canCreate ? (
          <GuideTip id="content.addLesson">
            <Button className="ml-auto" onClick={onNewLesson}>
              <BookPlus className="h-4 w-4" aria-hidden="true" />
              New lesson
            </Button>
          </GuideTip>
        ) : null}
      </div>

      {filtered.length ? (
        <div className="grid gap-3">
          {filtered.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              items={lesson.learningItemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item))}
              creator={creatorFor(lesson)}
              onOpen={() => onOpenLesson(lesson)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={lessons.length ? "No lessons found" : "No lessons yet"}
          description={lessons.length ? "Try another search." : "Use New lesson to plan the first one."}
        />
      )}
    </section>
  );
}
