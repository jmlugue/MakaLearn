import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACTIVITY_PROMPT_TEMPLATE_VERSION,
  buildActivityPromptMaterialHash,
  buildPromptDraftRequest,
  canDraftQuestionPrompts,
  createLocalFallbackPromptSuggestions,
  parsePromptDraftText
} from "@/utils/activity-ai-draft";
import type { ActivityDraftResult, ActivityPromptSuggestion, DraftablePromptActivityType } from "@/utils/activity-ai-draft";
import type { ActivityType, LearningItem } from "@/types";
import type { Database } from "@/types/database";

const activityTypes: ActivityType[] = [
  "match-word-symbol",
  "choose-correct-symbol",
  "fill-blank",
  "drag-drop-symbol",
  "gesture-practice",
  "simple-quiz"
];
const ACTIVITY_DRAFT_FEATURE = "activity-draft";
const HOURLY_MODEL_LIMIT = 5;
const DAILY_MODEL_LIMIT = 20;
const MATERIAL_COOLDOWN_SECONDS = 120;
const HUGGING_FACE_TIMEOUT_MS = 12000;

type ActivityDraftRequest = {
  activityType?: ActivityType;
  learningItems?: LearningItem[];
  missingLearningItemIds?: string[];
  regenerate?: boolean;
};

type HuggingFaceChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type SupabaseServerClient = ReturnType<typeof createSupabaseServerClient>;
type Tables = Database["public"]["Tables"];
type LearningItemRow = Tables["learning_items"]["Row"];
type AiUsageEventInsert = Tables["ai_usage_events"]["Insert"];

function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && activityTypes.includes(value as ActivityType);
}

function mapLearningItemRow(row: LearningItemRow): LearningItem {
  return {
    id: row.id,
    contentType: row.content_type,
    label: row.label,
    categoryId: row.category_id,
    description: row.description,
    instruction: row.instruction,
    symbolImageUrl: row.symbol_image_url ?? undefined,
    gestureMediaUrl: row.gesture_media_url ?? undefined,
    audioUrl: row.audio_url ?? undefined,
    sentenceRole: row.sentence_role ?? undefined,
    tags: row.tags,
    createdBy: row.created_by,
    updatedAt: row.updated_at
  };
}

function getRequestedLearningItemIds(body: ActivityDraftRequest) {
  const rawIds = Array.isArray(body.missingLearningItemIds)
    ? body.missingLearningItemIds
    : Array.isArray(body.learningItems)
      ? body.learningItems.map((item) => item?.id)
      : [];

  return Array.from(new Set(rawIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0))).slice(0, 5);
}

function jsonDraft(draft: ActivityDraftResult, status = 200) {
  return NextResponse.json(draft, { status });
}

function fallbackDraft(
  type: DraftablePromptActivityType,
  items: LearningItem[],
  note: string,
  source: ActivityDraftResult["source"] = "local-fallback",
  materialHash?: string,
  status = 200,
  rateLimit?: ActivityDraftResult["rateLimit"]
) {
  return jsonDraft(
    {
      source,
      note,
      suggestions: createLocalFallbackPromptSuggestions(type, items),
      materialHash,
      rateLimit
    },
    status
  );
}

async function logAiUsage(
  supabase: SupabaseServerClient,
  event: Omit<AiUsageEventInsert, "id" | "created_at">
) {
  const { error } = await supabase.from("ai_usage_events").insert(event);
  if (error) {
    console.error("AI usage event was not recorded.", error);
  }
}

function normalizeCachedPrompts(value: unknown, requestedItems: LearningItem[]): ActivityPromptSuggestion[] {
  const requestedById = new Map(requestedItems.map((item) => [item.id, item]));
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const suggestion = entry as Partial<ActivityPromptSuggestion>;
    if (typeof suggestion.learningItemId !== "string" || typeof suggestion.prompt !== "string") return [];
    const item = requestedById.get(suggestion.learningItemId);
    if (!item) return [];

    return [
      {
        learningItemId: item.id,
        label: typeof suggestion.label === "string" ? suggestion.label : item.label,
        prompt: suggestion.prompt
      }
    ];
  });
}

async function getCachedGeneration(
  supabase: SupabaseServerClient,
  type: DraftablePromptActivityType,
  materialHash: string,
  items: LearningItem[]
) {
  const { data, error } = await supabase
    .from("activity_prompt_generations")
    .select("*")
    .eq("activity_type", type)
    .eq("material_hash", materialHash)
    .eq("prompt_template_version", ACTIVITY_PROMPT_TEMPLATE_VERSION)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const suggestions = normalizeCachedPrompts(data.prompts, items);
  return suggestions.length ? { ...data, suggestions } : null;
}

