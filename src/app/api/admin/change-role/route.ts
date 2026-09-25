import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isLastActiveAdmin, requireActiveAdmin } from "@/lib/supabase/admin-guard";
import type { UserRole } from "@/types";

export const runtime = "nodejs";

type ChangeRoleRequest = {
  userId?: unknown;
  role?: unknown;
};

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "teacher";
}

export async function POST(request: Request) {
  let body: ChangeRoleRequest;

  try {
    body = (await request.json()) as ChangeRoleRequest;
  } catch {
    return NextResponse.json({ error: "Invalid role change request." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId || !isUserRole(body.role)) {
    return NextResponse.json({ error: "Choose an account and role." }, { status: 400 });
  }

  const admin = await requireActiveAdmin();
  if ("error" in admin) return admin.error;

  if (admin.profile.id === userId) {
    return NextResponse.json({ error: "Ask another admin to change your own role." }, { status: 400 });
  }

  let serviceClient;
  try {
    serviceClient = createSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Supabase service role key is not configured." }, { status: 503 });
  }

  if (body.role === "teacher" && (await isLastActiveAdmin(serviceClient, userId))) {
    return NextResponse.json({ error: "This is the only active admin. Make someone else an admin first." }, { status: 400 });
  }

  // Update as the signed-in admin, not the service role. The profiles trigger calls
  // private.current_user_role(), and the service role cannot use the private schema until
  // supabase/migrations/20260926000000_service_role_private_schema.sql is run.
  const { data: profile, error } = await admin.sessionClient
    .from("profiles")
    .update({ role: body.role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select("id,name,email,role,status")
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: error?.message ?? "Role could not be updated." }, { status: 500 });
  }

  await serviceClient.from("audit_logs").insert({
    category: "admin",
    action: "edit",
    actor_id: admin.profile.id,
    actor_name: admin.profile.name,
    target_type: "account_role",
    target_id: profile.id,
    target_title: profile.email,
    detail: `${admin.profile.name} changed ${profile.name} to ${profile.role}.`,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({ user: profile });
}
