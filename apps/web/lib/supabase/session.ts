import { AUTH_ENABLED } from "@/lib/auth-config";
import { createClient } from "./client";

/** Access token for API calls (browser only). */
export async function getAccessToken(): Promise<string | null> {
  if (!AUTH_ENABLED || typeof window === "undefined") {
    return null;
  }

  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}