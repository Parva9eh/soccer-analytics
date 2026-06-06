/** When true, collaboration routes require a Supabase session. */
export const AUTH_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

export const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/invitations",
] as const;

/** Read-only app routes available without signing in when auth is enabled. */
export const GUEST_BROWSE_PATH_PREFIXES = [
  "/matches",
  "/players",
  "/analytics",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isGuestBrowsablePath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }
  return GUEST_BROWSE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** True when auth is on and the route needs a signed-in session. */
export function isAuthRequiredPath(pathname: string): boolean {
  if (!AUTH_ENABLED) {
    return false;
  }
  if (isPublicPath(pathname)) {
    return false;
  }
  return !isGuestBrowsablePath(pathname);
}