// Explicit, repeatable deployment of the original grammar assets and corrected
// pronoun recording. Uses existing project credentials; never prints them.
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const envIndex = process.argv.indexOf("--env");
const envFile = envIndex >= 0 ? process.argv[envIndex + 1] : ".env.local";
try {
  const text = await fs.readFile(envFile, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
} catch { /* A configured shell does not need an env file. */ }
const manifest = JSON.parse(await fs.readFile("public/pecs/grammar_card_manifest.json", "utf8"));
const apply = process.argv.includes("--apply");
if (!apply) {
  console.log(JSON.stringify({ mode: "dry-run", grammarCards: manifest.map((card) => card.label), correctedAudio: "I", activityEligibility: "context required" }));
  process.exit(0);
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase server configuration required.");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const must = async (operation) => { const { data, error } = await operation; if (error) throw error; return data; };
const teacher = await must(db.from("profiles").select("id").eq("role", "teacher").eq("status", "active").eq("name", "Jordan Lee").single());
if (!teacher) throw new Error("The active Jordan Lee teacher account is required.");
const backupDir = path.join(root, "supabase/backups/playground-grammar", new Date().toISOString().replace(/[:.]/g, "-"));
await fs.mkdir(backupDir, { recursive: true });
const ids = manifest.map((card) => `pecs-${card.label.toLowerCase()}`);
const previous = await must(db.from("learning_items").select("*").in("id", [...ids, "pecs-i"]));
await fs.writeFile(path.join(backupDir, "learning-items.json"), JSON.stringify(previous, null, 2));
const oldI = previous.find((row) => row.id === "pecs-i");
if (oldI?.audio_url?.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
  const response = await fetch(oldI.audio_url);
  if (!response.ok) throw new Error("Original I recording could not be backed up.");
  await fs.writeFile(path.join(backupDir, "i-previous.wav"), Buffer.from(await response.arrayBuffer()));
}
async function upload(bucket, storagePath, localFile, type, itemId) {
  const bytes = await fs.readFile(localFile);
  await must(db.storage.from(bucket).upload(storagePath, bytes, {
    upsert: true, contentType: localFile.endsWith(".wav") ? "audio/wav" : "image/png", cacheControl: "3600"
  }));
  const url = db.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  return { url, media: {
    id: `media-${itemId}-${type}`, title: `${itemId.replace(/^pecs-/, "")} ${type}`,
    type, file_name: path.basename(storagePath), bucket, storage_path: storagePath,
    public_url: url, uploaded_by: teacher.id, related_item_id: itemId
  } };
}
const grammarCategory = await must(db.from("categories").select("created_by").eq("id", "cat-pecs-grammar").maybeSingle());
await must(db.from("categories").upsert({
  id: "cat-pecs-grammar", name: "Grammar", description: "Words for building English phrases and sentences.",
  color: "#dbeafe", created_by: grammarCategory?.created_by ?? teacher.id
}, { onConflict: "id" }));
for (const card of manifest) {
  const id = `pecs-${card.label.toLowerCase()}`;
  // A separate directory also prevents older clients from auto-inferring generic
  // Activity eligibility from the standard generated-cards URL pattern.
  const standard = await upload("symbol-images", `learning-content/pecs/grammar-cards/${card.filename}`, `public/pecs/generated_cards/${card.filename}`, "symbol-image", id);
  const activity = await upload("symbol-images", `learning-content/pecs/activity-images/${card.filename}`, `public/pecs/generated_cards_no_text/${card.filename}`, "activity-image", id);
  const audio = await upload("audio-files", `learning-content/pecs/audio/${card.filename.replace(".png", ".wav")}`, `public/audio/pecs/${card.filename.replace(".png", ".wav")}`, "audio-file", id);
  await must(db.from("learning_items").upsert({
    id, content_type: "pecs", label: card.label, category_id: "cat-pecs-grammar",
    grammar_kind: card.kind, sentence_role: null,
    description: `English ${card.kind} for sentence building. Example: ${card.example} Original educational placeholder; not official Makaton content.`,
    instruction: `Use this word in a phrase or sentence, such as: ${card.example}`,
    symbol_image_url: standard.url, activity_image_url: null, audio_url: audio.url,
    tags: ["pecs", "playground", "grammar", "context-required", card.kind], created_by: teacher.id
  }, { onConflict: "id" }));
  await must(db.from("media_assets").upsert([standard.media, activity.media, audio.media], { onConflict: "id" }));
}
if (!oldI) throw new Error("Existing I material was not found.");
const corrected = await upload("audio-files", "learning-content/pecs/audio/i-pronoun-v2.wav", "public/audio/pecs/i.wav", "audio-file", "pecs-i");
await must(db.from("learning_items").update({ audio_url: corrected.url, updated_at: new Date().toISOString() }).eq("id", "pecs-i"));
await must(db.from("media_assets").upsert(corrected.media, { onConflict: "id" }));
console.log(JSON.stringify({ mode: "published", grammarCards: manifest.length, images: manifest.length * 2, recordings: manifest.length + 1, backupDir }));
