"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { SignOutButton } from "@/components/auth/SignOutButton";

interface AuthMe {
  id: string;
  email: string | null;
  display_name: string | null;
}

export function SidebarUser() {
  const { data } = useQuery<AuthMe>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetchJson<AuthMe>("/auth/me"),
    enabled: AUTH_ENABLED,
    retry: false,
  });

  if (!AUTH_ENABLED) {
    return null;
  }

  const label = data?.display_name || data?.email || "Signed in";

  return (
    <div className="space-y-2">
      <p className="truncate px-1 text-xs font-medium text-foreground" title={label}>
        {label}
      </p>
      <SignOutButton />
    </div>
  );
}