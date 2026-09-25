import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isLastActiveAdmin, requireActiveAdmin } from "@/lib/supabase/admin-guard";
import type { AppUser } from "@/types";

export const runtime = "nodejs";

type AccountStatusRequest = {
  userId?: unknown;
  status?: unknown;
};

function isProfileStatus(value: unknown): value is AppUser["status"] {
  return value === "active" || value === "invited" || value === "deactivated";
}

export async function POST(request: Request) {
  let body: AccountStatusRequest;

  try {
    body = (await request.json()) as AccountStatusRequest;
  } catch {
    return NextResponse.json({ error: "Invalid account status request." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId || !isProfileStatus(body.status)) {
    return NextResponse.json({ error: "Choose an account and status." }, { status: 400 });
  }

  const admin = await requireActiveAdmin();
  if ("error" in admin) return admin.error;

  if (admin.profile.id === userId) {
    return NextResponse.json({ error: "Sign in with another admin to update your own status." }, { status: 400 });
  }

  let serviceClient;
  try {
    serviceClient = createSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Supabase service role key is not configured." }, { status: 503 });
  }

  if (body.status !== "active" && (await isLastActiveAdmin(serviceClient, userId))) {
    return NextResponse.json({ error: "This is the only active admin and cannot be deactivated." }, { status: 400 });
  }

  // Update as the signed-in admin, not the service role. The profiles trigger calls
  // private.current_user_role(), and the service role cannot use the private schema until
  // supabase/migrations/20260926000000_service_role_private_schema.sql is run.
  const { data: profile, error } = await admin.sessionClient
    .from("profiles")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id,name,email,role,status")
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: error?.message ?? "Account status could not be updated." }, { status: 500 });
  }

  await serviceClient.from("audit_logs").insert({
    category: "admin",
    action: "edit",
    actor_id: admin.profile.id,
    actor_name: admin.profile.name,
    target_type: "account_status",
    target_id: profile.id,
    target_title: profile.email,
    detail: `${admin.profile.name} changed ${profile.name} to ${profile.status}.`,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({ user: profile });
}
