import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/** Verify the account at the server boundary. Never accept an account ID from a request body. */
export async function requireFeedbackAccount() {
  const client = createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { status: 401 } as const;
  const profile = await client.from("profiles").select("role,status").eq("id", data.user.id).single();
  if (profile.error || profile.data?.status !== "active" || !["teacher", "admin"].includes(profile.data.role)) {
    return { status: 403 } as const;
  }
  return { userId: data.user.id } as const;
}

/** The database atomically reserves an attempt before a paid request. Failure never permits a call. */
export async function reserveGestureFeedback(userId: string) {
  const { data, error } = await createSupabaseServiceRoleClient().rpc("reserve_optional_ai_request", {
    p_user: userId, p_feature: "gesture-feedback"
  });
  return !error && data === true;
}
