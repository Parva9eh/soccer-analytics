"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

interface AuthMe {
  active_workspace_id: string | null;
}

interface Workspace {
  id: string;
}

/** Active workspace id for signed-in users (undefined for guests or when auth is off). */
export function useActiveWorkspaceId(): string | undefined {
  const { session } = useAuthSession();
  const signedIn = AUTH_ENABLED && Boolean(session?.access_token);

  const { data: me } = useQuery<AuthMe>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetchJson<AuthMe>("/auth/me"),
    enabled: signedIn,
  });

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: () => apiFetchJson<Workspace[]>("/workspaces/"),
    enabled: signedIn,
  });

  if (!signedIn) {
    return undefined;
  }

  const active = me?.active_workspace_id;
  if (active && workspaces?.some((workspace) => workspace.id === active)) {
    return active;
  }

  return workspaces?.[0]?.id;
}