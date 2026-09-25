import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Resolves the signed-in active admin, or a ready-to-return error response. */
export async function requireActiveAdmin() {
  let sessionClient;
  try {
    sessionClient = createSupabaseServerClient();
  } catch {
    return { error: NextResponse.json({ error: "Supabase is not configured." }, { status: 503 }) };
  }

  const {
    data: { user },
    error: sessionError
  } = await sessionClient.auth.getUser();

  if (sessionError || !user) {
    return { error: NextResponse.json({ error: "Sign in as an admin first." }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await sessionClient
    .from("profiles")
    .select("id,name,role,status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") {
    return { error: NextResponse.json({ error: "Only active admin accounts can do this." }, { status: 403 }) };
  }

  // sessionClient acts as this admin, so database rules and triggers see an admin, not the service role.
  return { profile, sessionClient };
}

/**
 * True when `userId` is the only active admin. Used to block demoting or deactivating them,
 * which would leave nobody able to manage accounts.
 */
export async function isLastActiveAdmin(serviceClient: SupabaseClient<Database>, userId: string) {
  const { data, error } = await serviceClient.from("profiles").select("id").eq("role", "admin").eq("status", "active");
  if (error || !data) return false;
  return data.length === 1 && data[0].id === userId;
}
