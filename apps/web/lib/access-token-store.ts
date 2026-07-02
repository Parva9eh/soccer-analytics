/** In-memory access token synced from useAuthSession (browser only). */
let cachedAccessToken: string | null = null;

export function setCachedAccessToken(token: string | null): void {
  cachedAccessToken = token;
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}