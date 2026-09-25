// Create, edit, and delete activities against the LIVE Supabase project, signed in as test accounts.
// Run with: npm run test:activities:db
//
// Needs in .env.local (make the accounts in Admin, Accounts; never use a real teacher's login):
//   TEST_TEACHER_EMAIL, TEST_TEACHER_PASSWORD     required, role teacher
//   TEST_TEACHER2_EMAIL, TEST_TEACHER2_PASSWORD   optional, a second teacher (sharing cases)
//   TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD         optional, role admin (admin is view only)
// Everything it makes is titled "[TEST]" with an id starting "test-activity-", and is deleted at the end,
// also when a test fails. Uses the real app code in src/lib/supabase/activity-records.ts.
import assert from "node:assert/strict";
import fs from "node:fs";
import { after, before, test } from "node:test";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^["']|["']$/g, "")])
  );
}

const env = { ...readEnvFile(".env.local"), ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key || !env.TEST_TEACHER_EMAIL || !env.TEST_TEACHER_PASSWORD) {
  console.error(
    "Missing settings. Add NEXT_PUBLIC_SUPABASE_URL, the anon key, TEST_TEACHER_EMAIL and TEST_TEACHER_PASSWORD to .env.local."
  );
  process.exit(1);
}

const compiled = ts.transpileModule(fs.readFileSync("src/lib/supabase/activity-records.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText;
const records = {};
new Function("exports", "require", compiled)(records, () => {
  throw new Error("activity-records.ts must not have runtime imports");
});
const { insertActivityRecord, updateActivityRecord, deleteActivityRecord } = records;

const runId = `test-activity-${Date.now()}`;
const accounts = {};
let cards = [];

async function signIn(email, password, expectedRole) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign in failed for ${email}: ${error.message}`);
  const { data: profile } = await client.from("profiles").select("role,status").eq("id", data.user.id).maybeSingle();
  assert.equal(profile?.role, expectedRole, `${email} should be a ${expectedRole}, found ${profile?.role ?? "no profile"}`);
  assert.equal(profile?.status, "active", `${email} is not active`);
  return { client, id: data.user.id };
}

function makeActivity(type, owner, { visibility = "shared", suffix = type, pick = cards.slice(0, 3) } = {}) {
  const id = `${runId}-${suffix}`;
  const usesIds = type !== "fill-blank";
  return {
    id,
    title: `[TEST] ${type} ${suffix}`,
    type,
    prompt: "Test activity.",
    learningItemIds: pick.map((card) => card.id),
    visibility,
    createdBy: owner.id,
    questions: pick.map((card, index) => {
      const answer = usesIds ? card.id : card.label;
      const others = cards.filter((other) => other.id !== card.id).slice(0, 2).map((other) => (usesIds ? other.id : other.label));
      return {
        id: `${id}-q${index}`,
        prompt: type === "fill-blank" ? `[TEST] Fill ____ here.` : card.label,
        answer,
        options: [answer, ...others],
        learningItemId: card.id
      };
    })
  };
}

async function readActivity(client, id) {
  const { data: row } = await client.from("activities").select("*").eq("id", id).maybeSingle();
  const { data: items } = await client.from("activity_items").select("*").eq("activity_id", id).order("position");
  return { row, items: items ?? [] };
}

before(async () => {
  accounts.teacher = await signIn(env.TEST_TEACHER_EMAIL, env.TEST_TEACHER_PASSWORD, "teacher");
  if (env.TEST_TEACHER2_EMAIL && env.TEST_TEACHER2_PASSWORD) {
    accounts.teacher2 = await signIn(env.TEST_TEACHER2_EMAIL, env.TEST_TEACHER2_PASSWORD, "teacher");
  }
  if (env.TEST_ADMIN_EMAIL && env.TEST_ADMIN_PASSWORD) {
    accounts.admin = await signIn(env.TEST_ADMIN_EMAIL, env.TEST_ADMIN_PASSWORD, "admin");
  }

  const { data, error } = await accounts.teacher.client
    .from("learning_items")
    .select("id,label")
    .eq("content_type", "pecs")
    .not("symbol_image_url", "is", null)
    .limit(5);
  if (error) throw new Error(`Could not read PECS cards: ${error.message}`);
  cards = data ?? [];
  assert.ok(cards.length >= 4, "Need at least 4 PECS cards with pictures in the live project");
});

after(async () => {
  const owners = [accounts.teacher, accounts.teacher2].filter(Boolean);
  for (const owner of owners) {
    await owner.client.from("activities").delete().like("id", "test-activity-%").eq("created_by", owner.id);
    await owner.client.from("activity_prompt_templates").delete().eq("created_by", owner.id).like("prompt", "[TEST]%");
  }
  const { data: leftovers } = await accounts.teacher.client.from("activities").select("id").like("id", `${runId}%`);
  if (leftovers?.length) console.warn(`Could not clean up: ${leftovers.map((row) => row.id).join(", ")}`);
  await Promise.all(Object.values(accounts).map((account) => account.client.auth.signOut()));
});

const types = ["match-word-symbol", "choose-correct-symbol", "fill-blank", "drag-drop-symbol"];

test("1. a teacher creates a shared activity of each type, with its questions in order", async () => {
  for (const type of types) {
    const activity = makeActivity(type, accounts.teacher);
    await insertActivityRecord(accounts.teacher.client, activity);
    const { row, items } = await readActivity(accounts.teacher.client, activity.id);
    assert.ok(row, `${type}: activity row missing`);
    assert.equal(row.type, type);
    assert.equal(row.visibility, "shared");
    assert.equal(items.length, activity.questions.length, `${type}: question count`);
    items.forEach((item, index) => {
      assert.equal(item.position, index);
      assert.equal(item.answer, activity.questions[index].answer);
      assert.ok(item.options.includes(item.answer), `${type}: answer missing from options`);
    });
  }
});

test("2. a private activity is hidden from other teachers but visible to admins", async (t) => {
  const activity = makeActivity("match-word-symbol", accounts.teacher, { visibility: "private", suffix: "private" });
  await insertActivityRecord(accounts.teacher.client, activity);
  assert.ok((await readActivity(accounts.teacher.client, activity.id)).row, "owner cannot see own private activity");

  if (!accounts.teacher2) return t.skip("TEST_TEACHER2 not set");
  assert.equal((await readActivity(accounts.teacher2.client, activity.id)).row, null, "teacher 2 can see a private activity");
  if (accounts.admin) {
    assert.ok((await readActivity(accounts.admin.client, activity.id)).row, "admin cannot see a private activity");
  }
});

test("3. editing the title and removing a card replaces the questions", async () => {
  const before = makeActivity("choose-correct-symbol", accounts.teacher, { suffix: "edit" });
  await insertActivityRecord(accounts.teacher.client, before);

  const pick = cards.slice(0, 2);
  const edited = {
    ...makeActivity("choose-correct-symbol", accounts.teacher, { suffix: "edit", pick }),
    title: "[TEST] edited title",
    questions: makeActivity("choose-correct-symbol", accounts.teacher, { suffix: "edit-v2", pick }).questions
  };
  await updateActivityRecord(accounts.teacher.client, edited, before);

  const { row, items } = await readActivity(accounts.teacher.client, before.id);
  assert.equal(row.title, "[TEST] edited title");
  assert.deepEqual(row.learning_item_ids, pick.map((card) => card.id));
  assert.deepEqual(items.map((item) => item.id), edited.questions.map((question) => question.id));
});

test("4. another teacher can edit a shared activity", async (t) => {
  if (!accounts.teacher2) return t.skip("TEST_TEACHER2 not set");
  const original = makeActivity("fill-blank", accounts.teacher, { suffix: "shared-edit" });
  await insertActivityRecord(accounts.teacher.client, original);
  await updateActivityRecord(accounts.teacher2.client, { ...original, title: "[TEST] edited by teacher 2" }, original);
  const { row } = await readActivity(accounts.teacher.client, original.id);
  assert.equal(row.title, "[TEST] edited by teacher 2");
  assert.equal(row.created_by, accounts.teacher.id, "the owner must not change");
});

test("5. another teacher cannot edit or delete a private activity", async (t) => {
  if (!accounts.teacher2) return t.skip("TEST_TEACHER2 not set");
  const original = makeActivity("match-word-symbol", accounts.teacher, { visibility: "private", suffix: "private-guard" });
  await insertActivityRecord(accounts.teacher.client, original);

  await assert.rejects(
    updateActivityRecord(accounts.teacher2.client, { ...original, title: "[TEST] hijacked" }, original),
    new RegExp(records.ACTIVITY_CHANGE_REFUSED.slice(0, 30))
  );
  await assert.rejects(deleteActivityRecord(accounts.teacher2.client, original.id), /can't delete/);
  const { row, items } = await readActivity(accounts.teacher.client, original.id);
  assert.equal(row.title, original.title);
  assert.equal(items.length, original.questions.length);
});

test("6. an admin cannot create, edit, or delete activities", async (t) => {
  if (!accounts.admin) return t.skip("TEST_ADMIN not set");
  const adminActivity = makeActivity("match-word-symbol", accounts.admin, { suffix: "admin" });
  await assert.rejects(insertActivityRecord(accounts.admin.client, adminActivity));
  assert.equal((await readActivity(accounts.admin.client, adminActivity.id)).row, null, "admin created an activity");

  const original = makeActivity("match-word-symbol", accounts.teacher, { suffix: "admin-guard" });
  await insertActivityRecord(accounts.teacher.client, original);
  await assert.rejects(updateActivityRecord(accounts.admin.client, { ...original, title: "[TEST] admin edit" }, original));
  await assert.rejects(deleteActivityRecord(accounts.admin.client, original.id));
  const { row, items } = await readActivity(accounts.teacher.client, original.id);
  assert.equal(row.title, original.title);
  assert.equal(items.length, original.questions.length);
});

test("7. deleting an activity also deletes its questions", async () => {
  const activity = makeActivity("drag-drop-symbol", accounts.teacher, { suffix: "delete" });
  await insertActivityRecord(accounts.teacher.client, activity);
  await deleteActivityRecord(accounts.teacher.client, activity.id);
  const { row, items } = await readActivity(accounts.teacher.client, activity.id);
  assert.equal(row, null);
  assert.equal(items.length, 0);
});

test("8. a failed question save leaves no half-made activity", async () => {
  const activity = makeActivity("match-word-symbol", accounts.teacher, { suffix: "bad-card" });
  activity.questions[0] = { ...activity.questions[0], learningItemId: "no-such-card" };
  await assert.rejects(insertActivityRecord(accounts.teacher.client, activity));
  assert.equal((await readActivity(accounts.teacher.client, activity.id)).row, null);
});

test("9. a remembered question is saved once per teacher, type, and card", async () => {
  const card = cards[0];
  const row = (prompt) => ({
    id: `prompt:${accounts.teacher.id}:fill-blank:${card.id}`,
    activity_type: "fill-blank",
    learning_item_id: card.id,
    prompt,
    source: "manual",
    created_by: accounts.teacher.id,
    is_default: false,
    updated_at: new Date().toISOString()
  });
  const options = { onConflict: "created_by,activity_type,learning_item_id" };

  const { data: existing } = await accounts.teacher.client.from("activity_prompt_templates").select("*").eq("created_by", accounts.teacher.id).eq("activity_type", "fill-blank").eq("learning_item_id", card.id);
  if (existing?.length && !existing[0].prompt.startsWith("[TEST]")) {
    return; // The test teacher already saved a real question for this card; leave it alone.
  }

  for (const prompt of ["[TEST] First ____ one.", "[TEST] Second ____ one."]) {
    const { error } = await accounts.teacher.client.from("activity_prompt_templates").upsert(row(prompt), options).select();
    assert.equal(error, null, error?.message);
  }
  const { data } = await accounts.teacher.client
    .from("activity_prompt_templates")
    .select("prompt")
    .eq("created_by", accounts.teacher.id)
    .eq("activity_type", "fill-blank")
    .eq("learning_item_id", card.id);
  assert.equal(data.length, 1);
  assert.equal(data[0].prompt, "[TEST] Second ____ one.");
});
