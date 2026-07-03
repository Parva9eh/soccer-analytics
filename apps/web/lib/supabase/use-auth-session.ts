"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { setCachedAccessToken } from "@/lib/access-token-store";
import { AUTH_ENABLED } from "@/lib/auth-config";
import {
  E2E_ACCESS_TOKEN,
  E2E_AUTH_ENABLED,
  E2E_USER_ID,
  isE2eAuthRequested,
} from "@/lib/e2e-auth";
import { createClient } from "./client";

function buildE2eSession(): Session {
  const now = Math.floor(Date.now() / 1000);
  const user: User = {
    id: E2E_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "e2e@soccer-analytics.test",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };

  return {
    access_token: E2E_ACCESS_TOKEN,
    refresh_token: "e2e-refresh-token",
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: "bearer",
    user,
  };
}

function readInitialAuthState(): { session: Session | null; isLoading: boolean } {
  if (!AUTH_ENABLED) {
    return { session: null, isLoading: false };
  }

  return { session: null, isLoading: true };
}

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(
    () => readInitialAuthState().session,
  );
  const [isLoading, setIsLoading] = useState(
    () => readInitialAuthState().isLoading,
  );

  useEffect(() => {
    if (!AUTH_ENABLED) {
      return;
    }

    if (E2E_AUTH_ENABLED) {
      if (isE2eAuthRequested()) {
        const session = buildE2eSession();
        setSession(session);
        setCachedAccessToken(E2E_ACCESS_TOKEN);
      }
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setCachedAccessToken(current?.access_token ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setCachedAccessToken(next?.access_token ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, isLoading, isAuthenticated: Boolean(session?.access_token) };
}