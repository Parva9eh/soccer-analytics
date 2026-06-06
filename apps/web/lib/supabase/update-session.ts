import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ENABLED,
  isAuthRequiredPath,
  isPublicPath,
} from "@/lib/auth-config";
import { hasSupabaseEnv } from "./env";

/** Refresh Supabase session cookies and enforce auth redirects in Next.js proxy. */
export async function updateSession(request: NextRequest) {
  if (!AUTH_ENABLED) {
    return NextResponse.next({ request });
  }

  if (!hasSupabaseEnv()) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "missing_supabase_env");
    return NextResponse.redirect(loginUrl);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && isAuthRequiredPath(pathname)) {
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

  return supabaseResponse;
}