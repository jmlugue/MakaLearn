import { ArrowLeftRight, CaseSensitive, Hand, MousePointerClick, Move, TextCursorInput, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { activityTypeShortLabels } from "@/utils/activity-labels";
import { activityTypeTones } from "@/features/activities/activity-helpers";
import type { ActivityType } from "@/types";

/** One icon per type, so a type is never told by color alone. */
export const activityTypeIcons: Record<ActivityType, LucideIcon> = {
  "match-word-symbol": ArrowLeftRight,
  "choose-correct-symbol": MousePointerClick,
  "fill-blank": TextCursorInput,
  "drag-drop-symbol": Move,
  "gesture-practice": Hand,
  "simple-quiz": CaseSensitive
};

/** The activity's format: icon and short name, in its type color. */
export function ActivityTypeBadge({ type, className }: { type: ActivityType; className?: string }) {
  const Icon = activityTypeIcons[type];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        activityTypeTones[type].badge,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {activityTypeShortLabels[type]}
    </span>
  );
}
