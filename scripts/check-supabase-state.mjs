import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function loadEnvFile(fileName) {
  try {
    const content = await readFile(path.join(root, fileName), "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Env files are optional when the shell already provides variables.
  }
}

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before checking Supabase state.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function countRows(table, configure) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (configure) query = configure(query);
  const { count, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function existingIds(table, ids) {
  const { data, error } = await supabase.from(table).select("id").in("id", ids);
  if (error) throw new Error(`${table}: ${error.message}`);
  return ids.filter((id) => data.some((row) => row.id === id));
}

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
if (bucketError) throw new Error(`storage buckets: ${bucketError.message}`);

const summary = {
  profiles: await countRows("profiles"),
  activeProfiles: await countRows("profiles", (query) => query.eq("status", "active")),
  categories: await countRows("categories"),
  learners: await countRows("learners"),
  learningItems: await countRows("learning_items"),
  learningItemsWithAnyMedia: await countRows("learning_items", (query) =>
    query.or("symbol_image_url.not.is.null,gesture_media_url.not.is.null,audio_url.not.is.null")
  ),
  mediaAssets: await countRows("media_assets"),
  lessons: await countRows("lessons"),
  lessonItems: await countRows("lesson_items"),
  activities: await countRows("activities"),
  activityItems: await countRows("activity_items"),
  promptGenerations: await countRows("activity_prompt_generations"),
  aiUsageEvents: await countRows("ai_usage_events"),
  seedRows: {
    learningItems: await existingIds("learning_items", ["item-hello", "item-eat", "item-drink"]),
    lessons: await existingIds("lessons", ["lesson-needs"]),
    activities: await existingIds("activities", ["activity-match", "activity-choice"])
  },
  buckets: buckets.map((bucket) => bucket.name).sort()
};

console.log(JSON.stringify(summary, null, 2));
