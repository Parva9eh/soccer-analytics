import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  createRouteHandlerClient,
  resolveRedirectUrl,
} from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";
  const authError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");

  if (authError) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set(
      "error",
      errorCode === "otp_expired" ? "email_link_expired" : "auth_callback",
    );
    if (next !== "/") {
      loginUrl.searchParams.set("next", next);
    }
    return NextResponse.redirect(loginUrl);
  }

  const redirectTarget = resolveRedirectUrl(next, origin);
  const response = NextResponse.redirect(redirectTarget);
  const supabase = createRouteHandlerClient(request, response);

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return response;
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "auth_callback");
  if (next !== "/") {
    loginUrl.searchParams.set("next", next);
  }
  return NextResponse.redirect(loginUrl);
}