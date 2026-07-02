"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { setCachedAccessToken } from "@/lib/access-token-store";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { createClient } from "./client";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(AUTH_ENABLED);

  useEffect(() => {
    if (!AUTH_ENABLED) {
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