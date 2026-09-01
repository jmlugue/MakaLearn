import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ResetPasswordRequest = {
  userId?: unknown;
};

export async function POST(request: Request) {
  let body: ResetPasswordRequest;

  try {
    body = (await request.json()) as ResetPasswordRequest;
  } catch {
    return NextResponse.json({ error: "Invalid password reset request." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "Choose a teacher account to reset." }, { status: 400 });
  }

  let sessionClient;
  try {
    sessionClient = createSupabaseServerClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
    error: sessionError
  } = await sessionClient.auth.getUser();

  if (sessionError || !user) {
    return NextResponse.json({ error: "Sign in as an admin before resetting passwords." }, { status: 401 });
  }

  const { data: adminProfile, error: adminProfileError } = await sessionClient
    .from("profiles")
    .select("id,name,role,status")
    .eq("id", user.id)
    .single();

  if (adminProfileError || !adminProfile || adminProfile.role !== "admin" || adminProfile.status !== "active") {
    return NextResponse.json({ error: "Only active admin accounts can reset teacher passwords." }, { status: 403 });
  }

  if (userId === user.id) {
    return NextResponse.json({ error: "Use Settings to change your own password." }, { status: 400 });
  }

  let serviceClient;
  try {
    serviceClient = createSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Supabase service role key is not configured." }, { status: 503 });
  }

  const { data: targetProfile, error: targetProfileError } = await serviceClient
    .from("profiles")
    .select("id,name,email,role")
    .eq("id", userId)
    .single();

  if (targetProfileError || !targetProfile) {
    return NextResponse.json({ error: "Teacher account was not found." }, { status: 404 });
  }

  if (targetProfile.role !== "teacher") {
    return NextResponse.json({ error: "Only teacher account passwords can be reset here." }, { status: 400 });
  }

  const temporaryPassword = process.env.SUPABASE_TEMPORARY_PASSWORD;
  if (!temporaryPassword) {
    return NextResponse.json({ error: "Temporary password is not configured." }, { status: 503 });
  }

  // Supabase Auth Admin: this must stay server-side because it uses the service role key.
  const { error: updateError } = await serviceClient.auth.admin.updateUserById(userId, {
    password: temporaryPassword
  });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  try {
    await serviceClient.from("audit_logs").insert({
      category: "auth",
      action: "edit",
      actor_id: adminProfile.id,
      actor_name: adminProfile.name,
      target_type: "teacher_password",
      target_id: targetProfile.id,
      target_title: targetProfile.email,
      detail: `${adminProfile.name} set a temporary password for ${targetProfile.name}.`,
      created_at: new Date().toISOString()
    });
  } catch {
    // Audit logging should not block a successful password reset.
  }

  return NextResponse.json({
    message: `${targetProfile.name} can now sign in with the temporary password.`
  });
}
