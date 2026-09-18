import { cn } from "@/lib/utils";
import { activityTypeLabels } from "@/utils/activity-labels";
import { activityTypeTones } from "@/features/activities/activity-helpers";
import type { ActivityType } from "@/types";

/** The activity's format, in its type color. */
export function ActivityTypeBadge({ type, className }: { type: ActivityType; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", activityTypeTones[type].badge, className)}>
      {activityTypeLabels[type]}
    </span>
  );
}
