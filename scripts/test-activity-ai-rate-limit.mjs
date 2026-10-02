import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

const rate = loadTs("src/utils/activity-ai-rate-limit.ts");

test("activity drafting allows the tenth hourly and fortieth daily calls", () => {
  const result = rate.evaluateActivityDraftRateLimit({
    hourlyRequests: 9,
    dailyRequests: 39,
    recentMaterialSuccesses: 0
  });
  assert.equal(result.allowed, true);
  assert.equal(result.rateLimit.remainingHourly, 1);
  assert.equal(result.rateLimit.remainingDaily, 1);
});

test("activity drafting blocks at hourly or daily boundaries", () => {
  assert.equal(
    rate.evaluateActivityDraftRateLimit({ hourlyRequests: 10, dailyRequests: 10, recentMaterialSuccesses: 0 }).allowed,
    false
  );
  assert.equal(
    rate.evaluateActivityDraftRateLimit({ hourlyRequests: 1, dailyRequests: 40, recentMaterialSuccesses: 0 }).allowed,
    false
  );
});

test("same-material cooldown blocks retries only after a successful draft", () => {
  const result = rate.evaluateActivityDraftRateLimit({
    hourlyRequests: 1,
    dailyRequests: 1,
    recentMaterialSuccesses: 1
  });
  assert.equal(result.allowed, false);
  assert.equal(result.rateLimit.retryAfterSeconds, 60);
});

test("a failed request consumes quota without triggering the same-material cooldown", () => {
  const result = rate.evaluateActivityDraftRateLimit({
    hourlyRequests: 1,
    dailyRequests: 1,
    recentMaterialSuccesses: 0
  });
  assert.equal(result.allowed, true);
  assert.equal(result.rateLimit.retryAfterSeconds, undefined);
});

test("a transient provider retry ignores cooldown but still obeys request capacity", () => {
  assert.equal(
    rate.evaluateActivityDraftRateLimit({
      hourlyRequests: 1,
      dailyRequests: 1,
      recentMaterialSuccesses: 1,
      ignoreMaterialCooldown: true
    }).allowed,
    true
  );
  assert.equal(
    rate.evaluateActivityDraftRateLimit({
      hourlyRequests: 10,
      dailyRequests: 10,
      recentMaterialSuccesses: 1,
      ignoreMaterialCooldown: true
    }).allowed,
    false
  );
});

test("an explicit regeneration bypasses only the same-material cooldown", () => {
  assert.equal(rate.shouldIgnoreActivityDraftMaterialCooldown(true), true);
  assert.equal(rate.shouldIgnoreActivityDraftMaterialCooldown(false), false);
  assert.equal(rate.shouldIgnoreActivityDraftMaterialCooldown(undefined), false);

  const regenerated = rate.evaluateActivityDraftRateLimit({
    hourlyRequests: 2,
    dailyRequests: 2,
    recentMaterialSuccesses: 1,
    ignoreMaterialCooldown: rate.shouldIgnoreActivityDraftMaterialCooldown(true)
  });
  assert.equal(regenerated.allowed, true);

  const quotaReached = rate.evaluateActivityDraftRateLimit({
    hourlyRequests: 10,
    dailyRequests: 2,
    recentMaterialSuccesses: 1,
    ignoreMaterialCooldown: rate.shouldIgnoreActivityDraftMaterialCooldown(true)
  });
  assert.equal(quotaReached.allowed, false);
  assert.equal(quotaReached.rateLimit.retryAfterSeconds, undefined);
});

test("one click gets at most one quota-counted retry", () => {
  assert.equal(rate.ACTIVITY_DRAFT_PROVIDER_TIMEOUT_MS, 30000);
  assert.equal(rate.canRetryActivityDraftCall({ modelRequestCount: 1, retryable: true, rateAllowed: true }), true);
  assert.equal(rate.canRetryActivityDraftCall({ modelRequestCount: 2, retryable: true, rateAllowed: true }), false);
  assert.equal(rate.canRetryActivityDraftCall({ modelRequestCount: 1, retryable: false, rateAllowed: true }), false);
  assert.equal(rate.canRetryActivityDraftCall({ modelRequestCount: 1, retryable: true, rateAllowed: false }), false);
});
