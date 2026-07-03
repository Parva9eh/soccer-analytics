import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ENABLED, isAuthRequiredPath } from "@/lib/auth-config";
import { E2E_AUTH_ENABLED } from "@/lib/e2e-auth";
import { hasSupabaseEnv } from "./env";
import { refreshSupabaseSession } from "./refresh-session";

function isBackendProxyPath(pathname: string): boolean {
  return pathname === "/backend" || pathname.startsWith("/backend/");
}

/** Refresh Supabase session cookies and enforce auth redirects in Next.js proxy. */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isBackendProxyPath(pathname)) {
    if (!hasSupabaseEnv()) {
      return NextResponse.next({ request });
    }

    const { response } = await refreshSupabaseSession(request, {
      injectAuthorization: true,
    });
    return response;
  }

  if (!AUTH_ENABLED) {
    return NextResponse.next({ request });
  }

  if (!hasSupabaseEnv()) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "missing_supabase_env");
    return NextResponse.redirect(loginUrl);
  }

  const { response, user } = await refreshSupabaseSession(request);

  if (!user && isAuthRequiredPath(pathname)) {
    // Playwright signed-in smoke uses client-side mock session (localStorage).
    if (E2E_AUTH_ENABLED) {
      return response;
    }

    const loginUrl = request.nextUrl.clone();
    const returnTo = `${pathname}${request.nextUrl.search}`;
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", returnTo);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const next = request.nextUrl.searchParams.get("next") || "/";
    return NextResponse.redirect(new URL(next, request.url));
  }

  return response;
}