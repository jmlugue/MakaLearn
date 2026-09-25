// Whole-app check against the LIVE Supabase project, signed in as the test accounts in .env.local
// (TEST_TEACHER_*, TEST_TEACHER2_*, TEST_ADMIN_*). Runs the app's real data code (app-data.ts, media.ts,
// audit-logs.ts) with each account's login, and calls the admin and AI routes on the running dev server.
// Run with: npm run test:app:db   (the dev server must be running on http://localhost:3000)
//
// Everything it makes is named "[TEST]" with ids starting "test-app-", and is removed at the end.
// Admin account actions only touch TEST_TEACHER2 and always put it back. Creating a new account is
// skipped unless TEST_CREATE_ACCOUNT=1 (it leaves a deactivated "[TEST]" account behind).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { after, before, test } from "node:test";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const { createClient } = nodeRequire("@supabase/supabase-js");
const { createServerClient } = nodeRequire("@supabase/ssr");

// ---------- settings ----------
function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(([, name, value]) => [name, value.replace(/^["']|["']$/g, "")])
  );
}
const env = { ...readEnvFile(".env.local"), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const appUrl = env.TEST_APP_URL || "http://localhost:3000";
for (const name of ["TEST_TEACHER", "TEST_TEACHER2", "TEST_ADMIN"]) {
  if (!env[`${name}_EMAIL`] || !env[`${name}_PASSWORD`]) {
    console.error(`Missing ${name}_EMAIL or ${name}_PASSWORD in .env.local.`);
    process.exit(1);
  }
}

// ---------- load the app's TypeScript with a swappable Supabase client ----------
const root = process.cwd();
const current = { client: null };
const stubs = {
  "@/lib/supabase/client": {
    getSupabaseBrowserClient: () => current.client,
    isSupabaseConfigured: () => true,
    supabaseUrl: url,
    supabasePublishableKey: key
  }
};
const cache = new Map();
function resolveFile(spec, fromDir) {
  const base = spec.startsWith("@/") ? path.join(root, "src", spec.slice(2)) : spec.startsWith(".") ? path.resolve(fromDir, spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve ${spec} from ${fromDir}`);
}
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  if (file.endsWith(".json")) {
    module.exports = JSON.parse(fs.readFileSync(file, "utf8"));
    return module.exports;
  }
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const localRequire = (spec) => {
    if (spec in stubs) return stubs[spec];
    const resolved = resolveFile(spec, path.dirname(file));
    return resolved ? load(resolved) : nodeRequire(spec);
  };
  new Function("exports", "require", "module", code)(module.exports, localRequire, module);
  return module.exports;
}
const app = load(path.join(root, "src/lib/supabase/app-data.ts"));
const media = load(path.join(root, "src/lib/supabase/media.ts"));
const audit = load(path.join(root, "src/lib/audit-logs.ts"));

// ---------- accounts ----------
const run = `test-app-${Date.now()}`;
const accounts = {};
const cleanups = [];

async function signIn(prefix, expectedRole) {
  const email = env[`${prefix}_EMAIL`];
  const password = env[`${prefix}_PASSWORD`];
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${prefix} could not sign in: ${error.message}`);
  const { data: profile, error: profileError } = await client.from("profiles").select("*").eq("id", data.user.id).single();
  if (profileError) throw new Error(`${prefix} profile could not be read: ${profileError.message}`);
  return { client, id: data.user.id, profile, email, password, expectedRole };
}

/** Run app code as one account. */
async function as(account, fn) {
  current.client = account.client;
  return fn();
}

/** Cookie header for the dev server, signed in as one account (same cookies the browser would send). */
async function sessionCookie(account) {
  const jar = new Map();
  const server = createServerClient(url, key, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name)))
    }
  });
  const { error } = await server.auth.signInWithPassword({ email: account.email, password: account.password });
  if (error) throw new Error(error.message);
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function callRoute(route, account, body) {
  const response = await fetch(`${appUrl}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: account ? await sessionCookie(account) : "" },
    body: JSON.stringify(body)
  });
  let json = {};
  try {
    json = await response.json();
  } catch {
    // Not JSON.
  }
  return { status: response.status, json };
}

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const testFile = (name = "test.png") => new File([png], name, { type: "image/png" });

function material(owner, suffix, categoryId) {
  return {
    id: `${run}-item-${suffix}`,
    contentType: "pecs",
    label: `[TEST] Card ${suffix}`,
    categoryId,
    description: "Automated check.",
    instruction: "",
    tags: [],
    createdBy: owner.id,
    updatedAt: new Date().toISOString()
  };
}

function lesson(owner, suffix, itemIds, visibility = "shared") {
  return {
    id: `${run}-lesson-${suffix}`,
    title: `[TEST] Lesson ${suffix}`,
    objective: "Automated check.",
    learningItemIds: itemIds,
    instructions: "",
    activityType: "match-word-symbol",
    estimatedDuration: 10,
    notes: "",
    source: "manual",
    visibility,
    createdBy: owner.id
  };
}

async function exists(client, table, id) {
  const { data } = await client.from(table).select("id").eq("id", id).maybeSingle();
  return Boolean(data);
}

before(async () => {
  accounts.teacher = await signIn("TEST_TEACHER", "teacher");
  accounts.teacher2 = await signIn("TEST_TEACHER2", "teacher");
  accounts.admin = await signIn("TEST_ADMIN", "admin");
});

after(async () => {
  for (const cleanup of cleanups.reverse()) {
    try {
      await cleanup();
    } catch (error) {
      console.warn(`Cleanup step failed: ${error.message}`);
    }
  }
  // Safety net: anything this run left behind.
  for (const owner of [accounts.teacher, accounts.teacher2].filter(Boolean)) {
    const { client } = owner;
    const { data: assets } = await client.from("media_assets").select("id,bucket,storage_path").like("related_item_id", `${run}%`);
    for (const asset of assets ?? []) {
      await client.storage.from(asset.bucket).remove([asset.storage_path]);
      await client.from("media_assets").delete().eq("id", asset.id);
    }
    await client.from("lessons").delete().like("id", `${run}%`);
    await client.from("learning_items").delete().like("id", `${run}%`);
    await client.from("categories").delete().like("id", `${run}%`);
  }
  const { data: left } = await accounts.admin.client.from("learning_items").select("id").like("id", `${run}%`);
  if (left?.length) console.warn(`Left behind: ${left.map((row) => row.id).join(", ")}`);
});

// ---------- 1. Sign in ----------
test("1.1 each test account signs in with the right role and is active", () => {
  for (const account of Object.values(accounts)) {
    assert.equal(account.profile.role, account.expectedRole, `${account.email} role`);
    assert.equal(account.profile.status, "active", `${account.email} status`);
  }
});

test("1.2 a wrong password is refused", async () => {
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: accounts.teacher.email, password: "wrong-password-123" });
  assert.ok(error, "wrong password was accepted");
});

// ---------- 2. Loading the app ----------
test("2.1 teacher loads all app data", async () => {
  const data = await as(accounts.teacher, () => app.fetchMakaLearnData());
  assert.ok(data.learningItems.length > 0, "no materials");
  assert.ok(data.categories.length > 0, "no categories");
});

test("2.2 admin loads all app data, including every teacher's", async () => {
  const data = await as(accounts.admin, () => app.fetchMakaLearnData());
  assert.ok(data.users.length >= 3, "admin should see all accounts");
});

test("2.3 a teacher only sees accounts they are allowed to see", async () => {
  const data = await as(accounts.teacher, () => app.fetchMakaLearnData());
  assert.ok(data.users.some((user) => user.id === accounts.teacher.id), "teacher cannot see own profile");
});

// ---------- 3. Categories ----------
const category = () => ({ id: `${run}-cat`, name: `[TEST] Category ${run.slice(-5)}`, description: "", color: "#dbeafe", createdBy: accounts.teacher.id });

test("3.1 teacher creates, renames, and deletes a category", async () => {
  const created = await as(accounts.teacher, () => app.insertCategory(category()));
  assert.equal(created.id, `${run}-cat`);
  const renamed = await as(accounts.teacher, () => app.updateCategoryDetails({ ...category(), name: `[TEST] Renamed ${run.slice(-5)}` }));
  assert.match(renamed.name, /Renamed/);
  await as(accounts.teacher, () => app.deleteCategory(`${run}-cat`));
  assert.equal(await exists(accounts.admin.client, "categories", `${run}-cat`), false);
});

test("3.2 admin cannot create a category", async () => {
  await assert.rejects(as(accounts.admin, () => app.insertCategory({ ...category(), id: `${run}-cat-admin`, createdBy: accounts.admin.id })));
});

// ---------- 4. Materials ----------
let categoryId = "";
test("4.0 set up a category for materials", async () => {
  categoryId = `${run}-cat-materials`;
  await as(accounts.teacher, () => app.insertCategory({ ...category(), id: categoryId, name: `[TEST] Materials ${run.slice(-5)}` }));
});

test("4.1 teacher creates and edits a material", async () => {
  const item = material(accounts.teacher, "a", categoryId);
  await as(accounts.teacher, () => app.insertLearningItem(item));
  const edited = await as(accounts.teacher, () => app.updateLearningItemDetails({ ...item, description: "Edited." }));
  assert.equal(edited.description, "Edited.");
});

test("4.2 another teacher can edit a shared material", async () => {
  const item = material(accounts.teacher, "a", categoryId);
  const edited = await as(accounts.teacher2, () => app.updateLearningItemDetails({ ...item, description: "Edited by teacher 2." }));
  assert.equal(edited.description, "Edited by teacher 2.");
});

test("4.3 admin cannot create or edit a material", async () => {
  await assert.rejects(as(accounts.admin, () => app.insertLearningItem(material(accounts.admin, "admin", categoryId))));
  const item = material(accounts.teacher, "a", categoryId);
  await assert.rejects(as(accounts.admin, () => app.updateLearningItemDetails({ ...item, description: "Admin edit." })));
});

// ---------- 5. Media ----------
test("5.1 teacher uploads a picture, attaches it, and unlinks it", async () => {
  const itemId = `${run}-item-a`;
  const asset = await as(accounts.teacher, () =>
    media.uploadMediaAssetToSupabase({ file: testFile(), bucket: "symbol-images", type: "symbol-image", title: "[TEST] picture", uploadedBy: accounts.teacher.id, relatedItemId: itemId })
  );
  assert.ok(asset.publicUrl, "no public URL");
  await as(accounts.teacher, () => app.updateLearningItemMedia(itemId, asset));
  const { data: attached } = await accounts.teacher.client.from("learning_items").select("symbol_image_url").eq("id", itemId).single();
  assert.equal(attached.symbol_image_url, asset.publicUrl);
  const response = await fetch(asset.publicUrl);
  assert.equal(response.status, 200, "uploaded picture cannot be opened");
  await as(accounts.teacher, () => app.detachLearningItemMedia(itemId, "symbol-image"));
  const { data: detached } = await accounts.teacher.client.from("learning_items").select("symbol_image_url").eq("id", itemId).single();
  assert.equal(detached.symbol_image_url, null);
});

test("5.2 teacher deletes a media file from the Media tab (row and stored file)", async () => {
  const asset = await as(accounts.teacher, () =>
    media.uploadMediaAssetToSupabase({ file: testFile("delete-me.png"), bucket: "symbol-images", type: "symbol-image", title: "[TEST] delete me", uploadedBy: accounts.teacher.id, relatedItemId: `${run}-item-a` })
  );
  await as(accounts.teacher, () => media.deleteMediaAssetFromSupabase(asset));
  assert.equal(await exists(accounts.teacher.client, "media_assets", asset.id), false, "row still there");
  const folder = path.posix.dirname(asset.storagePath);
  const { data: files } = await accounts.teacher.client.storage.from("symbol-images").list(folder);
  assert.ok(!(files ?? []).some((file) => asset.storagePath.endsWith(file.name)), "stored file still there");
});

test("5.3 an oversized file is refused before uploading", async () => {
  const big = new File([new Uint8Array(11 * 1024 * 1024)], "big.png", { type: "image/png" });
  await assert.rejects(
    as(accounts.teacher, () => media.uploadMediaAssetToSupabase({ file: big, bucket: "symbol-images", type: "symbol-image", title: "[TEST] big", uploadedBy: accounts.teacher.id })),
    /limit/
  );
});

test("5.4 admin cannot upload media", async () => {
  await assert.rejects(
    as(accounts.admin, () => media.uploadMediaAssetToSupabase({ file: testFile(), bucket: "symbol-images", type: "symbol-image", title: "[TEST] admin", uploadedBy: accounts.admin.id, relatedItemId: `${run}-item-a` }))
  );
});

test("5.5 deleting a material with 'also delete its media' removes its files", async () => {
  const item = material(accounts.teacher, "b", categoryId);
  await as(accounts.teacher, () => app.insertLearningItem(item));
  const asset = await as(accounts.teacher, () =>
    media.uploadMediaAssetToSupabase({ file: testFile(), bucket: "symbol-images", type: "symbol-image", title: "[TEST] with material", uploadedBy: accounts.teacher.id, relatedItemId: item.id })
  );
  await as(accounts.teacher, () => app.deleteLearningItem(item.id, true));
  assert.equal(await exists(accounts.teacher.client, "learning_items", item.id), false, "material still there");
  assert.equal(await exists(accounts.teacher.client, "media_assets", asset.id), false, "media row still there");
  const { data: files } = await accounts.teacher.client.storage.from("symbol-images").list(item.id);
  assert.equal((files ?? []).length, 0, "stored file still there");
});

// ---------- 6. Lessons ----------
test("6.1 teacher creates, edits, and deletes a shared lesson", async () => {
  const item2 = material(accounts.teacher, "c", categoryId);
  await as(accounts.teacher, () => app.insertLearningItem(item2));
  const first = lesson(accounts.teacher, "shared", [`${run}-item-a`, item2.id]);
  await as(accounts.teacher, () => app.insertLesson(first));
  const { data: items } = await accounts.teacher.client.from("lesson_items").select("*").eq("lesson_id", first.id);
  assert.equal(items.length, 2, "lesson cards not saved");

  const edited = { ...first, title: "[TEST] Lesson edited", learningItemIds: [`${run}-item-a`] };
  await as(accounts.teacher, () => app.updateLesson(edited, first));
  const { data: row } = await accounts.teacher.client.from("lessons").select("title").eq("id", first.id).single();
  assert.equal(row.title, "[TEST] Lesson edited");
  const { data: after } = await accounts.teacher.client.from("lesson_items").select("*").eq("lesson_id", first.id);
  assert.equal(after.length, 1, "removed card still in lesson");

  await as(accounts.teacher, () => app.deleteLesson(first.id));
  assert.equal(await exists(accounts.teacher.client, "lessons", first.id), false);
});

test("6.2 a private lesson is hidden from other teachers, and they cannot delete it", async () => {
  const privateLesson = lesson(accounts.teacher, "private", [`${run}-item-a`], "private");
  await as(accounts.teacher, () => app.insertLesson(privateLesson));
  assert.equal(await exists(accounts.teacher2.client, "lessons", privateLesson.id), false, "teacher 2 can see it");
  assert.equal(await exists(accounts.admin.client, "lessons", privateLesson.id), true, "admin cannot see it");
  await assert.rejects(as(accounts.teacher2, () => app.deleteLesson(privateLesson.id)));
  assert.equal(await exists(accounts.teacher.client, "lessons", privateLesson.id), true, "private lesson was deleted");
  await as(accounts.teacher, () => app.deleteLesson(privateLesson.id));
});

test("6.3 admin cannot create a lesson", async () => {
  await assert.rejects(as(accounts.admin, () => app.insertLesson(lesson(accounts.admin, "admin", [`${run}-item-a`]))));
});

// ---------- 7. Settings ----------
for (const who of ["teacher", "admin"]) {
  test(`7.${who === "teacher" ? 1 : 2} ${who} saves and reads own settings`, async () => {
    const account = accounts[who];
    const existing = await as(account, () => app.fetchUserSettings(account.id));
    const settings = existing ?? {
      userId: account.id, largeText: false, highContrast: false, reduceMotion: false, audioGuidance: true, theme: "light", guideMode: true, guideSeen: []
    };
    const saved = await as(account, () => app.upsertUserSettings({ ...settings, userId: account.id }));
    assert.equal(saved.userId, account.id);
  });
}

// ---------- 8. Profile ----------
test("8.1 teacher changes own name (then back)", async () => {
  const { name, email } = accounts.teacher.profile;
  const renamed = await as(accounts.teacher, () => app.updateProfileDetails(accounts.teacher.id, { name: `${name} (test)`, email }));
  assert.equal(renamed.name, `${name} (test)`);
  await as(accounts.teacher, () => app.updateProfileDetails(accounts.teacher.id, { name, email }));
});

test("8.2 teacher cannot make themselves an admin", async () => {
  await assert.rejects(as(accounts.teacher, () => app.updateProfileRole(accounts.teacher.id, "admin")));
  const { data } = await accounts.admin.client.from("profiles").select("role").eq("id", accounts.teacher.id).single();
  assert.equal(data.role, "teacher");
});

test("8.3 teacher cannot edit another person's profile", async () => {
  const { name, email } = accounts.teacher2.profile;
  await assert.rejects(as(accounts.teacher, () => app.updateProfileDetails(accounts.teacher2.id, { name: "Hijacked", email })));
  const { data } = await accounts.admin.client.from("profiles").select("name").eq("id", accounts.teacher2.id).single();
  assert.equal(data.name, name);
});

// ---------- 9. Activity log ----------
test("9.1 teacher actions are logged, and only admins can read the log", async () => {
  const log = await as(accounts.teacher, () =>
    audit.insertAuditLog({ category: "content", action: "create", actor: accounts.teacher.profile, targetType: "test", targetTitle: "[TEST] automated check" })
  );
  assert.ok(log.id);
  const teacherView = await as(accounts.teacher, () => audit.fetchAuditLogs({ limit: 5 }));
  assert.ok(!teacherView.some((entry) => entry.id === log.id && entry.actorId !== accounts.teacher.id), "teacher reads others' logs");
  const adminView = await as(accounts.admin, () => audit.fetchAuditLogs({ limit: 20 }));
  assert.ok(adminView.some((entry) => entry.id === log.id), "admin cannot see the new log");
});

// ---------- 10. Admin account actions (dev server) ----------
test("10.1 admin deactivates and reactivates an account", async () => {
  cleanups.push(() => callRoute("/api/admin/account-status", accounts.admin, { userId: accounts.teacher2.id, status: "active" }));
  const off = await callRoute("/api/admin/account-status", accounts.admin, { userId: accounts.teacher2.id, status: "deactivated" });
  assert.equal(off.status, 200, off.json.error);
  const on = await callRoute("/api/admin/account-status", accounts.admin, { userId: accounts.teacher2.id, status: "active" });
  assert.equal(on.status, 200, on.json.error);
});

test("10.2 admin changes an account's role (then back)", async () => {
  cleanups.push(() => callRoute("/api/admin/change-role", accounts.admin, { userId: accounts.teacher2.id, role: "teacher" }));
  const up = await callRoute("/api/admin/change-role", accounts.admin, { userId: accounts.teacher2.id, role: "admin" });
  assert.equal(up.status, 200, up.json.error);
  const down = await callRoute("/api/admin/change-role", accounts.admin, { userId: accounts.teacher2.id, role: "teacher" });
  assert.equal(down.status, 200, down.json.error);
});

test("10.3 admin resets a teacher's password", async () => {
  const reset = await callRoute("/api/admin/reset-password", accounts.admin, { userId: accounts.teacher2.id, password: accounts.teacher2.password });
  assert.equal(reset.status, 200, reset.json.error);
  await signIn("TEST_TEACHER2", "teacher");
});

test("10.4 a teacher cannot use admin actions", async () => {
  const attempt = await callRoute("/api/admin/account-status", accounts.teacher, { userId: accounts.teacher2.id, status: "deactivated" });
  assert.equal(attempt.status, 403);
});

test("10.5 admin creates an admin account", { skip: env.TEST_CREATE_ACCOUNT !== "1" && "set TEST_CREATE_ACCOUNT=1 to run" }, async () => {
  const email = `test-created-${Date.now()}@example.com`;
  const created = await callRoute("/api/admin/create-teacher", accounts.admin, {
    name: "[TEST] Created account", email, role: "admin", password: `Tmp-${Math.random().toString(36).slice(2)}-9`
  });
  const { data: profile } = await accounts.admin.client.from("profiles").select("id,role,status").eq("email", email).maybeSingle();
  if (profile) {
    cleanups.push(() => callRoute("/api/admin/account-status", accounts.admin, { userId: profile.id, status: "deactivated" }));
  }
  assert.equal(created.status, 200, created.json.error);
  assert.equal(profile?.role, "admin", `created account has role ${profile?.role}`);
});

// ---------- 11. AI and gesture routes ----------
test("11.1 Draft with AI returns questions for a teacher", async () => {
  const { data: card } = await accounts.teacher.client.from("learning_items").select("id").eq("content_type", "pecs").not("symbol_image_url", "is", null).limit(1).single();
  const draft = await callRoute("/api/activity-draft", accounts.teacher, { activityType: "fill-blank", missingLearningItemIds: [card.id] });
  assert.equal(draft.status, 200, draft.json.error);
  assert.ok(Array.isArray(draft.json.suggestions), "no suggestions list");
});

test("11.2 gesture practice feedback answers", async () => {
  const feedback = await callRoute("/api/gesture-feedback", accounts.teacher, {
    selectedGestureLabel: "Hello", predictedGestureLabel: "Hello", matchPercent: 92, detectedHandCount: 1,
    expectedHandCount: 1, trackingState: "hands-visible", issueCategory: "correct"
  });
  assert.equal(feedback.status, 200, feedback.json.error);
  assert.ok(feedback.json.learnerMessage, "no learner message");
});

// ---------- 12. Pages ----------
test("12.1 every page loads", async () => {
  for (const page of ["/", "/login", "/content", "/activities", "/admin", "/settings", "/help", "/profile", "/playground", "/gesture-practice"]) {
    const response = await fetch(`${appUrl}${page}`, { redirect: "manual" });
    assert.ok([200, 307, 308].includes(response.status), `${page} returned ${response.status}`);
  }
});
