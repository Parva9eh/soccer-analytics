import { safeReturnPath } from "@/lib/auth/safe-return-path";

function getOrigin(): string {
  return typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

export function getAuthCallbackUrl(nextPath: string): string {
  const next = safeReturnPath(nextPath, "/");
  return `${getOrigin()}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Post-confirmation destination passed to Supabase as emailRedirectTo ({{ .RedirectTo }}). */
export function getEmailConfirmDestination(nextPath: string): string {
  const next = safeReturnPath(nextPath, "/");
  return `${getOrigin()}${next}`;
}