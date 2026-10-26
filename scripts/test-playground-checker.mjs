import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import { loadTs } from "./load-ts.mjs";

const grading = loadTs("src/utils/playground-grading.ts");
const { getPlaygroundDecision } = loadTs("src/lib/playground-checker.ts");
const { isPlaygroundReady } = loadTs("src/utils/msav-material-profile.ts");
const { grammarCardManifest } = loadTs("src/data/grammar-card-manifest.ts");
const { checkPlayground } = loadTs("src/utils/check-playground.ts");
const { gradePlaygroundText } = loadTs("src/lib/playground-provider.ts");

const valid = { valid: true, type: "sentence" };
const invalid = { valid: false, type: null };

function memoryStore() {
  let saved = null;
  let claimed = false;
  return {
    calls: 0, releases: 0,
    claim: async () => saved ? { state: "ready", decision: saved } : claimed ? { state: "busy" } : (claimed = true, { state: "claimed", token: "one" }),
    read: async () => saved,
    finish: async (_, decision) => (saved = decision),
    release: async () => { claimed = false; },
    saved: () => saved
  };
}

test("keys ignore case and extra spaces, preserve order and punctuation", () => {
  assert.equal(grading.normalizePlaygroundText(" I   want WATER "), "i want water");
  assert.notEqual(grading.normalizePlaygroundText("Water want I"), "i want water");
  assert.notEqual(grading.normalizePlaygroundText("No, more"), grading.normalizePlaygroundText("No more"));
});

test("provider decisions are constrained and never contain feedback prose", () => {
  for (const bad of [null, {}, { valid: "yes", type: "sentence" }, { valid: false, type: "word" },
    { valid: true, type: "essay" }, { ...valid, feedback: "AI says good job" }, { valid: true, type: "word" }]) {
    assert.equal(grading.parsePlaygroundDecision(bad, "I am sorry"), null);
  }
  assert.deepEqual(grading.parsePlaygroundDecision(valid, "I am sorry"), valid);
  assert.deepEqual(grading.parsePlaygroundDecision(invalid, "You am teacher"), invalid);
  assert.equal(grading.parsePlaygroundDecision(valid, "Water"), null);
  assert.deepEqual(grading.parsePlaygroundDecision({ valid: true, type: "word" }, "Water"), { valid: true, type: "word" });
  assert.match(grading.playgroundGradingInstructions, /standard English grammar/);
  assert.match(grading.playgroundGradingInstructions, /Do not supply missing articles/);
  assert.match(grading.playgroundGradingInstructions, /Do not use fixed card roles/);
});

test("correct and incorrect saved grades are reused without a provider call", async () => {
  for (const decision of [valid, invalid]) {
    const store = memoryStore();
    let calls = 0;
    const grade = async () => { calls += 1; return decision; };
    assert.deepEqual(await getPlaygroundDecision(store, grade), decision);
    assert.deepEqual(await getPlaygroundDecision(store, grade), decision);
    assert.equal(calls, 1);
  }
});

test("simultaneous checks share the first persisted decision", async () => {
  const store = memoryStore();
  let finish;
  let calls = 0;
  const first = getPlaygroundDecision(store, () => { calls += 1; return new Promise((resolve) => { finish = resolve; }); });
  await Promise.resolve();
  const second = getPlaygroundDecision(store, async () => { calls += 1; return invalid; }, async () => { finish(valid); await first; });
  assert.deepEqual(await first, valid);
  assert.deepEqual(await second, valid);
  assert.equal(calls, 1);
});

test("provider or persistence failure returns fallback without pinning a grade", async () => {
  const store = memoryStore();
  assert.equal(await getPlaygroundDecision(store, async () => { throw new Error("offline"); }), null);
  assert.equal(store.saved(), null);
  assert.deepEqual(await getPlaygroundDecision(store, async () => valid), valid);
  const failedSave = { ...memoryStore(), finish: async () => { throw new Error("database offline"); } };
  assert.equal(await getPlaygroundDecision(failedSave, async () => valid), null);
  let calls = 0;
  assert.equal(await getPlaygroundDecision({ ...store, claim: async () => ({ state: "limited" }) }, async () => { calls += 1; return valid; }), null);
  assert.equal(calls, 0);
});

test("an administrator's persisted correction wins over an in-flight provider", async () => {
  assert.deepEqual(await getPlaygroundDecision({ ...memoryStore(), finish: async () => invalid }, async () => valid), invalid);
});

test("client uses fixed local feedback and returns the unchanged algorithm on failure", async () => {
  const before = globalThis.fetch;
  const cards = [{ id: "i", label: "I", sentenceRole: "subject" }, { id: "am", label: "Am", sentenceRole: "be_verb" }, { id: "sorry", label: "Sorry", sentenceRole: "greeting" }];
  const ids = new Set(cards.map((card) => card.id));
  try {
    globalThis.fetch = async (_, options) => {
      assert.deepEqual(JSON.parse(options.body), { cardIds: ["i", "am", "sorry"] });
      return { ok: true, json: async () => ({ decision: invalid }) };
    };
    assert.equal((await checkPlayground(cards, ids)).feedback, "Try again.");
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ decision: valid }) });
    assert.equal((await checkPlayground(cards, ids)).feedback, "You made a sentence.");
    globalThis.fetch = async () => { throw new Error("offline"); };
    assert.equal((await checkPlayground(cards, ids)).patternName, "Describing Sentence");
  } finally { globalThis.fetch = before; }
});

