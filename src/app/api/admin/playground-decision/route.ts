import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { playgroundInput } from "@/lib/playground-store";
import { PLAYGROUND_POLICY_VERSION, parsePlaygroundDecision } from "@/utils/playground-grading";

/** Maintenance endpoint, not a learner-facing control. Corrections are audited atomically. */
export async function POST(request: Request) {
  try {
    const db = createSupabaseServerClient();
    const { data: auth, error: authError } = await db.auth.getUser();
    if (authError || !auth.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { data: profile } = await db.from("profiles").select("role,status").eq("id", auth.user.id).single();
    if (profile?.role !== "admin" || profile.status !== "active") return NextResponse.json({ error: "Administrator required." }, { status: 403 });
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text : "";
    const decision = parsePlaygroundDecision(body?.decision, text);
    if (!text.trim() || text.length > 500 || !decision) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
    const { normalized, hash } = playgroundInput(text);
    const { error } = await createSupabaseServiceRoleClient().rpc("correct_playground_check", {
      p_policy: PLAYGROUND_POLICY_VERSION, p_hash: hash, p_text: normalized, p_user: auth.user.id,
      p_valid: decision.valid, p_type: decision.type
    });
    if (error) throw error;
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "The decision could not be saved." }, { status: 503 });
  }
}
