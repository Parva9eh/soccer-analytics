import { type NextRequest } from "next/server";
import { proxyApiRequest } from "@/lib/api-proxy";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handle(request: NextRequest, _context: RouteContext) {
  return proxyApiRequest(request);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;