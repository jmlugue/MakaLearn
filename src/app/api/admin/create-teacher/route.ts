import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type CreateTeacherRequest = {
  name?: unknown;
  email?: unknown;
};

async function requireActiveAdmin() {
  const sessionClient = createSupabaseServerClient();
  const {
    data: { user },
    error: sessionError
  } = await sessionClient.auth.getUser();

  if (sessionError || !user) {
    return { error: NextResponse.json({ error: "Sign in as an admin before creating teachers." }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await sessionClient
    .from("profiles")
    .select("id,name,role,status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
    return { error: NextResponse.json({ error: "Only active admin accounts can create teachers." }, { status: 403 }) };
  }

  return { profile };
}

export async function POST(request: Request) {
  let body: CreateTeacherRequest;

  try {
    body = (await request.json()) as CreateTeacherRequest;
  } catch {
    return NextResponse.json({ error: "Invalid teacher account request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!name || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a teacher name and valid email address." }, { status: 400 });
  }

  let admin;
  try {
    admin = await requireActiveAdmin();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  if ("error" in admin) return admin.error;

  let serviceClient;
  try {
    serviceClient = createSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Supabase service role key is not configured." }, { status: 503 });
  }

  const temporaryPassword = process.env.SUPABASE_TEMPORARY_PASSWORD;
  if (!temporaryPassword) {
    return NextResponse.json({ error: "Temporary password is not configured." }, { status: 503 });
  }

  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name, role: "teacher" }
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Teacher account could not be created." }, { status: 500 });
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .upsert({
      id: created.user.id,
      name,
      email,
      role: "teacher",
      status: "active",
      updated_at: new Date().toISOString()
    })
    .select("id,name,email,role,status")
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Teacher profile could not be created." }, { status: 500 });
  }

  await serviceClient.from("audit_logs").insert({
    category: "admin",
    action: "create",
    actor_id: admin.profile.id,
    actor_name: admin.profile.name,
    target_type: "teacher_account",
    target_id: profile.id,
    target_title: profile.email,
    detail: `${admin.profile.name} created teacher account ${profile.name}.`,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({ user: profile });
}
