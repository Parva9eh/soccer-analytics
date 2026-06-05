"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetchJson, ApiError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { SignOutButton } from "@/components/auth/SignOutButton";

interface AuthMe {
  id: string;
  email: string | null;
  display_name: string | null;
}

export function SidebarUser() {
  const { session, isLoading: sessionLoading, isAuthenticated } =
    useAuthSession();

  const { data, error, isLoading: profileLoading } = useQuery<AuthMe>({
    queryKey: ["auth-me", session?.access_token],
    queryFn: () => apiFetchJson<AuthMe>("/auth/me"),
    enabled: AUTH_ENABLED && isAuthenticated,
    retry: false,
  });

  if (!AUTH_ENABLED) {
    return null;
  }

  if (sessionLoading) {
    return <p className="text-caption px-1">Checking session…</p>;
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="text-caption block px-1 text-primary hover:underline"
      >
        Sign in
      </Link>
    );
  }

  if (profileLoading) {
    return <p className="text-caption px-1">Loading profile…</p>;
  }

  if (error) {
    const hint =
      error instanceof ApiError && error.status === 401
        ? "API rejected your session (check SUPABASE_JWT_SECRET)."
        : "Could not verify session with the API.";

    return (
      <div className="space-y-2">
        <p className="text-caption px-1 text-destructive" title={hint}>
          Session invalid
        </p>
        <SignOutButton label="Clear session" />
      </div>
    );
  }

  const label =
    data?.display_name || data?.email || session.user.email || "Account";

  return (
    <div className="space-y-2">
      <p className="truncate px-1 text-xs font-medium text-foreground" title={label}>
        {label}
      </p>
      <SignOutButton />
    </div>
  );
}