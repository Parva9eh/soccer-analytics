import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/update-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Exclude /backend — same-origin API proxy; auth is enforced by FastAPI, not page middleware.
    "/((?!_next/static|_next/image|favicon.ico|backend(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};