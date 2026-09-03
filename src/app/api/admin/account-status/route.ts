import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { AppUser } from "@/types";

export const runtime = "nodejs";

type AccountStatusRequest = {
  userId?: unknown;
  status?: unknown;
};

async function requireActiveAdmin() {
  const sessionClient = createSupabaseServerClient();
  const {
    data: { user },
    error: sessionError
  } = await sessionClient.auth.getUser();

  if (sessionError || !user) {
    return { error: NextResponse.json({ error: "Sign in as an admin before updating accounts." }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await sessionClient
    .from("profiles")
    .select("id,name,role,status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
    return { error: NextResponse.json({ error: "Only active admin accounts can update account status." }, { status: 403 }) };
  }

  return { profile };
}

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

  let admin;
  try {
    admin = await requireActiveAdmin();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

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

  const { data: profile, error } = await serviceClient
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