async function getLatestGenerationVersion(
  supabase: SupabaseServerClient,
  type: DraftablePromptActivityType,
  materialHash: string
) {
  const { data, error } = await supabase
    .from("activity_prompt_generations")
    .select("version")
    .eq("activity_type", type)
    .eq("material_hash", materialHash)
    .eq("prompt_template_version", ACTIVITY_PROMPT_TEMPLATE_VERSION)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.version ?? 0;
}

async function countModelRequests(supabase: SupabaseServerClient, userId: string, sinceIso: string, materialHash?: string) {
  let query = supabase
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", ACTIVITY_DRAFT_FEATURE)
    .eq("event_type", "model-request")
    .gte("created_at", sinceIso);

  if (materialHash) {
    query = query.eq("material_hash", materialHash);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function getRateLimitStatus(supabase: SupabaseServerClient, userId: string, materialHash: string) {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const cooldownAgo = new Date(now - MATERIAL_COOLDOWN_SECONDS * 1000).toISOString();
  const [hourlyRequests, dailyRequests, recentMaterialRequests] = await Promise.all([
    countModelRequests(supabase, userId, hourAgo),
    countModelRequests(supabase, userId, dayAgo),
    countModelRequests(supabase, userId, cooldownAgo, materialHash)
  ]);

  const rateLimit = {
    hourlyLimit: HOURLY_MODEL_LIMIT,
    dailyLimit: DAILY_MODEL_LIMIT,
    remainingHourly: Math.max(0, HOURLY_MODEL_LIMIT - hourlyRequests),
    remainingDaily: Math.max(0, DAILY_MODEL_LIMIT - dailyRequests)
  };

  if (hourlyRequests >= HOURLY_MODEL_LIMIT || dailyRequests >= DAILY_MODEL_LIMIT || recentMaterialRequests > 0) {
    return {
      allowed: false,
      rateLimit: {
        ...rateLimit,
        retryAfterSeconds: recentMaterialRequests > 0 ? MATERIAL_COOLDOWN_SECONDS : undefined
      }
    };
  }

  return { allowed: true, rateLimit };
}

async function requestHuggingFaceDraft(
  token: string,
  model: string,
  type: DraftablePromptActivityType,
  items: LearningItem[]
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HUGGING_FACE_TIMEOUT_MS);

  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You create concise, reusable classroom question prompts for early communication learning. Return JSON only."
          },
          {
            role: "user",
            content: buildPromptDraftRequest(type, items)
          }
        ],
        temperature: 0.4,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`Hugging Face returned ${response.status}`);
    }

    const completion = (await response.json()) as HuggingFaceChatCompletion;
    return completion.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  let body: ActivityDraftRequest;

  try {
    body = (await request.json()) as ActivityDraftRequest;
  } catch {
    return NextResponse.json({ error: "Invalid activity draft request." }, { status: 400 });
  }

  if (!isActivityType(body.activityType)) {
    return NextResponse.json({ error: "Choose a valid activity type." }, { status: 400 });
  }

  if (!canDraftQuestionPrompts(body.activityType)) {
    return jsonDraft({
      source: "local-fallback",
      note: "This activity does not need AI-generated questions.",
      suggestions: []
    });
  }

  const activityType = body.activityType;
  const requestedLearningItemIds = getRequestedLearningItemIds(body);

  if (!requestedLearningItemIds.length) {
    return jsonDraft({
      source: "local-fallback",
      note: "Each selected item already has a question.",
      suggestions: []
    });
  }

  const model = process.env.HUGGINGFACE_ACTIVITY_MODEL || "openai/gpt-oss-120b:fastest";
  let supabase: SupabaseServerClient;
  let userId: string;
  let missingLearningItems: LearningItem[];

  try {
    supabase = createSupabaseServerClient();
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Sign in before drafting activity prompts with AI." }, { status: 401 });
    }

    userId = user.id;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,status")
      .eq("id", userId)
      .single();

    if (profileError || !profile || profile.status !== "active") {
      return NextResponse.json({ error: "This MakaLearn account is not active." }, { status: 403 });
    }

    const { data: itemRows, error: itemError } = await supabase
      .from("learning_items")
      .select("*")
      .in("id", requestedLearningItemIds)
      .limit(5);

    if (itemError) {
      throw itemError;
    }

    const itemById = new Map((itemRows ?? []).map((row) => [row.id, mapLearningItemRow(row)]));
    missingLearningItems = requestedLearningItemIds.flatMap((id) => {
      const item = itemById.get(id);
      return item ? [item] : [];
    });

    if (!missingLearningItems.length) {
      return NextResponse.json({ error: "Choose learning items that exist in Supabase." }, { status: 400 });
    }
  } catch (error) {
    console.error("Supabase activity draft setup failed.", error);
    return NextResponse.json({ error: "Supabase is required before drafting activity prompts." }, { status: 503 });
  }

  const materialHash = buildActivityPromptMaterialHash(activityType, missingLearningItems);

  try {
    if (!body.regenerate) {
      const cached = await getCachedGeneration(supabase, activityType, materialHash, missingLearningItems);
      if (cached) {
        await logAiUsage(supabase, {
          user_id: userId,
          feature: ACTIVITY_DRAFT_FEATURE,
          activity_type: activityType,
          material_hash: materialHash,
          event_type: "cache-hit",
          model
        });

        return jsonDraft({
          source: "cache",
          note: "Using a saved AI draft for these learning items.",
          suggestions: cached.suggestions,
          materialHash,
          version: cached.version
        });
      }
    }

    const limitStatus = await getRateLimitStatus(supabase, userId, materialHash);
    if (!limitStatus.allowed) {
      await logAiUsage(supabase, {
        user_id: userId,
        feature: ACTIVITY_DRAFT_FEATURE,
        activity_type: activityType,
        material_hash: materialHash,
        event_type: "rate-limited",
        model
      });

      return fallbackDraft(
        activityType,
        missingLearningItems,
        "AI limit reached. Editable starter prompts were added.",
        "rate-limited",
        materialHash,
        200,
        limitStatus.rateLimit
      );
    }
  } catch (error) {
    console.error("Supabase activity draft cache or quota check failed.", error);
    return fallbackDraft(
      activityType,
      missingLearningItems,
      "AI drafting could not check saved drafts or usage. Editable starter prompts were added.",
      "local-fallback",
      materialHash
    );
  }

  const token = process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN;

  if (!token) {
    await logAiUsage(supabase, {
      user_id: userId,
      feature: ACTIVITY_DRAFT_FEATURE,
      activity_type: activityType,
      material_hash: materialHash,
      event_type: "fallback-used",
      model
    });

    return fallbackDraft(
      activityType,
      missingLearningItems,
      "AI questions are not available right now. Editable starter prompts were added.",
      "local-fallback",
      materialHash
    );
  }

  try {
    await logAiUsage(supabase, {
      user_id: userId,
      feature: ACTIVITY_DRAFT_FEATURE,
      activity_type: activityType,
      material_hash: materialHash,
      event_type: "model-request",
      model
    });

    const content = await requestHuggingFaceDraft(token, model, activityType, missingLearningItems);
    const parsed = parsePromptDraftText(content, activityType, missingLearningItems);
    const suggestions = parsed.suggestions.length
      ? parsed.suggestions
      : createLocalFallbackPromptSuggestions(activityType, missingLearningItems);

    if (!parsed.suggestions.length) {
      await logAiUsage(supabase, {
        user_id: userId,
        feature: ACTIVITY_DRAFT_FEATURE,
        activity_type: activityType,
        material_hash: materialHash,
        event_type: "model-failure",
        model
      });

      return jsonDraft({
        source: "local-fallback",
        note: "AI questions were not usable. Editable starter prompts were added.",
        suggestions,
        materialHash
      });
    }

    const version = (await getLatestGenerationVersion(supabase, activityType, materialHash)) + 1;
    const { error: insertError } = await supabase.from("activity_prompt_generations").insert({
      activity_type: activityType,
      material_hash: materialHash,
      prompt_template_version: ACTIVITY_PROMPT_TEMPLATE_VERSION,
      learning_item_ids: missingLearningItems.map((item) => item.id),
      prompts: suggestions,
      source: "hugging-face",
      model,
      version,
      created_by: userId
    });

    if (insertError) throw insertError;

    await logAiUsage(supabase, {
      user_id: userId,
      feature: ACTIVITY_DRAFT_FEATURE,
      activity_type: activityType,
      material_hash: materialHash,
      event_type: "model-success",
      model
    });

    return jsonDraft({
      source: "hugging-face",
      note: `${suggestions.length} reusable ${suggestions.length === 1 ? "prompt was" : "prompts were"} drafted and saved in Supabase.`,
      suggestions,
      materialHash,
      version
    });
  } catch (error) {
    console.error("Hugging Face activity draft failed.", error);
    await logAiUsage(supabase, {
      user_id: userId,
      feature: ACTIVITY_DRAFT_FEATURE,
      activity_type: activityType,
      material_hash: materialHash,
      event_type: "model-failure",
      model
    });

    return fallbackDraft(
      activityType,
      missingLearningItems,
      "AI questions are not available right now. Editable starter prompts were added.",
      "local-fallback",
      materialHash
    );
  }
}
