const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getApiUrl(path: string): string {
  // Ensure no double slashes
  const base = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

// Convenience fetch wrapper (can be expanded later with error handling, etc.)
export async function apiFetch(path: string, init?: RequestInit) {
  return fetch(getApiUrl(path), init);
}
