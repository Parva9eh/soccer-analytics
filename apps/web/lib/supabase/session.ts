import {
  getCachedAccessToken,
  setCachedAccessToken,
} from "@/lib/access-token-store";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { createClient } from "./client";

/** Access token for API calls (browser only). */
export async function getAccessToken(): Promise<string | null> {
  if (!AUTH_ENABLED || typeof window === "undefined") {
    return null;
  }

  const cached = getCachedAccessToken();
  if (cached) {
    return cached;
  }

  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;
    if (token) {
      setCachedAccessToken(token);
    }
    return token;
  } catch {
    return null;
  }
}