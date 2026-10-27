import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPlaygroundStore } from "@/lib/playground-store";
import { getPlaygroundDecision } from "@/lib/playground-checker";
import { gradePlaygroundText } from "@/lib/playground-provider";
import { isPlaygroundReady } from "@/utils/msav-material-profile";
import { isPlaygroundPersonIdentity } from "@/utils/pecs-sentence-validation";

export const maxDuration = 30;
const reply = (decision: unknown = null, status = 200) =>
  NextResponse.json({ decision }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  try {
    // Explicit off switch also bypasses stored decisions and restores local MSAV.
    if (process.env.PLAYGROUND_CHECKER_MODE?.trim() === "algorithm") return reply();
    const db = createSupabaseServerClient();
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError || !auth.user) return reply(null, 401);
    const { data: profile, error: profileError } = await db.from("profiles").select("role,status").eq("id", auth.user.id).single();
    if (profileError || profile?.status !== "active" || !["teacher", "admin"].includes(profile.role)) return reply(null, 403);
    const body = await request.json();
    const ids: unknown = body?.cardIds;
    if (!Array.isArray(ids) || !ids.length || ids.length > 5 || ids.some((id) => typeof id !== "string" || !id || id.length > 120)) return reply(null, 400);
    const { data: rows, error } = await db.from("learning_items")
      .select("id,label,content_type,symbol_image_url,playground_preparation_status,msav_profile,category_id")
      .in("id", [...new Set(ids as string[])]);
    if (error) return reply();
    const ordered = (ids as string[]).map((id) => rows?.find((row) => row.id === id));
    if (ordered.some((row) => !row || !isPlaygroundReady({
      contentType: row.content_type, label: row.label, symbolImageUrl: row.symbol_image_url ?? undefined,
      playgroundPreparationStatus: row.playground_preparation_status ?? undefined, msavProfile: row.msav_profile ?? undefined
    } as Parameters<typeof isPlaygroundReady>[0]))) return reply({ valid: false, type: null });
    const text = ordered.map((row) => row!.label).join(" ");
    if (!text.trim() || text.length > 500) return reply(null, 400);
    // Apply the explicit teaching rule before legacy cache/provider decisions.
    // Categories come from the database, never from caller-supplied labels.
    const identityCards = ordered.map((row) => ({
      id: row!.id, label: row!.label,
      msavProfile: row!.msav_profile ?? undefined
    }));
    if (isPlaygroundPersonIdentity(identityCards)) return reply({ valid: true, type: "sentence" });
    if (ordered.length === 3 && ordered[0]!.label.trim().toLowerCase() === "i" &&
      ordered[1]!.label.trim().toLowerCase() === "am") {
      const { data: category, error: categoryError } = await db.from("categories")
        .select("name").eq("id", ordered[2]!.category_id).maybeSingle();
      if (categoryError) return reply();
      if (isPlaygroundPersonIdentity(identityCards.map((card, index) =>
        index === 2 ? { ...card, category: category?.name } : card))) {
        return reply({ valid: true, type: "sentence" });
      }
    }
    const model = process.env.GEMINI_PLAYGROUND_MODEL?.trim() || "gemini-3.5-flash-lite";
    const apiKey = process.env.GEMINI_PLAYGROUND_API_KEY?.trim();
    const store = createPlaygroundStore(text, auth.user.id, model);
    // Known decisions remain available even when a provider key is temporarily absent.
    const cached = await store.read();
    if (cached) return reply(cached);
    if (!apiKey) return reply();
    return reply(await getPlaygroundDecision(store, () => gradePlaygroundText(text, apiKey, model)));
  } catch {
    // No provider text or error detail is sent to learners.
    return reply();
  }
}
