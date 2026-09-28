import { NextResponse } from "next/server";
import { requireActiveAdmin } from "@/lib/supabase/admin-guard";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ApproveRequestBody = {
  requestId?: unknown;
  password?: unknown;
};

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  let body: ApproveRequestBody;

  try {
    body = (await request.json()) as ApproveRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid approval request." }, { status: 400 });
  }

  const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!requestId || password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Choose a request and use a temporary password with at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const admin = await requireActiveAdmin();
  if ("error" in admin) return admin.error;

  let serviceClient: ReturnType<typeof createSupabaseServiceRoleClient>;
  try {
    serviceClient = createSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Supabase service role key is not configured." }, { status: 503 });
  }

  const { data: accountRequest, error: requestError } = await admin.sessionClient
    .from("account_requests")
    .select("id,name,email,status,created_at,reviewed_at,reviewed_by")
    .eq("id", requestId)
    .eq("status", "pending")
    .maybeSingle();

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 });
  }
  if (!accountRequest) {
    return NextResponse.json({ error: "This account request has already been reviewed." }, { status: 409 });
  }

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email: accountRequest.email,
    password,
    email_confirm: true,
    user_metadata: { name: accountRequest.name }
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "The account could not be created." }, { status: 500 });
  }

  const createdUserId = created.user.id;

  async function cleanupIncompleteAccount() {
    let failed = false;
    try {
      const { error } = await serviceClient.from("profiles").delete().eq("id", createdUserId);
      failed ||= Boolean(error);
    } catch {
      failed = true;
    }
    try {
      const { error } = await serviceClient.auth.admin.deleteUser(createdUserId);
      failed ||= Boolean(error);
    } catch {
      failed = true;
    }
    return failed;
  }

  const { data: profile, error: profileError } = await admin.sessionClient
    .from("profiles")
    .upsert({
      id: createdUserId,
      name: accountRequest.name,
      email: accountRequest.email,
      role: "teacher",
      status: "active",
      updated_at: new Date().toISOString()
    })
    .select("id,name,email,role,status")
    .single();

  if (profileError || !profile) {
    const cleanupFailed = await cleanupIncompleteAccount();
    return NextResponse.json(
      {
        error: cleanupFailed
          ? "The profile failed and the incomplete account could not be fully cleaned up."
          : profileError?.message ?? "The account profile could not be created."
      },
      { status: 500 }
    );
  }

  const reviewedAt = new Date().toISOString();
  const { data: reviewed, error: reviewError } = await admin.sessionClient
    .from("account_requests")
    .update({ status: "approved", reviewed_at: reviewedAt, reviewed_by: admin.profile.id })
    .eq("id", accountRequest.id)
    .eq("status", "pending")
    .select("id,name,email,status,created_at,reviewed_at,reviewed_by")
    .maybeSingle();

  if (reviewError || !reviewed) {
    const cleanupFailed = await cleanupIncompleteAccount();
    return NextResponse.json(
      {
        error: cleanupFailed
          ? "The request could not be completed and the incomplete account could not be fully cleaned up."
          : reviewError?.message ?? "The request was already reviewed."
      },
      { status: reviewError ? 500 : 409 }
    );
  }

  await serviceClient.from("audit_logs").insert({
    category: "admin",
    action: "create",
    actor_id: admin.profile.id,
    actor_name: admin.profile.name,
    target_type: "account_request",
    target_id: profile.id,
    target_title: profile.email,
    detail: `${admin.profile.name} approved ${profile.name}'s teacher account request.`,
    created_at: reviewedAt
  });

  return NextResponse.json({
    user: profile,
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
