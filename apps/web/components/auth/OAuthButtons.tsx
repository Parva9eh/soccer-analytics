"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/auth/oauth";
import { Button } from "@/components/ui/button";

type OAuthProvider = "google" | "github";

interface OAuthButtonsProps {
  nextPath?: string;
}

export function OAuthButtons({ nextPath = "/" }: OAuthButtonsProps) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(provider: OAuthProvider) {
    setError(null);
    setPending(provider);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthCallbackUrl(nextPath),
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "OAuth sign-in failed.",
      );
      setPending(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => signIn("google")}
        >
          {pending === "google" ? "Redirecting…" : "Google"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending !== null}
          onClick={() => signIn("github")}
        >
          {pending === "github" ? "Redirecting…" : "GitHub"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}