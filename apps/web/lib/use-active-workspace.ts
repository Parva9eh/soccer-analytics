"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { COLLABORATION_QUERY_OPTIONS } from "@/lib/collaboration-queries";
import { useAuthMeQuery } from "@/lib/use-auth-me-query";
import { useCollaborationQueriesEnabled } from "@/lib/use-collaboration-queries-enabled";

interface Workspace {
  id: string;
}

/** Active workspace id for signed-in users (undefined for guests or when auth is off). */
export function useActiveWorkspaceId(): string | undefined {
  const queriesEnabled = useCollaborationQueriesEnabled();
  const authMe = useAuthMeQuery();

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: () => apiFetchJson<Workspace[]>("/workspaces/"),
    enabled: queriesEnabled && authMe.isSuccess,
    ...COLLABORATION_QUERY_OPTIONS,
  });

  if (!queriesEnabled) {
    return undefined;
  }

  const active = authMe.data?.active_workspace_id;
  if (active && workspaces?.some((workspace) => workspace.id === active)) {
    return active;
  }

  return workspaces?.[0]?.id;
}