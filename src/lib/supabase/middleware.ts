import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  await supabase.auth.getUser();

  return response;
}
