import { getCachedAccessToken } from "@/lib/access-token-store";
import { getAccessToken } from "@/lib/supabase/session";

function getConfiguredApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(
    /\/$/,
    "",
  );
}

/** True when the web app proxies API calls through same-origin /backend. */
export function usesSameOriginApiProxy(): boolean {
  const configured = getConfiguredApiBaseUrl();
  if (configured === "/backend" || configured.endsWith("/backend")) {
    return true;
  }

  try {
    const url = new URL(
      configured.startsWith("http") ? configured : `http://local${configured}`,
    );
    return url.pathname === "/backend";
  } catch {
    return false;
  }
}

function resolveApiBaseUrl(): string {
  const configured = getConfiguredApiBaseUrl();
  if (typeof window !== "undefined" && usesSameOriginApiProxy()) {
    return "/backend";
  }
  return configured;
}

export interface ApiErrorBody {
  detail: string;
  code?: string;
  request_id?: string;
}

/** Parsed API failure with optional request ID for support. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    options?: { code?: string; requestId?: string },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.requestId = options?.requestId;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const requestId =
      response.headers.get("X-Request-ID") ??
      response.headers.get("x-request-id") ??
      undefined;

    let detail = response.statusText || "Request failed";
    let code: string | undefined;

    try {
      const body = (await response.json()) as Record<string, unknown>;
      const nested = body.detail;

      if (typeof nested === "string") {
        detail = nested;
        code = typeof body.code === "string" ? body.code : undefined;
      } else if (nested && typeof nested === "object") {
        const obj = nested as ApiErrorBody;
        detail = obj.detail ?? detail;
        code = obj.code ?? (typeof body.code === "string" ? body.code : undefined);
      }

      const bodyRequestId =
        typeof body.request_id === "string"
          ? body.request_id
          : nested &&
              typeof nested === "object" &&
              typeof (nested as ApiErrorBody).request_id === "string"
            ? (nested as ApiErrorBody).request_id
            : undefined;

      return new ApiError(detail, response.status, {
        code,
        requestId: bodyRequestId ?? requestId,
      });
    } catch {
      return new ApiError(detail, response.status, { requestId });
    }
  }
}

function normalizeApiPath(path: string, base: string): string {
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  // Same-origin /backend: avoid Next.js 308 (trailing slash) before the route handler.
  if (base === "/backend" && cleanPath.length > 1 && cleanPath.endsWith("/")) {
    cleanPath = cleanPath.slice(0, -1);
  }
  return cleanPath;
}

export function getApiUrl(path: string): string {
  const base = resolveApiBaseUrl();
  const cleanPath = normalizeApiPath(path, base);
  return `${base}${cleanPath}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = getCachedAccessToken() ?? (await getAccessToken());
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = getApiUrl(path);
  const useCookies =
    typeof window !== "undefined" &&
    (url.startsWith("/") || url.startsWith(window.location.origin));

  return fetch(url, {
    ...init,
    headers,
    credentials: useCookies ? "include" : init?.credentials,
  });
}

/** Fetch JSON and throw ApiError when the response is not ok. */
export async function apiFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) throw await ApiError.fromResponse(res);
  return res.json() as Promise<T>;
}

export interface ParsedQueryError {
  title: string;
  message: string;
  code?: string;
  requestId?: string;
}

export function parseQueryError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): ParsedQueryError {
  if (error instanceof ApiError) {
    if (error.status === 503) {
      return {
        title: "Setup required",
        message: error.message,
        code: error.code,
        requestId: error.requestId,
      };
    }

    if (
      error.status === 400 &&
      error.message.toLowerCase().includes("workspace")
    ) {
      return {
        title: "Workspace required",
        message: error.message,
        code: error.code,
        requestId: error.requestId,
      };
    }

    if (error.status === 401) {
      return {
        title: "Sign-in required",
        message: error.message || "Your session may have expired. Sign in again.",
        code: error.code,
        requestId: error.requestId,
      };
    }

    return {
      title: error.status === 404 ? "Not found" : "Unable to load data",
      message: error.message,
      code: error.code,
      requestId: error.requestId,
    };
  }

  if (error instanceof Error) {
    return {
      title: "Unable to load data",
      message: error.message || fallback,
    };
  }

  return { title: "Unable to load data", message: fallback };
}