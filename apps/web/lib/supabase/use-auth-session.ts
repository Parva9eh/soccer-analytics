"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
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

function subscribeToE2eAuth(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function useAuthSession() {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const e2eAuthActive = useSyncExternalStore(
    subscribeToE2eAuth,
    () => isE2eAuthRequested(),
    () => false,
  );

  const e2eSession = useMemo(
    () =>
      AUTH_ENABLED && E2E_AUTH_ENABLED && isClient && e2eAuthActive
        ? buildE2eSession()
        : null,
    [isClient, e2eAuthActive],
  );

  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [supabaseLoading, setSupabaseLoading] = useState(
    AUTH_ENABLED && !E2E_AUTH_ENABLED,
  );

  useEffect(() => {
    if (e2eSession) {
      setCachedAccessToken(E2E_ACCESS_TOKEN);
    }
  }, [e2eSession]);

  useEffect(() => {
    if (!AUTH_ENABLED || E2E_AUTH_ENABLED) {
      return;
    }

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSupabaseSession(current);
      setCachedAccessToken(current?.access_token ?? null);
      setSupabaseLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSupabaseSession(next);
      setCachedAccessToken(next?.access_token ?? null);
      setSupabaseLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!AUTH_ENABLED) {
    return { session: null, isLoading: false, isAuthenticated: false };
  }

  if (E2E_AUTH_ENABLED) {
    return {
      session: e2eSession,
      isLoading: !isClient,
      isAuthenticated: Boolean(e2eSession?.access_token),
    };
  }

  return {
    session: supabaseSession,
    isLoading: supabaseLoading,
    isAuthenticated: Boolean(supabaseSession?.access_token),
  };
}