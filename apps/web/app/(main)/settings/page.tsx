"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import Link from "next/link";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  member_count: number;
}

interface AuthMe {
  active_workspace_id: string | null;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading, error, refetch } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: () => apiFetchJson<Workspace[]>("/workspaces/"),
    enabled: AUTH_ENABLED,
  });

  const { data: me } = useQuery<AuthMe>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetchJson<AuthMe>("/auth/me"),
    enabled: AUTH_ENABLED,
  });

  const createMutation = useMutation({
    mutationFn: (workspaceName: string) =>
      apiFetchJson<Workspace>("/workspaces/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName }),
      }),
    onSuccess: (created) => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      apiFetchJson<AuthMe>("/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_workspace_id: created.id }),
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      });
    },
  });

  if (!AUTH_ENABLED) {
    return (
      <PageShell>
        <PageHeader
          title="Workspaces"
          description="Enable NEXT_PUBLIC_AUTH_ENABLED to manage teams and workspaces."
        />
        <EmptyState
          icon={Building2}
          title="Authentication is disabled"
          description="Workspaces require Supabase Auth. See supabase/README.md and apps/web/.env.example."
        />
      </PageShell>
    );
  }

  const listUnavailable = Boolean(error) && !data;

  return (
    <PageShell>
      <PageHeader
        title="Workspaces"
        description="Teams and roles for collaboration (Phase 3.3)."
      />

      {listUnavailable && (
        <QueryErrorState
          className="mb-6"
          error={error}
          title="Could not load workspaces"
          fallbackMessage="Apply Supabase migrations (see supabase/README.md), then try again."
          onRetry={() => refetch()}
          compact
        />
      )}

      <Card className="surface-card mb-8 border">
        <CardHeader>
          <CardTitle className="text-base">Create workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = name.trim();
              if (trimmed) createMutation.mutate(trimmed);
            }}
          >
            <div className="min-w-0 flex-1">
              <label htmlFor="ws-name" className="text-label mb-1.5 block">
                Name
              </label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. First Team Analysis"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </form>
          {createMutation.error && (
            <p className="text-caption mt-2 text-destructive">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "Could not create workspace."}
            </p>
          )}
        </CardContent>
      </Card>

      {!listUnavailable && isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="surface-card h-20 animate-pulse rounded-xl border"
            />
          ))}
        </div>
      ) : !listUnavailable && !data?.length ? (
        <EmptyState
          icon={Building2}
          title="No workspaces yet"
          description="Create a workspace for your coaching staff or analysis group."
        />
      ) : !listUnavailable ? (
        <ul className="space-y-3">
          {data.map((ws) => (
            <li key={ws.id}>
              <Card className="surface-card border">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{ws.name}</p>
                    <p className="text-caption font-mono-data">{ws.slug}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {me?.active_workspace_id === ws.id && (
                      <Badge>Active</Badge>
                    )}
                    <Badge variant="secondary">{ws.role}</Badge>
                    <span className="text-caption">
                      {ws.member_count} member{ws.member_count === 1 ? "" : "s"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-caption mt-8">
        Switch the active workspace from the sidebar. Invitations and
        workspace-scoped match data are next.{" "}
        <Link href="/" className="text-primary hover:underline">
          Back to dashboard
        </Link>
      </p>
    </PageShell>
  );
}