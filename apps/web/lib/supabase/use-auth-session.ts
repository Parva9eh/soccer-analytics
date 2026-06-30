"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, isLoading, isAuthenticated: Boolean(session?.access_token) };
}