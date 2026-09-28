import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AccountRequestBody = {
  name?: unknown;
  email?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCEPTED_MESSAGE = "Your request has been sent for admin review.";

export async function POST(request: Request) {
  let body: AccountRequestBody;

  try {
    body = (await request.json()) as AccountRequestBody;
  } catch {
    return NextResponse.json({ error: "Enter your name and school email." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Enter a valid school email address." }, { status: 400 });
  }

  let serviceClient;
  try {
    serviceClient = createSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Account requests are not configured yet." }, { status: 503 });
  }

  // Existing accounts and repeated pending requests get the same neutral reply.
  // This keeps the public form from revealing which email addresses are registered.
  const [profileResult, pendingResult] = await Promise.all([
    serviceClient.from("profiles").select("id").eq("email", email).maybeSingle(),
    serviceClient.from("account_requests").select("id").eq("email", email).eq("status", "pending").maybeSingle()
  ]);

  if (profileResult.error || pendingResult.error) {
    return NextResponse.json({ error: "Your request could not be sent. Try again." }, { status: 500 });
  }

  if (profileResult.data || pendingResult.data) {
    return NextResponse.json({ accepted: true, message: ACCEPTED_MESSAGE }, { status: 202 });
  }

  const { error } = await serviceClient.from("account_requests").insert({ name, email });
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Your request could not be sent. Try again." }, { status: 500 });
  }

  return NextResponse.json({ accepted: true, message: ACCEPTED_MESSAGE }, { status: 202 });
}
