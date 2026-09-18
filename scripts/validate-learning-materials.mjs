import { createClient } from "@supabase/supabase-js";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
    // Environment files are optional when variables are already provided.
  }
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function canonicalIdForManifestCard(card) {
  return `pecs-${card.filename.replace(/\.[^.]+$/i, "").replace(/_/g, "-")}`;
}

function groupDuplicates(items) {
  const grouped = new Map();
  for (const item of items) {
    const key = `${item.content_type}:${normalize(item.label)}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item.id]);
  }
  return [...grouped.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, ids }));
}

function findItemForValue(value, items) {
  const trimmed = value.trim();
  const normalized = normalize(trimmed);
  const aliases = { hel: "hello", hlo: "hello", drk: "drink", dri: "drink" };
  const compacted = normalized.replace(/[^a-z0-9]/g, "");
  const lookup = aliases[compacted] ?? normalized;

  return items.find((item) =>
    item.id === trimmed ||
    item.symbol_image_url === trimmed ||
    normalize(item.label) === lookup
  );
}

async function selectAll(supabase, table, columns) {
  const { data, error } = await supabase.from(table).select(columns).range(0, 9999);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before validating materials.");
}

const manifest = JSON.parse(
  await readFile(path.join(root, "public", "pecs", "pecs_arasaac_manifest.json"), "utf8")
);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const [
  learningItems,
  activities,
  activityItems,
  lessonItems,
  promptTemplates,
  practiceAttempts,
  mediaAssets
] = await Promise.all([
  selectAll(supabase, "learning_items", "id,label,content_type,symbol_image_url"),
  selectAll(supabase, "activities", "id,title,type,learning_item_ids"),
  selectAll(supabase, "activity_items", "id,activity_id,answer,options,learning_item_id"),
  selectAll(supabase, "lesson_items", "lesson_id,learning_item_id"),
  selectAll(supabase, "activity_prompt_templates", "id,learning_item_id"),
  selectAll(supabase, "practice_attempts", "id,learning_item_id"),
  selectAll(supabase, "media_assets", "id,related_item_id")
]);

const errors = [];
const warnings = [];
const itemById = new Map(learningItems.map((item) => [item.id, item]));
const activityById = new Map(activities.map((activity) => [activity.id, activity]));
const imageActivityTypes = new Set(["match-word-symbol", "choose-correct-symbol", "drag-drop-symbol"]);

const manifestLabels = new Set();
const manifestFilenames = new Set();
for (const card of manifest) {
  const labelKey = normalize(card.label);
  if (manifestLabels.has(labelKey)) errors.push(`Manifest contains duplicate label: ${card.label}`);
  if (manifestFilenames.has(card.filename)) errors.push(`Manifest contains duplicate filename: ${card.filename}`);
  manifestLabels.add(labelKey);
  manifestFilenames.add(card.filename);

  try {
    await access(path.join(root, "public", "pecs", "generated_cards", card.filename));
  } catch {
    errors.push(`Manifest image file is missing: ${card.filename}`);
  }

  const canonicalId = canonicalIdForManifestCard(card);
  const item = itemById.get(canonicalId);
  if (!item) {
    errors.push(`Supabase is missing canonical material ${canonicalId} (${card.label}).`);
  } else if (!item.symbol_image_url) {
    errors.push(`Canonical material ${canonicalId} has no symbol image.`);
  }
}

for (const duplicate of groupDuplicates(learningItems)) {
  warnings.push(`Duplicate material label ${duplicate.key}: ${duplicate.ids.join(", ")}`);
}

for (const activity of activities) {
  for (const itemId of activity.learning_item_ids ?? []) {
    const item = itemById.get(itemId);
    if (!item) {
      errors.push(`Activity ${activity.id} references missing material ${itemId}.`);
    } else if (imageActivityTypes.has(activity.type) && !item.symbol_image_url) {
      errors.push(`Image activity ${activity.id} references ${itemId}, which has no symbol image.`);
    }
  }
}

for (const question of activityItems) {
  const activity = activityById.get(question.activity_id);
  const relatedItem = itemById.get(question.learning_item_id);
  if (!activity) {
    errors.push(`Question ${question.id} references missing activity ${question.activity_id}.`);
    continue;
  }
  if (!relatedItem) {
    errors.push(`Question ${question.id} references missing material ${question.learning_item_id}.`);
    continue;
  }
  if (!imageActivityTypes.has(activity.type)) continue;
  if (!relatedItem.symbol_image_url) {
    errors.push(`Question ${question.id} uses ${relatedItem.id}, which has no symbol image.`);
  }

  const answerItem = findItemForValue(question.answer, learningItems) ?? relatedItem;
  if (!answerItem.symbol_image_url) {
    errors.push(`Question ${question.id} answer does not resolve to an image-backed material.`);
  }

  for (const option of question.options ?? []) {
    const optionItem = findItemForValue(option, learningItems);
    if (!optionItem?.symbol_image_url) {
      errors.push(`Question ${question.id} option "${option}" does not resolve to an image-backed material.`);
    }
  }
}

for (const [recordType, records] of [
  ["Lesson item", lessonItems],
  ["Prompt template", promptTemplates],
  ["Practice attempt", practiceAttempts]
]) {
  for (const record of records) {
    if (!itemById.has(record.learning_item_id)) {
      errors.push(`${recordType} references missing material ${record.learning_item_id}.`);
    }
  }
}

for (const asset of mediaAssets) {
  if (asset.related_item_id && !itemById.has(asset.related_item_id)) {
    errors.push(`Media asset ${asset.id} references missing material ${asset.related_item_id}.`);
  }
}

const summary = {
  ok: errors.length === 0,
  counts: {
    manifestCards: manifest.length,
    learningItems: learningItems.length,
    activities: activities.length,
    activityQuestions: activityItems.length,
    lessonLinks: lessonItems.length,
    promptTemplates: promptTemplates.length,
    practiceAttempts: practiceAttempts.length,
    mediaAssets: mediaAssets.length
  },
  errors,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exitCode = 1;
