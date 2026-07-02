"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { COLLABORATION_QUERY_OPTIONS } from "@/lib/collaboration-queries";
import { useCollaborationQueriesEnabled } from "@/lib/use-collaboration-queries-enabled";

export interface AuthMe {
  id: string;
  email: string | null;
  role: string;
  display_name: string | null;
  active_workspace_id: string | null;
  active_workspace_name: string | null;
}

/** Shared /auth/me query — gate other collaboration fetches on isSuccess. */
export function useAuthMeQuery() {
  const queriesEnabled = useCollaborationQueriesEnabled();

  return useQuery<AuthMe>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetchJson<AuthMe>("/auth/me"),
    enabled: queriesEnabled,
    ...COLLABORATION_QUERY_OPTIONS,
  });
}