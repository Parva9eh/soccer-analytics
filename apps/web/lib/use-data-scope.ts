"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { COLLABORATION_QUERY_OPTIONS } from "@/lib/collaboration-queries";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { useAuthMeQuery } from "@/lib/use-auth-me-query";
import { useCollaborationQueriesEnabled } from "@/lib/use-collaboration-queries-enabled";

interface Workspace {
  id: string;
}

/**
 * Resolves guest vs signed-in and stable workspace id before workspace-scoped API calls.
 * Prevents guest summary/catalog from flashing before the session workspace is known.
 */
export function useDataScope() {
  const { session, isLoading: authLoading } = useAuthSession();
  const collaborationEnabled = useCollaborationQueriesEnabled();
  const authMe = useAuthMeQuery();

  const { data: workspaces, isFetched: workspacesFetched } = useQuery<Workspace[]>(
    {
      queryKey: ["workspaces"],
      queryFn: () => apiFetchJson<Workspace[]>("/workspaces/"),
      enabled: collaborationEnabled && authMe.isSuccess,
      ...COLLABORATION_QUERY_OPTIONS,
    },
  );

  const authResolved = !AUTH_ENABLED || !authLoading;
  const signedIn = AUTH_ENABLED && Boolean(session?.access_token);
  const isGuest = authResolved && AUTH_ENABLED && !signedIn;

  const activeFromMe = authMe.data?.active_workspace_id;
  const workspaceId = !signedIn
    ? undefined
    : activeFromMe && workspaces?.some((workspace) => workspace.id === activeFromMe)
      ? activeFromMe
      : workspaces?.[0]?.id;

  const workspaceScopeReady =
    isGuest ||
    !collaborationEnabled ||
    (authMe.isSuccess &&
      workspacesFetched &&
      (workspaceId !== undefined || (workspaces?.length ?? 0) === 0));

  const scopeReady = authResolved && workspaceScopeReady;

  return {
    scopeReady,
    authResolved,
    isGuest,
    signedIn,
    workspaceId,
  };
}