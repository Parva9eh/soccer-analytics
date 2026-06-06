import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";
import { getSupabaseEnv } from "./env";

/** Supabase client for route handlers — writes session cookies onto the response. */
export function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse,
) {
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

export function resolveRedirectUrl(next: string, origin: string): string {
  if (next.startsWith("http://") || next.startsWith("https://")) {
    return next;
  }
  const path = next.startsWith("/") ? next : `/${next}`;
  return `${origin}${path}`;
}