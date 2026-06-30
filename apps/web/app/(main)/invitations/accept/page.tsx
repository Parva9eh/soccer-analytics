"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetchJson, ApiError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AcceptResult {
  workspace_id: string;
  workspace_name: string;
  role: string;
}

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const { session, isLoading: sessionLoading } = useAuthSession();
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<AcceptResult | null>(null);

  const loginNext = token
    ? `/invitations/accept?token=${encodeURIComponent(token)}`
    : "/invitations/accept";

  useEffect(() => {
    if (!AUTH_ENABLED || sessionLoading || !token || !session?.access_token) {
      return;
    }
    if (status !== "idle") {
      return;
    }

    queueMicrotask(() => setStatus("working"));
    apiFetchJson<AcceptResult>("/workspaces/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((data) => {
        setResult(data);
        setStatus("done");
        return apiFetchJson("/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active_workspace_id: data.workspace_id }),
        });
      })
      .catch((err: unknown) => {
        setStatus("error");
        setMessage(
          err instanceof ApiError
            ? err.message
            : "Could not accept this invitation.",
        );
      });
  }, [session?.access_token, sessionLoading, status, token]);

  if (!AUTH_ENABLED) {
    return (
      <PageShell>
        <PageHeader title="Workspace invitation" />
        <p className="text-caption">Enable authentication to accept invitations.</p>
      </PageShell>
    );
  }

  if (!token) {
    return (
      <PageShell>
        <PageHeader title="Invalid invitation link" />
        <p className="text-caption">
          This link is missing a token. Ask your workspace admin for a new invite.
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/settings">Go to workspaces</Link>
        </Button>
      </PageShell>
    );
  }

  if (sessionLoading) {
    return (
      <PageShell>
        <PageHeader title="Workspace invitation" description="Checking your session…" />
      </PageShell>
    );
  }

  if (!session) {
    const authNext = encodeURIComponent(loginNext);
    return (
      <PageShell>
        <PageHeader
          title="Accept workspace invitation"
          description="Sign in or create an account with the same email address that was invited."
        />
        <Card className="surface-card max-w-md border">
          <CardContent className="flex flex-col gap-3 py-6">
            <Button asChild>
              <Link href={`/login?next=${authNext}`}>Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/signup?next=${authNext}`}>Create account</Link>
            </Button>
            <p className="text-caption text-muted-foreground">
              New here? Use Create account with the invited email. After email
              confirmation you&apos;ll come back to this invitation automatically.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (status === "working") {
    return (
      <PageShell>
        <PageHeader title="Accepting invitation…" />
      </PageShell>
    );
  }

  if (status === "done" && result) {
    return (
      <PageShell>
        <PageHeader
          title="You joined the workspace"
          description={`${result.workspace_name} · ${result.role}`}
        />
        <Button
          onClick={() => {
            router.push("/settings");
            router.refresh();
          }}
        >
          Open workspaces
        </Button>
      </PageShell>
    );
  }

  if (status === "error") {
    return (
      <PageShell>
        <PageHeader title="Could not accept invitation" />
        <Card className="surface-card border">
          <CardContent className="py-6">
            <p className="text-caption text-destructive">{message}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStatus("idle");
                  setMessage(null);
                }}
              >
                Try again
              </Button>
              <Button asChild variant="ghost">
                <Link href="/settings">Workspaces</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return null;
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <PageHeader title="Workspace invitation" />
        </PageShell>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}