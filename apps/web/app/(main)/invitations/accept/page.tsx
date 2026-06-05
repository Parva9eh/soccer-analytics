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

    setStatus("working");
    apiFetchJson<AcceptResult>("/workspaces/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((data) => {
        setResult(data);
        setStatus("done");
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
    return (
      <PageShell>
        <PageHeader
          title="Sign in to accept"
          description="Use the same email address that received the invitation."
        />
        <Button asChild>
          <Link href={`/login?next=${encodeURIComponent(loginNext)}`}>
            Sign in
          </Link>
        </Button>
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