/** When true, Next.js proxy requires a Supabase session for app routes. */
export const AUTH_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

export const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/invitations",
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}