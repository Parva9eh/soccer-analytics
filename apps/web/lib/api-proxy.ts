import { type NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

export function getApiProxyTarget(): string | null {
  const raw =
    process.env.API_PROXY_TARGET?.trim() ||
    process.env.E2E_API_PROXY_TARGET?.trim();
  if (!raw) {
    return null;
  }
  return raw.replace(/\/$/, "");
}

function copyForwardableHeaders(source: Headers, target: Headers): void {
  source.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      target.set(key, value);
    }
  });
}

function mergeCookieResponse(
  upstream: NextResponse,
  cookieResponse: NextResponse,
): NextResponse {
  cookieResponse.cookies.getAll().forEach((cookie) => {
    upstream.cookies.set(cookie);
  });
  return upstream;
}

function readBearerToken(authorization: string | null): string | null {
  if (!authorization) {
    return null;
  }
  const [scheme, token] = authorization.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }
  return token.trim();
}

async function resolveProxyAccessToken(
  request: NextRequest,
  cookieResponse: NextResponse,
): Promise<string | null> {
  const fromMiddleware = readBearerToken(request.headers.get("authorization"));
  if (fromMiddleware) {
    return fromMiddleware;
  }

  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = createRouteHandlerClient(request, cookieResponse);
  await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

/** Proxy /backend/* to FastAPI, injecting Bearer auth from Supabase session cookies. */
export async function proxyApiRequest(request: NextRequest): Promise<NextResponse> {
  const target = getApiProxyTarget();
  if (!target) {
    return NextResponse.json(
      {
        detail: "API proxy is not configured (set API_PROXY_TARGET)",
        code: "PROXY_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const incoming = new URL(request.url);
  const suffix = incoming.pathname.replace(/^\/backend/, "") || "/";
  const upstreamUrl = new URL(target);
  upstreamUrl.pathname = suffix.startsWith("/") ? suffix : `/${suffix}`;
  upstreamUrl.search = incoming.search;

  const cookieResponse = new NextResponse();
  const accessToken = await resolveProxyAccessToken(request, cookieResponse);

  const headers = new Headers();
  copyForwardableHeaders(request.headers, headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstreamInit: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    ...(hasBody ? { body: request.body, duplex: "half" } : {}),
  };

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, upstreamInit);
  } catch {
    return NextResponse.json(
      {
        detail: "Unable to reach API backend",
        code: "PROXY_UPSTREAM_ERROR",
      },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  copyForwardableHeaders(upstream.headers, responseHeaders);

  const proxied = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });

  return mergeCookieResponse(proxied, cookieResponse);
}