// Owner-authorized Oct 17 cleanup. Defaults to a read-only plan; --apply removes only
// the 11 reviewed orphan paths and the empty retired bucket through the Storage API.
// Database retirement is performed separately through the tracked migration.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of (await fs.readFile(file, "utf8")).split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, "tjqwyogtawkhyviljzrr.supabase.co", "Wrong project; stop cleanup");
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, "Missing server-only service key");
const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const apply = process.argv.includes("--apply");
const backupOnly = process.argv.includes("--backup");
const approved = {
  "audio-files": [
    "learning-content/gesture-references/audio/gesture-drink-water.wav",
    "learning-content/gesture-references/audio/gesture-eat-food.wav",
    "learning-content/pecs/audio/am-word.wav", "learning-content/pecs/audio/am.wav",
    "learning-content/pecs/audio/hurt-word.wav", "learning-content/pecs/audio/hurt.wav"
  ],
  "gesture-media": ["item-drink/673a1a8b-ee89-4884-ad0e-76a974b70006-screenshot-2026-06-19-153649.png"],
  "symbol-images": [
    "item-drink/b50f24c5-508c-4ea0-90e8-1dd924c5a619-drinking.png",
    "item-drink/d9e72705-653c-4f1d-8dab-33e9755fe1fb-drinking.png",
    "item-eat/45582f2e-7041-461e-99ea-266c0cdf4ddd-eating.png",
    "item-hello/cee8b1a6-99f3-4e90-bece-83db70dfbfa8-stop.png"
  ]
};
async function all(table) {
  const result = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.from(table).select("*").range(offset, offset + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    result.push(...data);
    if (data.length < 1000) return result;
  }
}
function objectPath(value, bucket) {
  if (typeof value !== "string") return null;
  try {
    const parsed = new URL(value, url);
    if (parsed.origin !== new URL(url).origin) return null;
    const prefix = `/storage/v1/object/public/${bucket}/`;
    return parsed.pathname.startsWith(prefix) ? decodeURIComponent(parsed.pathname.slice(prefix.length)) : null;
  } catch { return null; }
}
async function checkPath(bucket, name) {
  const [materials, assets] = await Promise.all([all("learning_items"), all("media_assets")]);
  assert.ok(!assets.some(a => a.bucket === bucket && a.storage_path === name), `File acquired a Media record: ${name}`);
  assert.ok(!materials.some(m => [m.symbol_image_url, m.activity_image_url, m.gesture_media_url, m.audio_url]
    .some(value => objectPath(value, bucket) === name)), `File is now attached to a material: ${name}`);
}
// Snapshot every application table, including the records about to be retired. Never print row contents.
const tables = ["profiles", "categories", "learning_items", "media_assets", "lessons", "lesson_items",
  "activities", "activity_items", "activity_results", "audit_logs", "activity_prompt_templates",
  "activity_prompt_generations", "ai_usage_events", "user_settings", "account_requests", "learners", "practice_attempts"];
let backupDir;
if (apply || backupOnly) {
  backupDir = path.resolve("supabase/backups", new Date().toISOString().replace(/[:.]/g, "-"));
  await fs.mkdir(backupDir, { recursive: true });
  for (const table of tables) await fs.writeFile(path.join(backupDir, `${table}.json`), JSON.stringify(await all(table)));
  console.log(`Private recovery snapshot saved under ${backupDir}`);
}
const plan = [];
for (const [bucket, names] of Object.entries(approved)) {
  for (const name of names) {
    await checkPath(bucket, name);
    const { data, error } = await client.storage.from(bucket).download(name);
    if (error) {
      if (String(error.status ?? error.statusCode) === "404" || error.message === "Object not found") continue;
      throw new Error(`Could not back up ${name}: ${error.message}`);
    }
    plan.push({ bucket, path: name });
    if (backupDir) {
      const destination = path.join(backupDir, "storage", bucket, name);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, Buffer.from(await data.arrayBuffer()));
    }
    if (apply) {
      await checkPath(bucket, name); // Recheck immediately before each deletion.
      const { error: removeError } = await client.storage.from(bucket).remove([name]);
      if (removeError) throw new Error(`Storage removal failed: ${removeError.message}`);
    }
  }
}
if (apply) {
  const assets = await all("media_assets");
  assert.ok(!assets.some(a => a.bucket === "learner-photos" || a.type === "learner-photo"));
  // deleteBucket refuses a nonempty bucket; never use emptyBucket here.
  const { error } = await client.storage.deleteBucket("learner-photos");
  if (error && String(error.status ?? error.statusCode) !== "404") throw error;
}
console.log(JSON.stringify({ mode: apply ? "applied" : backupOnly ? "backup-only" : "dry-run", files: plan }, null, 2));
