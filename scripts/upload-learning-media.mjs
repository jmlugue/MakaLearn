import { createClient } from "@supabase/supabase-js";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dryRun = process.argv.includes("--dry-run");

function loadEnvFile(fileName) {
  return readFile(path.join(root, fileName), "utf8")
    .then((content) => {
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#") || !line.includes("=")) continue;
        const [key, ...valueParts] = line.split("=");
        const value = valueParts.join("=").trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) process.env[key] = value;
      }
    })
    .catch(() => undefined);
}

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before migrating learning media.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const manifest = JSON.parse(
  await readFile(path.join(root, "public", "pecs", "pecs_arasaac_manifest.json"), "utf8")
);

const categoryColors = {
  Greetings: "#dbeafe",
  Emotions: "#fce7f3",
  Family: "#ede9fe",
  Food: "#dcfce7",
  "Classroom Commands": "#e0f2fe",
  "Daily Needs": "#fef3c7",
  "Safety Words": "#fee2e2"
};

const gestures = [
  {
    id: "gesture-toilet",
    label: "I want to go to toilet",
    fileName: "toilet.png",
    audioFileName: "gesture-toilet.wav",
    description: "Use this gesture to ask for the toilet.",
    instruction: "Show the reference, start the camera, and check that both hands remain visible."
  },
  {
    id: "gesture-eat-food",
    label: "I want to eat food",
    fileName: "eat-food.png",
    audioFileName: "gesture-eat-food.wav",
    description: "Use this gesture to ask for food.",
    instruction: "Keep the learner centered and check that the live hand outline follows the movement."
  },
  {
    id: "gesture-drink-water",
    label: "I want to drink water",
    fileName: "drink-water.png",
    audioFileName: "gesture-drink-water.wav",
    description: "Use this gesture to ask for a drink.",
    instruction: "Use the hand visibility indicator before giving corrective feedback."
  },
  {
    id: "gesture-help",
    label: "Help",
    fileName: "help.png",
    audioFileName: "gesture-help.wav",
    description: "Use this gesture to ask for help.",
    instruction: "Ask the learner to repeat slowly if the hand detector loses visibility."
  },
  {
    id: "gesture-yes",
    label: "Yes",
    fileName: "yes.png",
    audioFileName: "gesture-yes.wav",
    description: "Use this gesture to answer yes.",
    instruction: "Start only when the camera shows one person in frame."
  },
  {
    id: "gesture-no",
    label: "No",
    fileName: "no.png",
    audioFileName: "gesture-no.wav",
    description: "Use this gesture to answer no.",
    instruction: "Use the visibility indicator to keep feedback focused and calm."
  },
  {
    id: "gesture-sit-down",
    label: "Sit down",
    fileName: "sit-down.png",
    audioFileName: "gesture-sit-down.wav",
    description: "Use this gesture for sit down.",
    instruction: "Give one short cue, wait, then repeat if the learner needs another model."
  }
];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeLabel(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function contentTypeForFile(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  if (extension === ".wav") return "audio/wav";
  if (extension === ".mp3") return "audio/mpeg";
  if (extension === ".m4a") return "audio/mp4";
  if (extension === ".mp4") return "video/mp4";
  return "application/octet-stream";
}

async function fileExists(relativePath) {
  try {
    await stat(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(bucket, storagePath, relativePath) {
  if (dryRun) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
  }

  const filePath = path.join(root, relativePath);
  const file = await readFile(filePath);
  const { error } = await supabase.storage.from(bucket).upload(storagePath, file, {
    contentType: contentTypeForFile(filePath),
    cacheControl: "31536000",
    upsert: true
  });

  if (error) throw error;

  const {
    data: { publicUrl }
  } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  return publicUrl;
}

async function expectData(request, label) {
  const { data, error } = await request;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function getProfileIds() {
  const profiles = await expectData(
    supabase.from("profiles").select("id,email,role"),
    "Load profiles"
  );
  const admin = profiles.find((profile) => profile.role === "admin") ?? profiles[0];
  const teacher = profiles.find((profile) => profile.role === "teacher") ?? admin;

  if (!admin || !teacher) {
    throw new Error("Create active admin and teacher profiles before migrating learning media.");
  }

  return {
    adminId: admin.id,
    teacherId: teacher.id
  };
}

async function getExistingLearningItems() {
  const rows = await expectData(
    supabase.from("learning_items").select("id,label,content_type,created_by,tags"),
    "Load existing learning_items"
  );

  return rows;
}

function matchingRows(existingItems, label, contentType, fallbackId) {
  const normalized = normalizeLabel(label);
  const matches = existingItems.filter(
    (item) => item.content_type === contentType && normalizeLabel(item.label) === normalized
  );

  return matches.length ? matches : [{ id: fallbackId, created_by: undefined, tags: [] }];
}

function createPecsDescription(label, category) {
  const lowerLabel = label.toLowerCase();
  if (category === "Greetings") return `Use when greeting someone, saying goodbye, or starting a classroom interaction with "${label}".`;
  if (category === "Emotions") return `Use when the learner needs to express feeling ${lowerLabel} or talk about emotions.`;
  if (category === "Food") return `Use when the learner wants ${lowerLabel}, is choosing food, or is talking about snack and meal routines.`;
  if (category === "Daily Needs") return `Use when the learner needs ${lowerLabel} or wants to communicate an everyday request.`;
  if (category === "Classroom Commands") return `Use when practising the classroom direction "${label}" or following a teacher-guided routine.`;
  if (category === "Safety Words") return `Use when the learner needs to communicate "${label}" during safety, discomfort, or urgent classroom situations.`;
  if (category === "Family") return `Use when the learner is talking about ${lowerLabel} or identifying familiar people.`;
  return `Use when the learner needs to communicate "${label}" in a classroom routine.`;
}

async function upsertCategories(adminId) {
  const categories = Object.keys(categoryColors).map((name) => ({
    id: `cat-pecs-${slugify(name)}`,
    name,
    description: `PECS/AAC cards for ${name.toLowerCase()} practice.`,
    color: categoryColors[name],
    created_by: adminId,
    updated_at: new Date().toISOString()
  }));

  categories.push({
    id: "cat-gestures",
    name: "Fixed gestures",
    description: "Gesture references available in guided gesture practice.",
    color: "#dcfce7",
    created_by: adminId,
    updated_at: new Date().toISOString()
  });

  if (!dryRun) {
    await expectData(supabase.from("categories").upsert(categories).select("id"), "Upsert categories");
  }

  return categories.length;
}

async function upsertMediaAsset(asset) {
  if (dryRun) return;
  await expectData(
    supabase.from("media_assets").upsert(asset).select("id"),
    `Upsert media asset ${asset.id}`
  );
}

async function updateLearningItem(row) {
  if (dryRun) return;
  await expectData(
    supabase.from("learning_items").upsert(row).select("id"),
    `Upsert learning item ${row.id}`
  );
}

async function migratePecs(existingItems, adminId) {
  const summary = { items: 0, images: 0, audio: 0, mediaRows: 0, missingFiles: [] };

  for (const card of manifest) {
    const imageRelativePath = path.join("public", "pecs", "generated_cards", card.filename);
    const audioFileName = card.filename.replace(/\.png$/i, ".wav");
    const audioRelativePath = path.join("public", "audio", "pecs", audioFileName);
    const hasImage = await fileExists(imageRelativePath);
    const hasAudio = await fileExists(audioRelativePath);

    if (!hasImage) summary.missingFiles.push(imageRelativePath);
    if (!hasAudio) summary.missingFiles.push(audioRelativePath);

    const imageStoragePath = `learning-content/pecs/generated-cards/${card.filename}`;
    const audioStoragePath = `learning-content/pecs/audio/${audioFileName}`;
    const imageUrl = hasImage ? await uploadFile("symbol-images", imageStoragePath, imageRelativePath) : null;
    const audioUrl = hasAudio ? await uploadFile("audio-files", audioStoragePath, audioRelativePath) : null;

    if (imageUrl) summary.images += 1;
    if (audioUrl) summary.audio += 1;

    const fallbackId = `pecs-${card.filename.replace(/\.png$/i, "").replace(/_/g, "-")}`;
    const targets = matchingRows(existingItems, card.label, "pecs", fallbackId);

    for (const target of targets) {
      await updateLearningItem({
        id: target.id,
        content_type: "pecs",
        label: card.label,
        category_id: `cat-pecs-${slugify(card.category)}`,
        description: createPecsDescription(card.label, card.category),
        instruction: "Use this card during teacher-guided PECS/AAC sentence building and classroom routines.",
        symbol_image_url: imageUrl,
        gesture_media_url: null,
        audio_url: audioUrl,
        sentence_role: card.sentence_role,
        tags: unique([...(target.tags ?? []), "pecs", "classroom", "playground", card.category.toLowerCase(), card.sentence_role]),
        created_by: target.created_by ?? adminId,
        updated_at: new Date().toISOString()
      });
      summary.items += 1;

      if (imageUrl) {
        await upsertMediaAsset({
          id: `media-${target.id}-symbol`,
          title: `${card.label} PECS card image`,
          type: "symbol-image",
          file_name: card.filename,
          bucket: "symbol-images",
          storage_path: imageStoragePath,
          public_url: imageUrl,
          uploaded_by: target.created_by ?? adminId,
          related_item_id: target.id,
          uploaded_at: new Date().toISOString()
        });
        summary.mediaRows += 1;
      }

      if (audioUrl) {
        await upsertMediaAsset({
          id: `media-${target.id}-audio`,
          title: `${card.label} audio cue`,
          type: "audio-file",
          file_name: audioFileName,
          bucket: "audio-files",
          storage_path: audioStoragePath,
          public_url: audioUrl,
          uploaded_by: target.created_by ?? adminId,
          related_item_id: target.id,
          uploaded_at: new Date().toISOString()
        });
        summary.mediaRows += 1;
      }
    }
  }

  return summary;
}

async function migrateGestures(existingItems, adminId) {
  const summary = { items: 0, referenceImages: 0, gestureMedia: 0, audio: 0, mediaRows: 0, missingFiles: [] };

  for (const gesture of gestures) {
    const imageRelativePath = path.join("public", "gesture-references", gesture.fileName);
    const audioRelativePath = path.join("public", "audio", gesture.audioFileName);
    const hasImage = await fileExists(imageRelativePath);
    const hasAudio = await fileExists(audioRelativePath);

    if (!hasImage) summary.missingFiles.push(imageRelativePath);
    if (!hasAudio) summary.missingFiles.push(audioRelativePath);

    const symbolStoragePath = `learning-content/gesture-references/symbols/${gesture.fileName}`;
    const gestureStoragePath = `learning-content/gesture-references/media/${gesture.fileName}`;
    const audioStoragePath = `learning-content/gesture-references/audio/${gesture.audioFileName}`;
    const symbolUrl = hasImage ? await uploadFile("symbol-images", symbolStoragePath, imageRelativePath) : null;
    const gestureUrl = hasImage ? await uploadFile("gesture-media", gestureStoragePath, imageRelativePath) : null;
    const audioUrl = hasAudio ? await uploadFile("audio-files", audioStoragePath, audioRelativePath) : null;

    if (symbolUrl) summary.referenceImages += 1;
    if (gestureUrl) summary.gestureMedia += 1;
    if (audioUrl) summary.audio += 1;

    const targets = matchingRows(existingItems, gesture.label, "gesture", gesture.id);

    for (const target of targets) {
      await updateLearningItem({
        id: target.id,
        content_type: "gesture",
        label: gesture.label,
        category_id: "cat-gestures",
        description: gesture.description,
        instruction: gesture.instruction,
        symbol_image_url: symbolUrl,
        gesture_media_url: gestureUrl,
        audio_url: audioUrl,
        sentence_role: "command",
        tags: unique([...(target.tags ?? []), "gesture", "fixed", "classroom"]),
        created_by: target.created_by ?? adminId,
        updated_at: new Date().toISOString()
      });
      summary.items += 1;

      const mediaAssets = [
        {
          id: `media-${target.id}-symbol`,
          title: `${gesture.label} reference image`,
          type: "symbol-image",
          file_name: gesture.fileName,
          bucket: "symbol-images",
          storage_path: symbolStoragePath,
          public_url: symbolUrl
        },
        {
          id: `media-${target.id}-gesture`,
          title: `${gesture.label} gesture media`,
          type: "gesture-media",
          file_name: gesture.fileName,
          bucket: "gesture-media",
          storage_path: gestureStoragePath,
          public_url: gestureUrl
        },
        {
          id: `media-${target.id}-audio`,
          title: `${gesture.label} audio cue`,
          type: "audio-file",
          file_name: gesture.audioFileName,
          bucket: "audio-files",
          storage_path: audioStoragePath,
          public_url: audioUrl
        }
      ];

      for (const asset of mediaAssets.filter((asset) => asset.public_url)) {
        await upsertMediaAsset({
          ...asset,
          uploaded_by: target.created_by ?? adminId,
          related_item_id: target.id,
          uploaded_at: new Date().toISOString()
        });
        summary.mediaRows += 1;
      }
    }
  }

  return summary;
}

const { adminId } = await getProfileIds();
const existingItems = await getExistingLearningItems();
const categoryCount = await upsertCategories(adminId);
const pecs = await migratePecs(existingItems, adminId);
const gesturesSummary = await migrateGestures(existingItems, adminId);

console.log(
  JSON.stringify(
    {
      mode: dryRun ? "dry-run" : "uploaded",
      inventory: {
        pecsCards: manifest.length,
        pecsImageFiles: pecs.images,
        pecsAudioFiles: pecs.audio,
        gestureReferenceImages: gesturesSummary.referenceImages,
        gestureMediaFiles: gesturesSummary.gestureMedia,
        gestureAudioFiles: gesturesSummary.audio,
        categories: categoryCount,
        learningItemsUpdatedOrCreated: pecs.items + gesturesSummary.items,
        mediaAssetRows: pecs.mediaRows + gesturesSummary.mediaRows,
        missingFiles: [...pecs.missingFiles, ...gesturesSummary.missingFiles]
      }
    },
    null,
    2
  )
);
