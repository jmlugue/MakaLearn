import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./load-ts.mjs";

let account = { user: { id: "verified-teacher" }, role: "teacher", status: "active" };
let quota = true, quotaError = false, reservations = [], providerCalls = 0;
const server = {
  createSupabaseServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: account.user }, error: null }) },
    from: () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: account, error: null }) })
  }),
  createSupabaseServiceRoleClient: () => ({ rpc: async (_, args) => {
    reservations.push(args);
    if (quotaError) throw new Error("Database offline");
    return { data: quota, error: null };
  } })
};
const guard = loadTs("src/lib/ai-request-guard.ts", { "@/lib/supabase/server": server });
const route = loadTs("src/app/api/gesture-feedback/route.ts", {
  "next/server": { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
  "@/lib/ai-request-guard": guard
});
const payload = { selectedGestureLabel: "Help", predictedGestureLabel: null, matchPercent: null,
  detectedHandCount: 1, expectedHandCount: 2, trackingState: "hands-visible", issueCategory: "low-confidence" };
const request = (body = payload) => new Request("https://example.invalid/api/gesture-feedback", { method: "POST", body: JSON.stringify(body) });

test("feedback requires an active teacher/admin and never trusts a body account ID", async () => {
  const oldKey = process.env.GEMINI_API_KEY, oldFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "mock-only";
  globalThis.fetch = async () => { providerCalls++; return new Response("", { status: 503 }); };
  try {
    for (const [user, role, status, expected] of [[null, "teacher", "active", 401], [{ id: "teacher" }, "teacher", "deactivated", 403], [{ id: "teacher" }, "other", "active", 403]]) {
      account = { user, role, status }; reservations = []; providerCalls = 0;
      assert.equal((await route.POST(request())).status, expected);
      assert.equal(providerCalls, 0); assert.equal(reservations.length, 0);
    }
    for (const role of ["teacher", "admin"]) {
      account = { user: { id: "verified" }, role, status: "active" }; quota = true;
      reservations = []; providerCalls = 0;
      assert.equal((await route.POST(request({ ...payload, userId: "forged" }))).status, 200);
      assert.equal(providerCalls, 1); assert.equal(reservations[0].p_user, "verified");
    }
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; }
});

test("quota rejection or failure preserves local feedback and never calls the provider", async () => {
  const oldKey = process.env.GEMINI_API_KEY, oldFetch = globalThis.fetch;
  process.env.GEMINI_API_KEY = "mock-only";
  globalThis.fetch = async () => { throw new Error("Provider must not run"); };
  account = { user: { id: "verified" }, role: "teacher", status: "active" };
  try {
    for (const fail of [false, true]) {
      quota = false; quotaError = fail;
      const result = await route.POST(request());
      assert.equal(result.status, 200); assert.equal((await result.json()).source, "template");
    }
    quotaError = false; quota = true; reservations = [];
    await route.POST(request({ ...payload, issueCategory: "palm-orientation-mismatch", localFeedbackHint: "Turn your palm sideways." }));
    assert.equal(reservations.length, 0);
    delete process.env.GEMINI_API_KEY;
    await route.POST(request()); assert.equal(reservations.length, 0);
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey; }
});

test("oversized/invalid feedback input is rejected before reserving requests", async () => {
  reservations = [];
  for (const body of [{ ...payload, selectedGestureLabel: "x".repeat(121) }, { ...payload, detectedHandCount: -1 }, { ...payload, matchPercent: 101 }, { ...payload, extra: "x".repeat(7000) }]) {
    assert.equal((await route.POST(request(body))).status, 400);
  }
  assert.equal(reservations.length, 0);
});

test("duplicate labels ignore case/spacing but preserve material-type boundaries and same-record edits", () => {
  const { duplicateMaterialMessage } = loadTs("src/utils/material-label.ts");
  const items = [{ id: "one", label: "Wash hands", contentType: "pecs" }];
  assert.ok(duplicateMaterialMessage(" WASH\t  hands ", "pecs", items));
  assert.equal(duplicateMaterialMessage("Wash hands", "gesture", items), "");
  assert.equal(duplicateMaterialMessage("Wash hands", "pecs", items, "one"), "");
});

test("paging includes records beyond the API page limit and refuses a partial failed library", async () => {
  const { readAllRows } = loadTs("src/lib/supabase/pagination.ts");
  const data = Array.from({ length: 1203 }, (_, id) => ({ id }));
  const rows = await readAllRows(async (from, to) => ({ data: data.slice(from, to + 1), error: null }));
  assert.deepEqual(rows, data);
  await assert.rejects(readAllRows(async (from, to) => from ? ({ data: null, error: { message: "offline" } }) : ({ data: data.slice(from, to + 1), error: null })), /offline/);
});

let mediaScenario = "success", mediaOps = [];
function mediaClient() {
  return {
    storage: { from: () => ({ remove: async () => { mediaOps.push("storage"); return { error: mediaScenario === "storage-error" ? { message: "offline" } : null }; } }) },
    from(table) {
      let op;
      const q = {
        update() { op = "update"; return q; }, delete() { op = "delete"; return q; }, select() { return q; }, eq() { return q; },
        then(resolve, reject) {
          mediaOps.push(`${table}:${op}`);
          return Promise.resolve({ data: mediaScenario === "denied" && table === "media_assets" ? [] : [{ id: "asset" }],
            error: mediaScenario === "unlink-error" && table === "learning_items" ? { message: "offline" } : null }).then(resolve, reject);
        }
      };
      return q;
    }
  };
}
const media = loadTs("src/lib/supabase/media.ts", { "@/lib/supabase/client": { getSupabaseBrowserClient: mediaClient } });
const asset = { id: "asset", bucket: "symbol-images", storagePath: "fixture.png", type: "symbol-image", relatedItemId: "item", publicUrl: "https://example.invalid/fixture.png" };
test("media cleanup retains its retryable record on failure and checks permission before storage", async () => {
  for (const scenario of ["denied", "storage-error", "unlink-error"]) {
    mediaScenario = scenario; mediaOps = [];
    await assert.rejects(media.deleteMediaAssetFromSupabase(asset));
    assert.ok(!mediaOps.includes("media_assets:delete"));
    if (scenario === "denied") assert.ok(!mediaOps.includes("storage"));
  }
  mediaScenario = "success"; mediaOps = [];
  await media.deleteMediaAssetFromSupabase(asset);
  assert.deepEqual(mediaOps, ["media_assets:update", "storage", "learning_items:update", "media_assets:delete"]);
});

let prepState = "claimed", prepCalls = 0, prepReservations = 0, staleFinish = false;
let prepItem = { id: "new", content_type: "pecs", label: "Apple", tags: [], category_id: "food", updated_at: "2026-10-26T00:00:00Z" };
const prepFilters = [];
const prepRoute = loadTs("src/app/api/playground-prepare/route.ts", {
  "next/server": { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
  "@/lib/supabase/server": {
    createSupabaseServerClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "teacher" } }, error: null }) },
      from(table) {
        const q = { select() { return q; }, eq(key, value) { prepFilters.push([key, value]); return q; },
          single: async () => ({ data: table === "profiles" ? { status: "active", role: "teacher" } : prepItem, error: null }),
          maybeSingle: async () => ({ data: { name: "Food" }, error: null }), update() { return q; },
          insert: async () => ({ error: null }), then(resolve, reject) { return Promise.resolve({ data: staleFinish ? [] : [{ id: "new" }], error: null }).then(resolve, reject); }
        }; return q;
      }
    }),
    createSupabaseServiceRoleClient: () => ({ rpc: async () => { prepReservations++; return { data: { state: prepState, attemptedAt: "2026-10-26T00:00:01Z", version: prepItem.updated_at }, error: null }; } })
  }
});
test("preparation makes no automatic retries and rejects busy/limited/stale completion paths", async () => {
  const oldKey = process.env.GEMINI_MSAV_API_KEY, oldFetch = globalThis.fetch;
  process.env.GEMINI_MSAV_API_KEY = "mock-only";
  const req = () => new Request("https://example.invalid/api/playground-prepare", { method: "POST", body: JSON.stringify({ learningItemId: "new" }) });
  globalThis.fetch = async () => {
    prepCalls++;
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ status: "supported", profile: { roles: ["object"], traits: ["requestable"], singleCardType: "word" } }) }] } }] });
  };
  try {
    for (const state of ["busy", "limited", "cooldown", "changed"]) {
      prepState = state; prepCalls = 0;
      assert.ok((await prepRoute.POST(req())).status >= 400);
      assert.equal(prepCalls, 0);
    }
    prepState = "claimed"; prepCalls = 0; prepFilters.length = 0;
    assert.equal((await prepRoute.POST(req())).status, 200);
    assert.equal(prepCalls, 1);
    assert.ok(prepFilters.some(([key, value]) => key === "updated_at" && value === prepItem.updated_at));
    assert.ok(prepFilters.some(([key, value]) => key === "playground_last_attempt_at" && value === "2026-10-26T00:00:01Z"));
    staleFinish = true; prepCalls = 0;
    assert.equal((await prepRoute.POST(req())).status, 409); assert.equal(prepCalls, 1);
    staleFinish = false;
    prepItem = { ...prepItem, playground_preparation_status: "ready", msav_profile: { roles: ["object"], traits: [], singleCardType: "word" } };
    prepCalls = 0; prepReservations = 0;
    assert.equal((await prepRoute.POST(req())).status, 200); assert.equal(prepCalls, 0); assert.equal(prepReservations, 0);
    prepItem = { ...prepItem, playground_preparation_status: "pending", msav_profile: null };
    delete process.env.GEMINI_MSAV_API_KEY;
    assert.equal((await prepRoute.POST(req())).status, 503); assert.equal(prepReservations, 0);
  } finally { globalThis.fetch = oldFetch; if (oldKey === undefined) delete process.env.GEMINI_MSAV_API_KEY; else process.env.GEMINI_MSAV_API_KEY = oldKey; }
});