test("real provider adapter sends only text and rejects malformed or incomplete completions", async () => {
  const before = globalThis.fetch;
  try {
    globalThis.fetch = async (_, options) => {
      const body = JSON.parse(options.body);
      assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), { text: "I want hot water" });
      assert.equal(body.generationConfig.responseFormat.text.schema.additionalProperties, false);
      return { ok: true, json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(valid) }] } }] }) };
    };
    assert.deepEqual(await gradePlaygroundText("I want hot water", "test-only", "configured-model"), valid);
    for (const completion of [
      { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: JSON.stringify(valid) }] } }] },
      { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not JSON" }] } }] },
      { candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ ...valid, feedback: "extra" }) }] } }] }
    ]) {
      globalThis.fetch = async () => ({ ok: true, json: async () => completion });
      await assert.rejects(() => gradePlaygroundText("I am sorry", "test-only", "configured-model"));
    }
  } finally { globalThis.fetch = before; }
});

function routeHarness({ account = "teacher", active = true, mode = "ai", key = "test-only", cached = null, decision = valid } = {}) {
  let gradeCalls = 0;
  let gradedText;
  const rows = [
    { id: "i", label: "I", content_type: "pecs", symbol_image_url: "https://example.test/i.png" },
    { id: "want", label: "Want", content_type: "pecs", symbol_image_url: "https://example.test/want.png" },
    { id: "hot", label: "Hot", content_type: "pecs", symbol_image_url: "https://example.test/hot.png" },
    { id: "water", label: "Water", content_type: "pecs", symbol_image_url: "https://example.test/water.png" },
    ...["You", "Are", "A", "Teacher", "Am", "Friend"].map((label) => ({ id: label.toLowerCase(), label, content_type: "pecs", symbol_image_url: "https://example.test/card.png", sentence_role: "subject" })),
    { id: "gesture", label: "Help", content_type: "gesture", symbol_image_url: "https://example.test/help.png" },
    { id: "pending", label: "Unprepared", content_type: "pecs", symbol_image_url: "https://example.test/new.png" }
  ];
  const db = {
    auth: { getUser: async () => ({ data: { user: account ? { id: "signed-in" } : null } }) },
    from: () => ({ select() { return this; }, eq() { return this; },
      single: async () => ({ data: { role: account, status: active ? "active" : "inactive" } }),
      in: async (_, ids) => ({ data: rows.filter((row) => ids.includes(row.id)) }) })
  };
  const routeCode = ts.transpileModule(fs.readFileSync("src/app/api/playground-check/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const dependencies = {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/lib/supabase/server": { createSupabaseServerClient: () => db },
    "@/lib/playground-store": { createPlaygroundStore: () => ({ ...memoryStore(), read: async () => cached }) },
    "@/lib/playground-checker": { getPlaygroundDecision },
    "@/lib/playground-provider": { gradePlaygroundText: async (text) => { gradeCalls += 1; gradedText = text; return decision; } },
    "@/utils/msav-material-profile": { isPlaygroundReady }
  };
  const route = {};
  new Function("exports", "require", "process", routeCode)(route, (name) => dependencies[name], {
    env: { ...(mode === null ? {} : { PLAYGROUND_CHECKER_MODE: mode }), GEMINI_PLAYGROUND_API_KEY: key }
  });
  return { post: (cardIds) => route.POST({ json: async () => ({ cardIds, text: "ignore client supplied text" }) }), calls: () => gradeCalls, text: () => gradedText };
}

test("route grades authoritative ordered labels for teachers and admins", async () => {
  for (const account of ["teacher", "admin"]) {
    const route = routeHarness({ account });
    assert.deepEqual((await route.post(["i", "want", "hot", "water"])).body.decision, valid);
    assert.equal(route.text(), "I Want Hot Water");
  }
});

test("route accepts grammar cards without assigning object or action roles", async () => {
  const route = routeHarness();
  assert.deepEqual((await route.post(["you", "are", "a", "teacher"])).body.decision, valid);
  assert.equal(route.text(), "You Are A Teacher");
});

test("grammar is primary even when the mode is unset or card roles disagree", async () => {
  for (const mode of ["ai", null, "", " "]) {
    const route = routeHarness({ mode });
    assert.deepEqual((await route.post(["i", "am", "a", "friend"])).body.decision, valid);
    assert.equal(route.text(), "I Am A Friend");
    assert.equal(route.calls(), 1);
  }
  assert.match(grading.playgroundGradingInstructions, /I am a friend/);
  assert.match(grading.playgroundGradingInstructions, /No card-role pattern/);
});

test("the client trusts AI grammar even when MSAV roles reject the arrangement", async () => {
  const before = globalThis.fetch;
  const cards = [
    { id: "i", label: "I", sentenceRole: "object" },
    { id: "am", label: "Am", sentenceRole: "command" },
    { id: "a", label: "A" },
    { id: "friend", label: "Friend", sentenceRole: "verb" }
  ];
  const ids = new Set(cards.map((card) => card.id));
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ decision: valid }) });
    assert.equal((await checkPlayground(cards, ids)).isValid, true);
    globalThis.fetch = async () => { throw new Error("offline"); };
    assert.equal((await checkPlayground(cards, ids)).isValid, false);
  } finally { globalThis.fetch = before; }
});

