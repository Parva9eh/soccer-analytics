/**
 * Same-origin relative return paths only — blocks open redirects after auth.
 * Rejects absolute URLs, scheme-relative (`//evil`), backslash tricks, etc.
 */
export function safeReturnPath(next: string | null | undefined, fallback = "/"): string {
  const raw = (next ?? "").trim();
  if (!raw) {
    return fallback;
  }

  // Disallow scheme-relative and absolute URLs.
  if (
    raw.startsWith("//")
    || raw.startsWith("\\\\")
    || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)
  ) {
    return fallback;
  }

  // Must be a path on this origin.
  if (!raw.startsWith("/")) {
    return fallback;
  }

  // Block encoded tricks that still escape (e.g. /\\evil, /\tevil).
  if (raw.startsWith("/\\") || raw.includes("://")) {
    return fallback;
  }

  // Normalize via URL against a fixed base; require path-only relative result.
  try {
    const base = "https://safe.invalid";
    const resolved = new URL(raw, base);
    if (resolved.origin !== base) {
      return fallback;
    }
    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    if (!path.startsWith("/") || path.startsWith("//")) {
      return fallback;
    }
    return path || fallback;
  } catch {
    return fallback;
  }
}

/** Absolute same-origin URL for server redirects. */
export function safeReturnUrl(next: string | null | undefined, origin: string, fallback = "/"): string {
  const path = safeReturnPath(next, fallback);
  return `${origin.replace(/\/$/, "")}${path}`;
}
