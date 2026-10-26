import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { buildMsavClassificationPrompt, isBuiltInMsavLabel, parseMsavMaterialProfile } from "@/utils/msav-material-profile";
import type { Database } from "@/types/database";

const FEATURE = "msav-material-preparation";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const PROVIDER_TIMEOUT_MS = 20_000;

type GeminiResponse = { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : "";
}

// Prepare a new PECS card's MSAV profile for eligibility and the algorithm fallback.
export async function POST(request: Request) {
  let learningItemId = "";
  try {
    const body = (await request.json()) as { learningItemId?: unknown };
    learningItemId = typeof body.learningItemId === "string" ? body.learningItemId.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid preparation request." }, { status: 400 });
  }
  if (!learningItemId) return NextResponse.json({ error: "Choose a learning material to prepare." }, { status: 400 });

  const model = process.env.GEMINI_MSAV_MODEL?.trim() || DEFAULT_MODEL;
  let supabase: ReturnType<typeof createSupabaseServerClient>;
  let userId: string;

  try {
    supabase = createSupabaseServerClient();
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: "Sign in before preparing a material." }, { status: 401 });
    userId = auth.user.id;
    const { data: profile, error: profileError } = await supabase.from("profiles").select("role,status").eq("id", userId).single();
    if (profileError || !profile || profile.status !== "active" || profile.role !== "teacher") {
      return NextResponse.json({ error: "Only active teachers can prepare materials." }, { status: 403 });
    }
  } catch (error) {
    console.error("MSAV preparation authentication failed.", error);
    return NextResponse.json({ error: "Material preparation is unavailable right now." }, { status: 503 });
  }

  const { data: item, error: itemError } = await supabase
    .from("learning_items")
    .select("id,content_type,label,description,instruction,tags,category_id,updated_at,msav_profile,playground_prepared_at,playground_classifier_model,playground_preparation_status,playground_last_attempt_at")
    .eq("id", learningItemId)
    .single();
  if (itemError || !item) return NextResponse.json({ error: "That learning material was not found." }, { status: 404 });
  if (item.content_type !== "pecs") return NextResponse.json({ error: "Only PECS materials are prepared for Playground." }, { status: 400 });

  // Built-in cards always use the reviewed source-controlled rules and never consume AI quota.
  if (isBuiltInMsavLabel(item.label)) return NextResponse.json({ status: "ready", builtIn: true });
  if (item.playground_preparation_status === "ready" && item.msav_profile) {
    const existing = parseMsavMaterialProfile(item.msav_profile);
    if (existing) return NextResponse.json({ status: "ready", profile: existing, preparedAt: item.playground_prepared_at, classifierModel: item.playground_classifier_model });
  }

  const apiKey = process.env.GEMINI_MSAV_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ status: "pending", error: "Preparation is unavailable. Try again later." }, { status: 503 });

  let claim: { state: string; attemptedAt?: string; version?: string };
  try {
    const result = await createSupabaseServiceRoleClient().rpc("claim_material_preparation", { p_user: userId, p_item: learningItemId, p_version: item.updated_at });
    if (result.error || !result.data || typeof result.data !== "object" || Array.isArray(result.data)) throw new Error("Claim unavailable");
    claim = result.data as typeof claim;
  } catch {
    return NextResponse.json({ status: "pending", error: "Preparation is unavailable. Try again later." }, { status: 503 });
  }
  if (claim.state !== "claimed" || !claim.attemptedAt || !claim.version) {
    const busy = claim.state === "busy" || claim.state === "ready";
    return NextResponse.json({ error: busy ? "This material is already being prepared or is ready. Refresh its details." : "Preparation limit reached. Try again later." }, { status: busy ? 409 : 429 });
  }
  // A late provider response cannot overwrite an edit, a deletion, or a replacement claim.
  const writeClaim = async (patch: Database["public"]["Tables"]["learning_items"]["Update"]) => {
    const result = await supabase.from("learning_items").update(patch).eq("id", learningItemId)
      .eq("updated_at", claim.version!).eq("playground_last_attempt_at", claim.attemptedAt!)
      .eq("playground_preparation_status", "processing").select("id");
    if (result.error) throw result.error;
    return Boolean(result.data?.length);
  };

  const setPending = async (code: string) => {
    await writeClaim({
      playground_preparation_status: "pending",
      playground_preparation_error: code
    });
  };
  const logUsage = async (eventType: "model-request" | "model-success" | "model-failure" | "fallback-used") => {
    const { error } = await supabase.from("ai_usage_events").insert({
      user_id: userId,
      feature: FEATURE,
      activity_type: null,
      material_hash: learningItemId,
      event_type: eventType,
      model
    });
    if (error) console.error("MSAV AI usage event was not recorded.", error);
  };

  const { data: category } = await supabase.from("categories").select("name").eq("id", item.category_id).maybeSingle();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    await logUsage("model-request");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You classify PECS/AAC learning materials into a fixed rule-based validator. Return JSON only." }] },
        contents: [{ role: "user", parts: [{ text: buildMsavClassificationPrompt(item, category?.name ?? "Uncategorized") }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 350, responseMimeType: "application/json" }
      })
    });

    if (!response.ok) {
      await setPending(response.status === 429 ? "rate_limited" : "provider_unavailable");
      await logUsage("model-failure");
      return NextResponse.json(
        { status: "pending", error: "Playground preparation is unavailable right now. Try again later." },
        { status: response.status === 429 ? 429 : 503 }
      );
    }

    const completion = (await response.json()) as GeminiResponse;
    const content = completion.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
    let parsed: { status?: unknown; profile?: unknown };
    try {
      parsed = JSON.parse(extractJson(content)) as { status?: unknown; profile?: unknown };
    } catch {
      await setPending("invalid_model_response");
      await logUsage("model-failure");
      return NextResponse.json({ status: "pending", error: "The material could not be prepared safely. Try again later." }, { status: 502 });
    }

    if (parsed.status === "unsupported") {
      const saved = await writeClaim({
        playground_preparation_status: "unsupported",
        msav_profile: null,
        playground_classifier_model: model,
        playground_preparation_error: "unsupported"
      });
      if (!saved) return NextResponse.json({ error: "This material changed. Refresh its details." }, { status: 409 });
      await logUsage("model-success");
      return NextResponse.json({ status: "unsupported" });
    }

    const profile = parsed.status === "supported" ? parseMsavMaterialProfile(parsed.profile, item.label) : null;
    if (!profile) {
      await setPending("invalid_model_response");
      await logUsage("model-failure");
      return NextResponse.json({ status: "pending", error: "The material could not be prepared safely. Try again later." }, { status: 502 });
    }

    const preparedAt = new Date().toISOString();
    const saved = await writeClaim({
      playground_preparation_status: "ready",
      msav_profile: profile,
      playground_prepared_at: preparedAt,
      playground_classifier_model: model,
      playground_preparation_error: null
    });
    if (!saved) return NextResponse.json({ error: "This material changed. Refresh its details." }, { status: 409 });
    await logUsage("model-success");
    return NextResponse.json({ status: "ready", profile, preparedAt, classifierModel: model });
  } catch (error) {
    console.error("MSAV Gemini preparation failed.", error);
    await setPending(controller.signal.aborted ? "provider_timeout" : "provider_unavailable").catch(() => undefined);
    await logUsage("model-failure");
    return NextResponse.json(
      { status: "pending", error: "Playground preparation is unavailable right now. Try again later." },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
