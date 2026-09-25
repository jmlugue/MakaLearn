"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { activityTypeIcons } from "@/features/activities/activity-type-badge";
import { activityTypeTones } from "@/features/activities/activity-helpers";
import { activityTypeShortLabels } from "@/utils/activity-labels";
import { SymbolOption } from "@/features/activities/player/player-parts";
import type { Activity, LearningItem } from "@/types";

/** Student mode Activities: big picture tiles. Tap one to play; Home in the game comes back here. */
export function StudentActivityMenu({
  activities,
  learningItems,
  onPlay
}: {
  activities: Activity[];
  learningItems: LearningItem[];
  onPlay: (activityId: string) => void;
}) {
  return (
    <section className="mx-auto grid w-full max-w-7xl gap-4 pb-6 pt-3 sm:gap-6">
      <header className="flex min-h-12 items-center pl-16">
        <h1 className="text-3xl font-black text-[#10285e] sm:text-4xl">Pick an activity</h1>
      </header>
      <ul className="stagger-grid grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4">
        {activities.map((activity) => (
          <li key={activity.id}>
            <ActivityTile activity={activity} learningItems={learningItems} onPlay={() => onPlay(activity.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActivityTile({ activity, learningItems, onPlay }: { activity: Activity; learningItems: LearningItem[]; onPlay: () => void }) {
  const tone = activityTypeTones[activity.type];
  const Icon = activityTypeIcons[activity.type];
  const pictures = activity.questions
    .slice(0, 4)
    .map((question) => question.answer)
    .filter((value, index, all) => value && all.indexOf(value) === index);

  return (
    <button
      type="button"
      onClick={onPlay}
      className="group grid h-full w-full overflow-hidden rounded-[1.75rem] border-4 border-white bg-white/95 text-left shadow-[0_10px_0_rgba(147,197,253,0.3),0_22px_40px_rgba(37,99,235,0.12)] transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
    >
      <span className={cn("h-3 w-full", tone.stripe)} aria-hidden="true" />
      <span className={cn("grid h-36 grid-cols-4 items-center gap-2 px-4 py-3 sm:h-40", tone.soft)} aria-hidden="true">
        {pictures.map((value) => (
          <span key={value} className="grid aspect-[3/4] min-h-0 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white p-1 shadow-sm">
            <SymbolOption value={value} learningItems={learningItems} framed={false} preferNoTextPecs className="!h-full max-h-full" />
          </span>
        ))}
      </span>
      <span className="grid gap-3 px-4 pb-4 pt-3">
        <span className={cn("inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-base font-black", tone.badge)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
          {activityTypeShortLabels[activity.type]}
        </span>
        <span className="flex items-end justify-between gap-3">
          <span className="line-clamp-2 min-w-0 break-words text-xl font-black leading-tight text-[#10285e] sm:text-2xl">{activity.title}</span>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-[0_5px_0_rgba(30,64,175,0.35)] transition group-hover:bg-blue-700">
            <Play className="h-7 w-7 fill-white" aria-hidden="true" />
          </span>
        </span>
      </span>
    </button>
  );
}
