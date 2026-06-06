"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Trash2 } from "lucide-react";
import { apiFetch, apiFetchJson, ApiError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SavedAnalysis {
  id: string;
  match_id: number | null;
  title: string;
  notes: string | null;
  updated_at: string;
  match_label: string | null;
}

export default function SavedAnalysesPage() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();

  const { data, isLoading, error, refetch } = useQuery<SavedAnalysis[]>({
    queryKey: ["saved-analyses", workspaceId],
    queryFn: () => apiFetchJson<SavedAnalysis[]>("/analyses/"),
    enabled: AUTH_ENABLED,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/analyses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-analyses"] });
    },
  });

  if (!AUTH_ENABLED) {
    return (
      <PageShell>
        <PageHeader
          title="Match views"
          description="Enable authentication to save private match views."
        />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Match views" />
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Match views"
        description="Private filter and pitch setups you saved from match pages in the active workspace."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="surface-card h-20 animate-pulse rounded-xl border"
            />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={Bookmark}
          title="No match views yet"
          description="Open a match, tune filters and pitch layers, then use Save view to store your setup here."
          action={
            <Button asChild>
              <Link href="/matches">Browse matches</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.map((analysis) => (
            <li key={analysis.id}>
              <Card className="surface-card border">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {analysis.title}
                    </p>
                    {analysis.match_label && (
                      <p className="text-caption text-muted-foreground">
                        {analysis.match_label}
                      </p>
                    )}
                    {analysis.notes && (
                      <p className="text-caption mt-1 text-muted-foreground">
                        {analysis.notes}
                      </p>
                    )}
                    <p className="text-caption mt-2 text-muted-foreground">
                      Updated{" "}
                      {new Date(analysis.updated_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.match_id != null && (
                      <Button asChild size="sm">
                        <Link
                          href={`/matches/${analysis.match_id}?saved=${analysis.id}`}
                        >
                          Open match
                        </Link>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(analysis.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                  {deleteMutation.error &&
                    deleteMutation.variables === analysis.id && (
                      <p className="w-full text-caption text-destructive">
                        {deleteMutation.error instanceof ApiError
                          ? deleteMutation.error.message
                          : "Could not delete."}
                      </p>
                    )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}