"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";

interface AuthMe {
  active_workspace_id: string | null;
}

interface Workspace {
  id: string;
}

/** Active workspace id for cache keys and data scoping (undefined when auth is off). */
export function useActiveWorkspaceId(): string | undefined {
  const { data: me } = useQuery<AuthMe>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetchJson<AuthMe>("/auth/me"),
    enabled: AUTH_ENABLED,
  });

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: () => apiFetchJson<Workspace[]>("/workspaces/"),
    enabled: AUTH_ENABLED,
  });

  if (!AUTH_ENABLED) {
    return undefined;
  }

  const active = me?.active_workspace_id;
  if (active && workspaces?.some((workspace) => workspace.id === active)) {
    return active;
  }

  return workspaces?.[0]?.id;
}