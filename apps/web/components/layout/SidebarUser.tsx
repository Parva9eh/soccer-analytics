"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { SignOutButton } from "@/components/auth/SignOutButton";

interface AuthMe {
  id: string;
  email: string | null;
  display_name: string | null;
}

function sessionDisplayName(session: {
  user: {
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  };
}): string {
  const meta = session.user.user_metadata ?? {};
  const fromMeta =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    null;

  return fromMeta || session.user.email || "Account";
}

export function SidebarUser() {
  const { session, isLoading: sessionLoading } = useAuthSession();

  const { data } = useQuery<AuthMe>({
    queryKey: ["auth-me", session?.access_token],
    queryFn: () => apiFetchJson<AuthMe>("/auth/me"),
    enabled: AUTH_ENABLED && Boolean(session?.access_token),
    retry: false,
    staleTime: 60_000,
  });

  if (!AUTH_ENABLED) {
    return (
      <Link
        href="/login"
        className="text-caption block px-1 text-muted-foreground hover:text-primary hover:underline"
      >
        Sign in
      </Link>
    );
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

  const label =
    data?.display_name || data?.email || sessionDisplayName(session);

  return (
    <div className="space-y-2">
      <p
        className="truncate px-1 text-xs font-medium text-foreground"
        title={label}
      >
        {label}
      </p>
      <SignOutButton />
    </div>
  );
}