"use client";

import Link from "next/link";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

export function GuestBrowsingBanner() {
  const { session, isLoading } = useAuthSession();

  if (!AUTH_ENABLED || isLoading || session) {
    return null;
  }

  return (
    <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-center text-caption text-muted-foreground">
      Browsing as guest — La Liga 2020/21 demo data.{" "}
      <Link
        href="/login"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Sign in
      </Link>{" "}
      for workspaces, reports, and saved match views.
    </div>
  );
}