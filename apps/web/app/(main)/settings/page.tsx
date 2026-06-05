"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { apiFetchJson, ApiError, parseQueryError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: workspaces = [],
    isLoading,
    error,
    refetch,
    isFetched,
  } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: () => apiFetchJson<Workspace[]>("/workspaces/"),
    enabled: mounted && AUTH_ENABLED,
    retry: 1,
  });

  const { data: me } = useQuery<AuthMe>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetchJson<AuthMe>("/auth/me"),
    enabled: mounted && AUTH_ENABLED,
    retry: false,
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
      queryClient.setQueryData<Workspace[]>(["workspaces"], (current) => [
        ...(current ?? []),
        created,
      ]);
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

  if (!mounted) {
    return (
      <PageShell>
        <PageHeader title="Workspaces" description="Loading…" />
      </PageShell>
    );
  }

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

  const listError = error && isFetched ? parseQueryError(error) : null;
  const hasWorkspaces = workspaces.length > 0;

  return (
    <PageShell>
      <PageHeader
        title="Workspaces"
        description="Create a team space, invite colleagues, and pick an active workspace in the sidebar."
      />

      <Card className="surface-card mb-6 border">
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
              {createMutation.isPending ? "Creating…" : "Create workspace"}
            </Button>
          </form>
          {createMutation.error && (
            <p className="text-caption mt-2 text-destructive">
              {createMutation.error instanceof ApiError
                ? createMutation.error.message
                : "Could not create workspace."}
            </p>
          )}
          {createMutation.isSuccess && (
            <p className="text-caption mt-2 text-primary">
              Workspace created. It appears in your list below — open Manage to
              invite members.
            </p>
          )}
        </CardContent>
      </Card>

      {listError && (
        <QueryErrorState
          className="mb-6"
          error={error}
          title="Could not refresh workspace list"
          fallbackMessage="You can still create a workspace above. If the list stays empty, apply Supabase migrations (supabase/README.md) and restart the API."
          onRetry={() => refetch()}
          compact
        />
      )}

      <section aria-labelledby="workspace-list-heading">
        <h2 id="workspace-list-heading" className="text-section-title mb-3">
          Your workspaces
        </h2>

        {isLoading && !hasWorkspaces ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="surface-card h-20 animate-pulse rounded-xl border"
              />
            ))}
          </div>
        ) : !hasWorkspaces ? (
          <EmptyState
            icon={Building2}
            title="No workspaces yet"
            description="Use the form above to create your first workspace. After that, use Manage to copy an invite link for teammates."
          />
        ) : (
          <ul className="space-y-3">
            {workspaces.map((ws) => (
              <li key={ws.id}>
                <Card className="surface-card border">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{ws.name}</p>
                      <p className="text-caption font-mono-data">{ws.slug}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {me?.active_workspace_id === ws.id && (
                        <Badge>Active</Badge>
                      )}
                      <Badge variant="secondary">{ws.role}</Badge>
                      <span className="text-caption">
                        {ws.member_count} member
                        {ws.member_count === 1 ? "" : "s"}
                      </span>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/settings/workspaces/${ws.id}`}>
                          Manage
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {hasWorkspaces && (
        <p className="text-caption mt-8 text-muted-foreground">
          Switch the active workspace from the sidebar.{" "}
          <Link href="/" className="text-primary hover:underline">
            Back to dashboard
          </Link>
        </p>
      )}
    </PageShell>
  );
}