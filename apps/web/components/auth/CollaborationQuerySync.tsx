"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { COLLABORATION_QUERY_ROOTS } from "@/lib/collaboration-queries";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

/**
 * When the access token becomes available, drop stale 401 errors and refetch
 * collaboration queries (global staleTime would otherwise keep them for minutes).
 */
export function CollaborationQuerySync() {
  const queryClient = useQueryClient();
  const { session, isLoading } = useAuthSession();
  const syncedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!AUTH_ENABLED || isLoading) {
      return;
    }

    const token = session?.access_token ?? null;
    if (!token) {
      syncedToken.current = null;
      return;
    }

    if (syncedToken.current === token) {
      return;
    }

    syncedToken.current = token;

    for (const root of COLLABORATION_QUERY_ROOTS) {
      queryClient.removeQueries({
        queryKey: [root],
        predicate: (query) => query.state.status === "error",
      });
      void queryClient.invalidateQueries({ queryKey: [root] });
    }
  }, [isLoading, queryClient, session?.access_token]);

  return null;
}