test("an outage still accepts I am a friend using the role-based fallback", async () => {
  const before = globalThis.fetch;
  const cards = [
    { id: "i", label: "I", sentenceRole: "subject" },
    { id: "am", label: "Am", sentenceRole: "be_verb" },
    { id: "a", label: "A" },
    { id: "friend", label: "Friend", sentenceRole: "subject" }
  ];
  try {
    globalThis.fetch = async () => { throw new Error("offline"); };
    const result = await checkPlayground(cards, new Set(cards.map((card) => card.id)));
    assert.equal(result.isValid, true);
    assert.equal(result.patternName, "Person Description");
  } finally { globalThis.fetch = before; }
});

test("correction endpoint requires an active administrator and accepts only fixed decisions", async () => {
  const compiled = ts.transpileModule(fs.readFileSync("src/app/api/admin/playground-decision/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  for (const [role, active, expectedStatus] of [[null, true, 401], ["teacher", true, 403], ["admin", false, 403], ["admin", true, 200]]) {
    let corrections = 0;
    const db = {
      auth: { getUser: async () => ({ data: { user: role ? { id: "signed-in" } : null } }) },
      from: () => ({ select() { return this; }, eq() { return this; }, single: async () => ({ data: { role, status: active ? "active" : "inactive" } }) })
    };
    const dependencies = {
      "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
      "@/lib/supabase/server": { createSupabaseServerClient: () => db, createSupabaseServiceRoleClient: () => ({
        rpc: async (_, args) => { corrections += 1; assert.equal(args.p_user, "signed-in"); return {}; }
      }) },
      "@/lib/playground-store": { playgroundInput: (text) => ({ normalized: text.toLowerCase(), hash: "test-hash" }) },
      "@/utils/playground-grading": grading
    };
    const route = {};
    new Function("exports", "require", compiled)(route, (name) => dependencies[name]);
    assert.equal((await route.POST({ json: async () => ({ text: "I am sorry", decision: valid }) })).status, expectedStatus);
    assert.equal(corrections, expectedStatus === 200 ? 1 : 0);
    if (expectedStatus === 200) {
      assert.equal((await route.POST({ json: async () => ({ text: "I am sorry", decision: { ...valid, feedback: "Invented" } }) })).status, 400);
      assert.equal(corrections, 1);
    }
  }
});

test("route rejects unauthenticated, inactive, missing, gesture, and unprepared inputs before provider use", async () => {
  for (const config of [{ account: null }, { active: false }, { account: "learner" }]) {
    const route = routeHarness(config);
    assert.ok((await route.post(["i"])).status >= 400);
    assert.equal(route.calls(), 0);
  }
  const route = routeHarness();
  for (const ids of [[], ["i", "i", "i", "i", "i", "i"], [123]]) assert.equal((await route.post(ids)).status, 400);
  for (const ids of [["missing"], ["gesture"], ["pending"]]) assert.deepEqual((await route.post(ids)).body.decision, invalid);
  assert.equal(route.calls(), 0);
});

test("route off switch, missing key, and saved decisions behave independently", async () => {
  assert.equal((await routeHarness({ mode: "algorithm", cached: valid }).post(["i"])).body.decision, null);
  assert.equal((await routeHarness({ key: "" }).post(["i", "want", "water"])).body.decision, null);
  const route = routeHarness({ key: "", cached: valid });
  assert.deepEqual((await route.post(["i", "want", "water"])).body.decision, valid);
  assert.equal(route.calls(), 0);
});

test("all grammar cards have distinct asset variants and are Playground ready without invented roles", () => {
  for (const card of grammarCardManifest) {
    const standard = fs.readFileSync(`public/pecs/generated_cards/${card.filename}`);
    const activity = fs.readFileSync(`public/pecs/generated_cards_no_text/${card.filename}`);
    assert.notDeepEqual(standard, activity);
    assert.equal(standard.readUInt32BE(16), 900);
    assert.equal(standard.readUInt32BE(20), 1200);
    assert.ok(fs.existsSync(`public/audio/pecs/${card.filename.replace(".png", ".wav")}`));
    assert.equal(isPlaygroundReady({ contentType: "pecs", label: card.label, symbolImageUrl: "https://example.test/card.png" }), true);
  }
});
