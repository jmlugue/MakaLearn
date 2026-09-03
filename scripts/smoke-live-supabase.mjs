import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const emails = ["admin@makalearn.local", "teacher@makalearn.local"];

function loadEnvFile(fileName) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) return {};

  const env = {};
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalIndex = line.indexOf("=");
    if (equalIndex < 0) continue;

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function requireEnv(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is missing.`);
  }
  return value;
}

function redactClient(result) {
  const { client, ...safeResult } = result;
  return safeResult;
}

async function countRows(service, table) {
  const { count, error } = await service.from(table).select("id", { count: "exact", head: true });
  return error ? { table, ok: false, error: error.message } : { table, ok: true, count };
}

async function signInSmoke(url, publishableKey, password, email) {
  const client = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { email, ok: false, error: error?.message ?? "No user returned." };
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,email,role,status")
    .eq("id", data.user.id)
    .single();

  return {
    email,
    ok: !profileError,
    userId: data.user.id,
    role: profile?.role ?? null,
    status: profile?.status ?? null,
    error: profileError?.message ?? null,
    client
  };
}

async function runTeacherCrudSmoke(client, teacherId) {
  const stamp = Date.now();
  const categoryId = `smoke-cat-${stamp}`;
  const activityId = `smoke-activity-${stamp}`;
  const questionId = `smoke-question-${stamp}`;
  const steps = [];

  const { data: itemRows, error: itemRowsError } = await client
    .from("learning_items")
    .select("id,label,symbol_image_url")
    .not("symbol_image_url", "is", null)
    .limit(2);

  if (itemRowsError || !itemRows?.length) {
    return {
      skipped: true,
      reason: itemRowsError?.message ?? "No learning item with symbol media found."
    };
  }

  const categoryInsert = await client
    .from("categories")
    .insert({
      id: categoryId,
      name: `Smoke category ${stamp}`,
      description: "Smoke test category.",
      color: "#dbeafe",
      created_by: teacherId
    })
    .select("id")
    .single();
  steps.push({ step: "category insert", ok: !categoryInsert.error, error: categoryInsert.error?.message ?? null });

  const categoryUpdate = await client
    .from("categories")
    .update({ description: "Smoke test category updated." })
    .eq("id", categoryId)
    .select("id")
    .single();
  steps.push({ step: "category update", ok: !categoryUpdate.error, error: categoryUpdate.error?.message ?? null });

  const activityInsert = await client
    .from("activities")
    .insert({
      id: activityId,
      title: `Smoke activity ${stamp}`,
      type: "choose-correct-symbol",
      prompt: "Smoke test prompt.",
      learning_item_ids: itemRows.map((row) => row.id),
      visibility: "private",
      created_by: teacherId
    })
    .select("id")
    .single();
  steps.push({ step: "activity insert", ok: !activityInsert.error, error: activityInsert.error?.message ?? null });

  const firstItem = itemRows[0];
  const questionInsert = await client
    .from("activity_items")
    .insert({
      id: questionId,
      activity_id: activityId,
      prompt: `Choose ${firstItem.label}`,
      answer: firstItem.label,
      options: itemRows.map((row) => row.label),
      learning_item_id: firstItem.id,
      position: 0
    })
    .select("id")
    .single();
  steps.push({ step: "activity question insert", ok: !questionInsert.error, error: questionInsert.error?.message ?? null });

  const resultInsert = await client
    .from("activity_results")
    .insert({
      activity_id: activityId,
      learner_id: null,
      teacher_id: teacherId,
      score: 100,
      correct_count: 1,
      incorrect_count: 0,
      answers: { [questionId]: firstItem.label }
    })
    .select("id")
    .single();
  steps.push({ step: "activity result insert", ok: !resultInsert.error, error: resultInsert.error?.message ?? null });

  const activityDelete = await client.from("activities").delete().eq("id", activityId);
  steps.push({ step: "activity delete cleanup", ok: !activityDelete.error, error: activityDelete.error?.message ?? null });

  const categoryDelete = await client.from("categories").delete().eq("id", categoryId);
  steps.push({ step: "category delete cleanup", ok: !categoryDelete.error, error: categoryDelete.error?.message ?? null });

  return {
    skipped: false,
    ok: steps.every((step) => step.ok),
    steps
  };
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local") };
const url = requireEnv(env, "NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || requireEnv(env, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = requireEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
const temporaryPassword = requireEnv(env, "SUPABASE_TEMPORARY_PASSWORD");

const service = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const usersResult = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersResult.error) throw usersResult.error;

const authUsers = emails.map((email) => {
  const user = usersResult.data.users.find((candidate) => candidate.email === email);
  return {
    email,
    exists: Boolean(user),
    id: user?.id ?? null,
    confirmed: Boolean(user?.email_confirmed_at)
  };
});

const { data: profiles, error: profilesError } = await service
  .from("profiles")
  .select("id,email,role,status")
  .in("email", emails)
  .order("email");
if (profilesError) throw profilesError;

const counts = await Promise.all(
  [
    "profiles",
    "categories",
    "learners",
    "learning_items",
    "media_assets",
    "lessons",
    "activities",
    "activity_prompt_templates",
    "ai_usage_events",
    "activity_results",
    "practice_attempts"
  ].map((table) => countRows(service, table))
);

const { data: mediaRows, error: mediaRowsError } = await service
  .from("learning_items")
  .select("id,content_type,symbol_image_url,gesture_media_url,audio_url")
  .limit(500);
if (mediaRowsError) throw mediaRowsError;

const mediaUrlSummary = {
  learningItemsChecked: mediaRows.length,
  symbolHttpsUrls: mediaRows.filter((row) => row.symbol_image_url?.startsWith("https://")).length,
  gestureHttpsUrls: mediaRows.filter((row) => row.gesture_media_url?.startsWith("https://")).length,
  audioHttpsUrls: mediaRows.filter((row) => row.audio_url?.startsWith("https://")).length,
  localPublicUrls: mediaRows.filter((row) =>
    [row.symbol_image_url, row.gesture_media_url, row.audio_url].some((value) => value?.startsWith("/"))
  ).length
};

const adminLogin = await signInSmoke(url, publishableKey, temporaryPassword, "admin@makalearn.local");
const teacherLogin = await signInSmoke(url, publishableKey, temporaryPassword, "teacher@makalearn.local");
const teacherCrud = teacherLogin.ok
  ? await runTeacherCrudSmoke(teacherLogin.client, teacherLogin.userId)
  : { skipped: true, reason: "Teacher login failed." };

console.log(JSON.stringify({
  authUsers,
  profiles,
  counts,
  mediaUrlSummary,
  loginResults: [adminLogin, teacherLogin].map(redactClient),
  teacherCrud
}, null, 2));
