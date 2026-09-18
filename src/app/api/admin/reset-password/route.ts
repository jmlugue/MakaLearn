import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/supabase/admin-guard";

export const runtime = "nodejs";

type ResetPasswordRequest = {
  userId?: unknown;
  password?: unknown;
};

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  let body: ResetPasswordRequest;

  try {
    body = (await request.json()) as ResetPasswordRequest;
  } catch {
    return NextResponse.json({ error: "Invalid password reset request." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!userId) {
    return NextResponse.json({ error: "Choose a teacher account to reset." }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `The temporary password needs at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  const admin = await requireActiveAdmin();
  if ("error" in admin) return admin.error;

  if (userId === admin.profile.id) {
    return NextResponse.json({ error: "Use Profile to change your own password." }, { status: 400 });
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

  // Supabase Auth Admin: this must stay server-side because it uses the service role key.
  const { error: updateError } = await serviceClient.auth.admin.updateUserById(userId, { password });

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  try {
    await serviceClient.from("audit_logs").insert({
      category: "auth",
      action: "edit",
      actor_id: admin.profile.id,
      actor_name: admin.profile.name,
      target_type: "teacher_password",
      target_id: targetProfile.id,
      target_title: targetProfile.email,
      detail: `${admin.profile.name} set a temporary password for ${targetProfile.name}.`,
      created_at: new Date().toISOString()
    });
  } catch {
    // Audit logging should not block a successful password reset.
  }

  return NextResponse.json({ message: `${targetProfile.name} can now sign in with the temporary password.` });
}
