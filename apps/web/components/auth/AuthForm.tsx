"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(
    callbackError === "auth_callback"
      ? "Sign-in could not be completed. Try again."
      : null,
  );
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

      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setMessage(
        "Check your email to confirm your account, then sign in.",
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
      <CardContent>
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

        <p className="text-caption mt-6 text-center">
          <Link
            href={`${alternateHref}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-primary hover:underline"
          >
            {alternateLabel}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}