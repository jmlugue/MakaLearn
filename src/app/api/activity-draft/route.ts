import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACTIVITY_PROMPT_TEMPLATE_VERSION,
  activityPromptDraftTemperature,
  buildActivityPromptMaterialHash,
  buildPromptDraftRequest,
  canDraftQuestionPrompts,
  completeActivityPromptSuggestions,
  getUnresolvedPromptItems,
  parsePromptDraftText
} from "@/utils/activity-ai-draft";
import type {
  ActivityDraftResult,
  ActivityPromptDraftContext,
  ActivityPromptSuggestion,
  DraftablePromptActivityType
} from "@/utils/activity-ai-draft";
import {
  ACTIVITY_DRAFT_MATERIAL_COOLDOWN_SECONDS,
  ACTIVITY_DRAFT_PROVIDER_TIMEOUT_MS,
  canRetryActivityDraftCall,
  evaluateActivityDraftRateLimit,
  shouldIgnoreActivityDraftMaterialCooldown
} from "@/utils/activity-ai-rate-limit";
import { isUnsafeActivityDistractor } from "@/utils/activity-option-sets";
import { ensurePecsManifestItems } from "@/utils/pecs-content-library";
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
const DEFAULT_GEMINI_ACTIVITY_MODEL = "gemini-3.5-flash-lite";

class GeminiDraftRequestError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
    this.name = "GeminiDraftRequestError";
  }
}

