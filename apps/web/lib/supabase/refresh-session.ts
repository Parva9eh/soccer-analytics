import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

export interface RefreshSessionOptions {
  /** Attach Bearer token to the forwarded request (for /backend API proxy). */
  injectAuthorization?: boolean;
}

export interface RefreshSessionResult {
  response: NextResponse;
  user: User | null;
  accessToken: string | null;
}

/** Refresh Supabase session cookies; optionally inject Authorization for API proxy. */
export async function refreshSupabaseSession(
  request: NextRequest,
  options: RefreshSessionOptions = {},
): Promise<RefreshSessionResult> {
  const { url, anonKey } = getSupabaseEnv();

  let requestHeaders = new Headers(request.headers);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
          response.cookies.set(name, value, cookieOptions),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token ?? null;

  if (options.injectAuthorization && accessToken) {
    requestHeaders = new Headers(request.headers);
    requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    const withAuth = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.cookies.getAll().forEach((cookie) => {
      withAuth.cookies.set(cookie);
    });
    response = withAuth;
  }

  return { response, user: user ?? null, accessToken };
}