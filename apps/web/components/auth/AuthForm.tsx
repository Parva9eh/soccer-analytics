"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import {
  getAuthCallbackUrl,
  getEmailConfirmDestination,
} from "@/lib/auth/oauth";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(() => {
    if (errorParam === "auth_callback") {
      return "Sign-in could not be completed. Try again.";
    }
    if (errorParam === "email_link_expired") {
      return "This confirmation link has expired. Sign in, or create your account again to get a new email.";
    }
    if (errorParam === "missing_supabase_env") {
      return "Auth is enabled but Supabase URL/anon key are missing in .env.local. Restart the dev server after fixing.";
    }
    return null;
  });
  const [pending, setPending] = useState(false);

  const isLogin = mode === "login";
  const title = isLogin ? "Sign in" : "Create account";
  const alternateHref = isLogin ? "/signup" : "/login";
  const alternateLabel = isLogin
    ? "Need an account? Sign up"
    : "Already have an account? Sign in";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setPending(true);

    try {
      const supabase = createClient();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace(next);
        router.refresh();
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getEmailConfirmDestination(next),
        },
      });
      if (error) throw error;
      const returningToInvite = next.includes("/invitations/accept");
      setMessage(
        returningToInvite
          ? "Check your email to confirm your account. After confirming, you'll return to accept the workspace invitation."
          : "Check your email to confirm your account, then sign in.",
      );
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Authentication failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="surface-card mx-auto w-full max-w-md border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-caption">
          Soccer Analytics — coaches and analysts
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <OAuthButtons nextPath={next} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wide">
            <span className="bg-card px-2 text-muted-foreground">
              or email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-label">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-label">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {message && (
            <p
              className="text-sm text-destructive"
              role="alert"
            >
              {message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : title}
          </Button>
        </form>

        <div className="text-caption mt-6 space-y-2 text-center">
          <p>
            <Link
              href={`${alternateHref}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-primary hover:underline"
            >
              {alternateLabel}
            </Link>
          </p>
          <p>
            <Link
              href="/"
              className="text-muted-foreground hover:text-primary hover:underline"
            >
              Continue browsing without signing in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}