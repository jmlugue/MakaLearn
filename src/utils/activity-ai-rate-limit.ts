import type { ActivityDraftResult } from "@/utils/activity-ai-draft";

export const ACTIVITY_DRAFT_HOURLY_LIMIT = 10;
export const ACTIVITY_DRAFT_DAILY_LIMIT = 40;
export const ACTIVITY_DRAFT_MATERIAL_COOLDOWN_SECONDS = 60;
export const ACTIVITY_DRAFT_PROVIDER_TIMEOUT_MS = 30000;

export function canRetryActivityDraftCall({
  modelRequestCount,
  retryable,
  rateAllowed
}: {
  modelRequestCount: number;
  retryable: boolean;
  rateAllowed: boolean;
}) {
  return modelRequestCount < 2 && retryable && rateAllowed;
}

export type ActivityDraftRateCounts = {
  hourlyRequests: number;
  dailyRequests: number;
  recentMaterialSuccesses: number;
  ignoreMaterialCooldown?: boolean;
};

/** Pure boundary logic shared by the route and focused tests. Actual usage remains in Supabase. */
export function evaluateActivityDraftRateLimit({
  hourlyRequests,
  dailyRequests,
  recentMaterialSuccesses,
  ignoreMaterialCooldown = false
}: ActivityDraftRateCounts): { allowed: boolean; rateLimit: NonNullable<ActivityDraftResult["rateLimit"]> } {
  // Failed/provider-unavailable calls still consume hourly and daily quota, but they must not lock the
  // teacher out of retrying the same materials. The short cooldown begins only after usable AI output.
  const cooldownBlocked = !ignoreMaterialCooldown && recentMaterialSuccesses > 0;
  const allowed =
    hourlyRequests < ACTIVITY_DRAFT_HOURLY_LIMIT &&
    dailyRequests < ACTIVITY_DRAFT_DAILY_LIMIT &&
    !cooldownBlocked;

  return {
    allowed,
    rateLimit: {
      hourlyLimit: ACTIVITY_DRAFT_HOURLY_LIMIT,
      dailyLimit: ACTIVITY_DRAFT_DAILY_LIMIT,
      remainingHourly: Math.max(0, ACTIVITY_DRAFT_HOURLY_LIMIT - hourlyRequests),
      remainingDaily: Math.max(0, ACTIVITY_DRAFT_DAILY_LIMIT - dailyRequests),
      retryAfterSeconds: cooldownBlocked ? ACTIVITY_DRAFT_MATERIAL_COOLDOWN_SECONDS : undefined
    }
  };
}
