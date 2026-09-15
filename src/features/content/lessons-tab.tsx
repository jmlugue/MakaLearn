"use client";

import { useMemo, useState } from "react";
import { BookOpen, BookPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/common/empty-state";
import { SearchInput } from "@/features/admin/admin-shared";
import { LessonCard } from "@/features/content/lesson-card";
import type { LearningItem, Lesson } from "@/types";

type SourceFilter = "all" | Lesson["source"];

export function LessonsTab({
  lessons,
  itemById,
  onOpenLesson,
  onNewLesson
}: {
  lessons: Lesson[];
  itemById: Map<string, LearningItem>;
  onOpenLesson: (lesson: Lesson) => void;
  onNewLesson: () => void;
}) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return lessons.filter((lesson) => {
      if (source !== "all" && lesson.source !== source) return false;
      if (!query) return true;
      const labels = lesson.learningItemIds.map((id) => itemById.get(id)?.label ?? "").join(" ");
      return [lesson.title, lesson.objective, lesson.instructions, labels].join(" ").toLowerCase().includes(query);
    });
  }, [itemById, lessons, search, source]);

  const manualCount = lessons.filter((lesson) => lesson.source === "manual").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Lesson source"
          value={source}
          onChange={setSource}
          options={[
            { value: "all", label: "All", count: lessons.length },
            { value: "manual", label: "Manual", count: manualCount },
            { value: "auto-generated", label: "Auto-made", count: lessons.length - manualCount }
          ]}
        />
        <SearchInput label="Search lessons" placeholder="Search lessons or cards" value={search} onChange={setSearch} />
        <Button className="ml-auto" onClick={onNewLesson}>
          <BookPlus className="h-4 w-4" aria-hidden="true" />
          New lesson
        </Button>
      </div>

      {filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              items={lesson.learningItemIds.map((id) => itemById.get(id)).filter((item): item is LearningItem => Boolean(item))}
              onOpen={() => onOpenLesson(lesson)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title={lessons.length ? "No lessons found" : "No lessons yet"}
          description={lessons.length ? "Try another search or filter." : "Use New lesson, or Generate lesson from a card."}
        />
      )}
    </section>
  );
}
