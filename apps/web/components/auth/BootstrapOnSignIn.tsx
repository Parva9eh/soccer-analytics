"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

/**
 * After OAuth/email sign-in, ensure the user has a default workspace (API no-op if one exists).
 */
export function BootstrapOnSignIn() {
  const queryClient = useQueryClient();
  const { session, isLoading } = useAuthSession();
  const bootstrappedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!AUTH_ENABLED || isLoading || !session?.access_token || !session.user.id) {
      return;
    }

    if (bootstrappedUserId.current === session.user.id) {
      return;
    }

    bootstrappedUserId.current = session.user.id;

    void (async () => {
      const res = await apiFetch("/auth/bootstrap", { method: "POST" });
      if (!res.ok) {
        bootstrappedUserId.current = null;
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      await queryClient.invalidateQueries({ queryKey: ["workspace-reports"] });
      await queryClient.invalidateQueries({ queryKey: ["saved-analyses"] });
      await queryClient.invalidateQueries({ queryKey: ["reports-dashboard"] });
    })();
  }, [isLoading, queryClient, session?.access_token, session?.user.id]);

  return null;
}