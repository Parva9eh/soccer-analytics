"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AUTH_ENABLED,
  isAuthRequiredPath,
  isPublicPath,
} from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

/**
 * When auth is enabled, redirects to login only for collaboration/private routes.
 * Explore routes (dashboard, matches, players, analytics) allow guest browsing.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading } = useAuthSession();

  useEffect(() => {
    if (!AUTH_ENABLED || isLoading || isPublicPath(pathname)) return;
    if (!session && isAuthRequiredPath(pathname)) {
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const next =
        pathname && pathname !== "/"
          ? `${pathname}${search}`
          : "/";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isLoading, session, router, pathname]);

  if (!AUTH_ENABLED) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-caption animate-pulse">Checking session…</p>
      </div>
    );
  }

  if (!session && isAuthRequiredPath(pathname)) {
    return null;
  }

  return <>{children}</>;
}