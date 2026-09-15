import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "@/lib/supabase/admin-guard";
import type { UserRole } from "@/types";

export const runtime = "nodejs";

// Path kept as "create-teacher" for compatibility; it now creates teacher or admin accounts.
type CreateAccountRequest = {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  password?: unknown;
};

const MIN_PASSWORD_LENGTH = 6;

function isUserRole(value: unknown): value is UserRole {
  return value === "admin" || value === "teacher";
}

export async function POST(request: Request) {
  let body: CreateAccountRequest;

  try {
    body = (await request.json()) as CreateAccountRequest;
  } catch {
    return NextResponse.json({ error: "Invalid account request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role: UserRole = isUserRole(body.role) ? body.role : "teacher";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a name and valid email address." }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: `The temporary password needs at least ${MIN_PASSWORD_LENGTH} characters.` }, { status: 400 });
  }

  const admin = await requireActiveAdmin();
  if ("error" in admin) return admin.error;

  let serviceClient;
  try {
    serviceClient = createSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Supabase service role key is not configured." }, { status: 503 });
  }

  // The admin types the temporary password and shares it with the new user privately.
  const { data: created, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role }
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Account could not be created." }, { status: 500 });
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .upsert({
      id: created.user.id,
      name,
      email,
      role,
      status: "active",
      updated_at: new Date().toISOString()
    })
    .select("id,name,email,role,status")
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Account profile could not be created." }, { status: 500 });
  }

  await serviceClient.from("audit_logs").insert({
    category: "admin",
    action: "create",
    actor_id: admin.profile.id,
    actor_name: admin.profile.name,
    target_type: "teacher_account",
    target_id: profile.id,
    target_title: profile.email,
    detail: `${admin.profile.name} created ${role} account ${profile.name}.`,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({ user: profile });
}
