import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/supabase/admin-guard";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RejectRequestBody = {
  requestId?: unknown;
};

export async function POST(request: Request) {
  let body: RejectRequestBody;

  try {
    body = (await request.json()) as RejectRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid rejection request." }, { status: 400 });
  }

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  if (!requestId) {
    return NextResponse.json({ error: "Choose an account request." }, { status: 400 });
  }

  const admin = await requireActiveAdmin();
  if ("error" in admin) return admin.error;

  let serviceClient;
  try {
    serviceClient = createSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Supabase service role key is not configured." }, { status: 503 });
  }

  const reviewedAt = new Date().toISOString();
  const { data: reviewed, error } = await admin.sessionClient
    .from("account_requests")
    .update({ status: "rejected", reviewed_at: reviewedAt, reviewed_by: admin.profile.id })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id,name,email,status,created_at,reviewed_at,reviewed_by")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!reviewed) {
    return NextResponse.json({ error: "This account request has already been reviewed." }, { status: 409 });
  }

  await serviceClient.from("audit_logs").insert({
    category: "admin",
    action: "edit",
    actor_id: admin.profile.id,
    actor_name: admin.profile.name,
    target_type: "account_request",
    target_id: reviewed.id,
    target_title: reviewed.email,
    detail: `${admin.profile.name} rejected ${reviewed.name}'s teacher account request.`,
    created_at: reviewedAt
  });

  return NextResponse.json({
    request: {
      id: reviewed.id,
      name: reviewed.name,
      email: reviewed.email,
      status: reviewed.status,
      createdAt: reviewed.created_at,
      reviewedAt: reviewed.reviewed_at,
      reviewedBy: reviewed.reviewed_by
    }
  });
}
