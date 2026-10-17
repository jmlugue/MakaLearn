// Focused live regression for the new data adapter. Creates only random [TEST]
// collections and removes those exact IDs. No server, paid model, or existing data edits.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

const env = { ...process.env };
for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.equal(new URL(url).hostname, "tjqwyogtawkhyviljzrr.supabase.co");
const nodeRequire = createRequire(import.meta.url);
const root = process.cwd();
const current = { client: null };
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  if (file.endsWith(".json")) { module.exports = JSON.parse(fs.readFileSync(file, "utf8")); return module.exports; }
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
  }).outputText;
  const localRequire = spec => {
    if (spec === "@/lib/supabase/client") return { getSupabaseBrowserClient: () => current.client };
    const base = spec.startsWith("@/") ? path.join(root, "src", spec.slice(2))
      : spec.startsWith(".") ? path.resolve(path.dirname(file), spec) : null;
    if (!base) return nodeRequire(spec);
    const resolved = [base, `${base}.ts`, `${base}.json`, path.join(base, "index.ts")]
      .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!resolved) throw new Error(`Cannot resolve ${spec}`);
    return load(resolved);
  };
  new Function("exports", "require", "module", code)(module.exports, localRequire, module);
  return module.exports;
}
const app = load(path.join(root, "src/lib/supabase/app-data.ts"));
const accounts = {};
const testIds = [];
const signedInConfigured = ["TEST_TEACHER", "TEST_TEACHER2", "TEST_ADMIN"]
  .every(prefix => env[`${prefix}_EMAIL`] && env[`${prefix}_PASSWORD`]);
let materials;
before(async () => {
  if (!signedInConfigured) return;
  for (const [name, prefix] of [["teacher", "TEST_TEACHER"], ["other", "TEST_TEACHER2"], ["admin", "TEST_ADMIN"]]) {
    assert.ok(env[`${prefix}_EMAIL`] && env[`${prefix}_PASSWORD`], `Missing ${prefix} test account`);
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.signInWithPassword({ email: env[`${prefix}_EMAIL`], password: env[`${prefix}_PASSWORD`] });
    if (error) throw new Error(`${name} test sign-in failed: ${error.message}`);
    accounts[name] = { client, id: data.user.id };
  }
  current.client = accounts.teacher.client;
  const data = await app.fetchMakaLearnData();
  materials = data.learningItems.filter(item => item.contentType === "pecs").slice(0, 2);
  assert.equal(materials.length, 2);
});
after(async () => {
  current.client = accounts.teacher?.client;
  for (const id of testIds) {
    const { error } = await current.client.from("collections").delete().eq("id", id);
    if (error) throw new Error(`Test cleanup failed: ${error.message}`);
    const { data, error: readError } = await current.client.from("collections").select("id").eq("id", id);
    if (readError) throw readError;
    assert.equal(data.length, 0, "Test collection was not removed");
  }
  for (const account of Object.values(accounts)) await account.client.auth.signOut({ scope: "local" });
});
function collection(visibility = "private") {
  const id = `test-readiness-${randomUUID()}`;
  testIds.push(id);
  return { id, title: "[TEST] Collection readiness", objective: "Verify persistence", instructions: "Test only",
    activityType: "match-word-symbol", estimatedDuration: 5, notes: "", source: "manual", visibility,
    createdBy: accounts.teacher.id, learningItemIds: materials.map(item => item.id) };
}
test("teacher and admin load current app data without learner dependencies", { skip: !signedInConfigured }, async () => {
  for (const account of [accounts.teacher, accounts.admin]) {
    current.client = account.client;
    const data = await app.fetchMakaLearnData();
    assert.ok(data.learningItems.length);
    assert.ok(Array.isArray(data.collections));
    assert.equal("learners" in data, false);
  }
});
test("Collection create, reorder through upsert RPC, remove a material, and legacy reads agree", { skip: !signedInConfigured }, async () => {
  current.client = accounts.teacher.client;
  const original = collection();
  const saved = await app.insertCollection(original);
  assert.deepEqual(saved.learningItemIds, original.learningItemIds);
  const reordered = { ...saved, learningItemIds: [...saved.learningItemIds].reverse() };
  await app.updateCollection(reordered, saved);
  const loaded = (await app.fetchMakaLearnData()).collections.find(c => c.id === saved.id);
  assert.deepEqual(loaded.learningItemIds, reordered.learningItemIds);
  const shortened = { ...reordered, learningItemIds: [reordered.learningItemIds[0]] };
  await app.updateCollection(shortened, reordered);
  const { data: legacy, error } = await current.client.from("lesson_items").select("learning_item_id").eq("lesson_id", saved.id);
  if (error) throw error;
  assert.deepEqual(legacy.map(row => row.learning_item_id), shortened.learningItemIds);
  current.client = accounts.other.client;
  assert.ok(!(await app.fetchMakaLearnData()).collections.some(c => c.id === saved.id));
  await assert.rejects(app.deleteCollection(saved.id));
  current.client = accounts.admin.client;
  assert.ok((await app.fetchMakaLearnData()).collections.some(c => c.id === saved.id));
  await assert.rejects(app.insertCollection({ ...collection(), createdBy: accounts.admin.id }));
  const { error: rpcError } = await current.client.rpc("upsert_collection_items", { items: [] });
  assert.ok(rpcError, "View-only admin must not modify collection items through RPC");
  current.client = accounts.teacher.client;
  await app.deleteCollection(saved.id);
});
test("legacy learner and attempt endpoints stay empty for signed-in users", { skip: !signedInConfigured }, async () => {
  for (const table of ["learners", "practice_attempts"]) {
    const { data, error } = await accounts.teacher.client.from(table).select("*");
    if (error) throw error;
    assert.deepEqual(data, []);
  }
});
test("anonymous Collection access is denied", async () => {
  const anonymous = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await anonymous.from("collections").select("id");
  assert.ok(error);
});
test("real app adapter reads hosted Collection views and retired tables have no data", async () => {
  assert.ok(env.SUPABASE_SERVICE_ROLE_KEY, "Missing server-only key for read-only verification");
  current.client = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const data = await app.fetchMakaLearnData();
  assert.ok(data.learningItems.length);
  assert.ok(data.collections.length);
  assert.equal("learners" in data, false);
  for (const table of ["learners", "practice_attempts"]) {
    const { data, error } = await current.client.from(table).select("*");
    if (error) throw error;
    assert.deepEqual(data, []);
  }
});
