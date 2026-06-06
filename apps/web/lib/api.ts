import { getAccessToken } from "@/lib/supabase/session";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export function getApiUrl(path: string): string {
  const base = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const token = await getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(getApiUrl(path), {
    ...init,
    headers,
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