type ActivityDraftRequest = {
  activityType?: ActivityType;
  learningItems?: LearningItem[];
  missingLearningItemIds?: string[];
  currentPromptByItemId?: Record<string, unknown>;
  regenerate?: boolean;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
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

function getPreviousPromptById(body: ActivityDraftRequest, requestedIds: string[]) {
  if (!body.regenerate || !body.currentPromptByItemId || typeof body.currentPromptByItemId !== "object") return {};

  return Object.fromEntries(
    requestedIds.flatMap((id) => {
      const value = body.currentPromptByItemId?.[id];
      if (typeof value !== "string") return [];
      const prompt = value.replace(/\s+/g, " ").trim().slice(0, 180).trim();
      return prompt ? [[id, prompt] as const] : [];
    })
  );
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
  rateLimit?: ActivityDraftResult["rateLimit"],
  context: ActivityPromptDraftContext = {}
) {
  const { suggestions, issues } = completeActivityPromptSuggestions(type, items, [], context);
  return jsonDraft(
    {
      source,
      note,
      suggestions,
      issues,
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

async function getCachedGeneration(
  supabase: SupabaseServerClient,
  type: DraftablePromptActivityType,
  materialHash: string,
  items: LearningItem[],
  context: ActivityPromptDraftContext
) {
  const { data, error } = await supabase
    .from("activity_prompt_generations")
    .select("*")
    .eq("activity_type", type)
    .eq("material_hash", materialHash)
    .eq("prompt_template_version", ACTIVITY_PROMPT_TEMPLATE_VERSION)
    .eq("source", "gemini")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const parsed = parsePromptDraftText(JSON.stringify({ prompts: data.prompts }), type, items, context);
  return parsed.suggestions.length === items.length && !(parsed.issues?.length)
    ? { ...data, suggestions: parsed.suggestions }
    : null;
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

async function countUsageEvents(
  supabase: SupabaseServerClient,
  userId: string,
  sinceIso: string,
  eventType: "model-request" | "model-success",
  materialHash?: string
) {
  let query = supabase
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", ACTIVITY_DRAFT_FEATURE)
    .eq("event_type", eventType)
    .gte("created_at", sinceIso);

  if (materialHash) {
    query = query.eq("material_hash", materialHash);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function getRateLimitStatus(
  supabase: SupabaseServerClient,
  userId: string,
  materialHash: string,
  ignoreMaterialCooldown = false
) {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const cooldownAgo = new Date(now - ACTIVITY_DRAFT_MATERIAL_COOLDOWN_SECONDS * 1000).toISOString();
  const [hourlyRequests, dailyRequests, recentMaterialSuccesses] = await Promise.all([
    countUsageEvents(supabase, userId, hourAgo, "model-request"),
    countUsageEvents(supabase, userId, dayAgo, "model-request"),
    ignoreMaterialCooldown
      ? Promise.resolve(0)
      : countUsageEvents(supabase, userId, cooldownAgo, "model-success", materialHash)
  ]);

  return evaluateActivityDraftRateLimit({
    hourlyRequests,
    dailyRequests,
    recentMaterialSuccesses,
    ignoreMaterialCooldown
  });
}

async function requestGeminiDraft(
  apiKey: string,
  model: string,
  type: DraftablePromptActivityType,
  items: LearningItem[],
  context: ActivityPromptDraftContext
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ACTIVITY_DRAFT_PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You create concise, reusable classroom question prompts for early communication learning. Follow every supplied constraint and return JSON only."
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: buildPromptDraftRequest(type, items, context) }]
            }
          ],
          generationConfig: {
            temperature: activityPromptDraftTemperature(context),
            maxOutputTokens: 700,
            responseMimeType: "application/json"
          }
        })
      }
    );

    if (!response.ok) {
      throw new GeminiDraftRequestError(
        `Gemini returned ${response.status}`,
        response.status === 429 || response.status >= 500
      );
    }

    const completion = (await response.json()) as GeminiGenerateContentResponse;
    return (
      completion.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim() ?? ""
    );
  } catch (error) {
    if (error instanceof GeminiDraftRequestError) throw error;
    if (controller.signal.aborted) {
      throw new GeminiDraftRequestError("Gemini activity drafting timed out.", true);
    }
    throw new GeminiDraftRequestError("Gemini activity drafting could not reach the provider.", true);
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

  const model = process.env.GEMINI_ACTIVITY_MODEL?.trim() || DEFAULT_GEMINI_ACTIVITY_MODEL;
  let supabase: SupabaseServerClient;
  let userId: string;
  let missingLearningItems: LearningItem[];
  let draftContext: ActivityPromptDraftContext;

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
      .select("id,role,status")
      .eq("id", userId)
      .single();

    if (profileError || !profile || profile.status !== "active") {
      return NextResponse.json({ error: "This MakaLearn account is not active." }, { status: 403 });
    }
    // Admins are view only, and AI usage limits are only recorded for teachers.
    if (profile.role !== "teacher") {
      return NextResponse.json({ error: "Only teachers can draft activity questions with AI." }, { status: 403 });
    }

    const [{ data: itemRows, error: itemError }, { data: libraryRows, error: libraryError }, { data: categoryRows, error: categoryError }] =
      await Promise.all([
        supabase.from("learning_items").select("*").in("id", requestedLearningItemIds).limit(5),
        supabase.from("learning_items").select("*").eq("content_type", "pecs").not("symbol_image_url", "is", null),
        supabase.from("categories").select("id,name")
      ]);

    if (itemError) throw itemError;
    if (libraryError) throw libraryError;
    if (categoryError) throw categoryError;

    const itemById = new Map((itemRows ?? []).map((row) => [row.id, mapLearningItemRow(row)]));
    missingLearningItems = requestedLearningItemIds.flatMap((id) => {
      const item = itemById.get(id);
      return item ? [item] : [];
    });

    if (missingLearningItems.length !== requestedLearningItemIds.length) {
      return NextResponse.json({ error: "Choose learning items that exist in Supabase." }, { status: 400 });
    }
    if (missingLearningItems.some((item) => item.contentType !== "pecs" || !item.symbolImageUrl)) {
      return NextResponse.json({ error: "AI activity questions require PECS learning materials with pictures." }, { status: 400 });
    }

    const eligiblePecsItems = ensurePecsManifestItems((libraryRows ?? []).map(mapLearningItemRow)).filter(
      (item) => item.contentType === "pecs" && Boolean(item.symbolImageUrl)
    );
    const categoryNameById = Object.fromEntries((categoryRows ?? []).map((category) => [category.id, category.name]));
    const conflictingItemsById = Object.fromEntries(
      missingLearningItems.map((item) => [
        item.id,
        eligiblePecsItems.filter(
          (candidate) => candidate.id !== item.id && isUnsafeActivityDistractor(activityType, item, candidate)
        )
      ])
    );
    draftContext = {
      categoryNameById,
      conflictingItemsById,
      previousPromptById: getPreviousPromptById(body, requestedLearningItemIds)
    };
  } catch (error) {
    console.error("Supabase activity draft setup failed.", error);
    return NextResponse.json({ error: "Supabase is required before drafting activity prompts." }, { status: 503 });
  }

  const materialHash = buildActivityPromptMaterialHash(activityType, missingLearningItems);

  try {
    if (!body.regenerate) {
      const cached = await getCachedGeneration(supabase, activityType, materialHash, missingLearningItems, draftContext);
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

    const limitStatus = await getRateLimitStatus(
      supabase,
      userId,
      materialHash,
      shouldIgnoreActivityDraftMaterialCooldown(body.regenerate)
    );
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
        limitStatus.rateLimit.retryAfterSeconds
          ? "A draft was just created for these materials. Wait a moment before trying again."
          : "The hourly or daily AI limit was reached. Editable starter prompts were added.",
        "rate-limited",
        materialHash,
        200,
        limitStatus.rateLimit,
        draftContext
      );
    }
  } catch (error) {
    console.error("Supabase activity draft cache or quota check failed.", error);
    return fallbackDraft(
      activityType,
      missingLearningItems,
      "AI drafting could not check saved drafts or usage. Editable starter prompts were added.",
      "local-fallback",
      materialHash,
      200,
      undefined,
      draftContext
    );
  }

  // This key is intentionally separate from GEMINI_API_KEY, which is reserved for
  // gesture corrective feedback. Activity drafting cannot change gesture recognition.
  const apiKey = process.env.GEMINI_ACTIVITY_API_KEY?.trim();

  if (!apiKey) {
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
      materialHash,
      200,
      undefined,
      draftContext
    );
  }

  let providerFailureLogged = false;
  let modelRequestCount = 1;

  try {
    await logAiUsage(supabase, {
      user_id: userId,
      feature: ACTIVITY_DRAFT_FEATURE,
      activity_type: activityType,
      material_hash: materialHash,
      event_type: "model-request",
      model
    });

    let content: string;
    try {
      content = await requestGeminiDraft(apiKey, model, activityType, missingLearningItems, draftContext);
    } catch (error) {
      await logAiUsage(supabase, {
        user_id: userId,
        feature: ACTIVITY_DRAFT_FEATURE,
        activity_type: activityType,
        material_hash: materialHash,
        event_type: "model-failure",
        model
      });
      providerFailureLogged = true;

      const retryLimit = await getRateLimitStatus(supabase, userId, materialHash, true);
      if (
        !canRetryActivityDraftCall({
          modelRequestCount,
          retryable: error instanceof GeminiDraftRequestError && error.retryable,
          rateAllowed: retryLimit.allowed
        })
      ) {
        throw error;
      }

      await logAiUsage(supabase, {
        user_id: userId,
        feature: ACTIVITY_DRAFT_FEATURE,
        activity_type: activityType,
        material_hash: materialHash,
        event_type: "model-request",
        model
      });
      modelRequestCount += 1;
      providerFailureLogged = false;
      content = await requestGeminiDraft(apiKey, model, activityType, missingLearningItems, draftContext);
    }
    const parsed = parsePromptDraftText(content, activityType, missingLearningItems, draftContext);
    const geminiSuggestions = parsed.suggestions;
    const unresolvedItems = getUnresolvedPromptItems(missingLearningItems, geminiSuggestions);

    if (unresolvedItems.length) {
      await logAiUsage(supabase, {
        user_id: userId,
        feature: ACTIVITY_DRAFT_FEATURE,
        activity_type: activityType,
        material_hash: materialHash,
        event_type: "model-failure",
        model
      });
    }

    let version = 0;
    if (!unresolvedItems.length && geminiSuggestions.length === missingLearningItems.length) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        version = (await getLatestGenerationVersion(supabase, activityType, materialHash)) + 1;
        const { error: insertError } = await supabase.from("activity_prompt_generations").insert({
          activity_type: activityType,
          material_hash: materialHash,
          prompt_template_version: ACTIVITY_PROMPT_TEMPLATE_VERSION,
          learning_item_ids: missingLearningItems.map((item) => item.id),
          prompts: geminiSuggestions,
          source: "gemini",
          model,
          version,
          created_by: userId
        });

        if (!insertError) break;
        // Another request may have claimed the same next version. Re-read and retry once.
        if (insertError.code === "23505" && attempt === 0) continue;
        throw insertError;
      }
    }

    if (geminiSuggestions.length) {
      await logAiUsage(supabase, {
        user_id: userId,
        feature: ACTIVITY_DRAFT_FEATURE,
        activity_type: activityType,
        material_hash: materialHash,
        event_type: "model-success",
        model
      });
    }

    const { suggestions, fallbackSuggestions, missingItems, issues } = completeActivityPromptSuggestions(
      activityType,
      missingLearningItems,
      geminiSuggestions,
      draftContext
    );
    const source: ActivityDraftResult["source"] = fallbackSuggestions.length || missingItems.length
      ? geminiSuggestions.length
        ? "mixed"
        : "local-fallback"
      : "gemini";
    const promptName = activityType === "fill-blank" ? "sentence" : "question";
    const note = missingItems.length
      ? `${suggestions.length} ${suggestions.length === 1 ? promptName : `${promptName}s`} ready; ${missingItems.length} still ${missingItems.length === 1 ? "needs" : "need"} your wording.`
      : `${suggestions.length} ${suggestions.length === 1 ? promptName : `${promptName}s`} ready. Check ${suggestions.length === 1 ? "it" : "them"} before saving.`;

    return jsonDraft({
      source,
      note,
      suggestions,
      issues,
      materialHash,
      version: version || undefined
    });
  } catch (error) {
    console.error("Gemini activity draft failed.", error);
    if (!providerFailureLogged) {
      await logAiUsage(supabase, {
        user_id: userId,
        feature: ACTIVITY_DRAFT_FEATURE,
        activity_type: activityType,
        material_hash: materialHash,
        event_type: "model-failure",
        model
      });
    }

    return fallbackDraft(
      activityType,
      missingLearningItems,
      "AI questions are not available right now. Editable starter prompts were added.",
      "local-fallback",
      materialHash,
      200,
      undefined,
      draftContext
    );
  }
}
