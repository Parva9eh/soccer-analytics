import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";
import { safeReturnUrl } from "@/lib/auth/safe-return-path";
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

/** Same-origin only — never redirect to absolute external URLs after auth. */
export function resolveRedirectUrl(next: string, origin: string): string {
  return safeReturnUrl(next, origin, "/");
}
