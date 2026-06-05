"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

/**
 * Client guard when auth is enabled: redirects to login if there is no session.
 * Complements the server proxy (e.g. when env was missing at proxy build time).
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, isLoading } = useAuthSession();

  useEffect(() => {
    if (!AUTH_ENABLED || isLoading) return;
    if (!session) {
      const next = pathname && pathname !== "/" ? pathname : "/";
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

  if (!session) {
    return null;
  }

  return <>{children}</>;
}