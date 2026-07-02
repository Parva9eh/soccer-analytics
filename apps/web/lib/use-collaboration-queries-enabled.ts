"use client";

import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

/** True when signed-in collaboration API queries should run. */
export function useCollaborationQueriesEnabled(): boolean {
  const { session, isLoading } = useAuthSession();
  return AUTH_ENABLED && !isLoading && Boolean(session?.access_token);
}