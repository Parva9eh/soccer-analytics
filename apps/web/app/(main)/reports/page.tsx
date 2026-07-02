"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Trash2 } from "lucide-react";
import { apiFetch, apiFetchJson, ApiError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useCollaborationQueriesEnabled } from "@/lib/use-collaboration-queries-enabled";
import { downloadReportCsv } from "@/lib/report-export";
import { reportScopeLabel, type WorkspaceReport } from "@/lib/report-types";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId();
  const queriesEnabled = useCollaborationQueriesEnabled();

  const { data, isLoading, error, refetch } = useQuery<WorkspaceReport[]>({
    queryKey: ["workspace-reports", workspaceId],
    queryFn: () => apiFetchJson<WorkspaceReport[]>("/reports/"),
    enabled: queriesEnabled,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/reports/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-reports"] });
    },
  });

  const exportMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      downloadReportCsv(id, title),
  });

  if (!AUTH_ENABLED) {
    return (
      <PageShell>
        <PageHeader
          title="Reports"
          description="Enable authentication to save and export workspace report snapshots."
        />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Reports" />
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Reports"
        description={
          <>
            Private multi-match snapshots saved from the analytics dashboard.
            Export any report as CSV. For single-match setups, see{" "}
            <Link
              href="/analyses"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Match views
            </Link>
            .
          </>
        }
        action={
          <Button asChild size="sm">
            <Link href="/analytics">Open dashboard</Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="surface-card h-24 animate-pulse rounded-xl border"
            />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={FileText}
          title="No saved reports yet"
          description="Open Analytics, pick a scope, then use Save report to store a CSV-exportable snapshot here."
          action={
            <Button asChild>
              <Link href="/analytics">Go to analytics</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data.map((report) => {
            const scope = reportScopeLabel(report.competition, report.season);
            const exportError =
              exportMutation.error &&
              exportMutation.variables?.id === report.id
                ? exportMutation.error
                : null;

            return (
              <li key={report.id}>
                <Card className="surface-card border">
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{report.title}</p>
                      <p className="text-caption text-muted-foreground">
                        {scope}
                      </p>
                      {report.notes && (
                        <p className="text-caption mt-1 text-muted-foreground">
                          {report.notes}
                        </p>
                      )}
                      <p className="text-caption mt-2 text-muted-foreground">
                        {report.snapshot.total_matches.toLocaleString()} matches ·{" "}
                        {report.snapshot.total_events.toLocaleString()} events ·
                        Updated{" "}
                        {new Date(report.updated_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/reports/${report.id}`}>View</Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={exportMutation.isPending}
                        onClick={() =>
                          exportMutation.mutate({
                            id: report.id,
                            title: report.title,
                          })
                        }
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        CSV
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(report.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                    {exportError && (
                      <p className="w-full text-caption text-destructive">
                        {exportError instanceof ApiError
                          ? exportError.message
                          : "Could not export CSV."}
                      </p>
                    )}
                    {deleteMutation.error &&
                      deleteMutation.variables === report.id && (
                        <p className="w-full text-caption text-destructive">
                          {deleteMutation.error instanceof ApiError
                            ? deleteMutation.error.message
                            : "Could not delete."}
                        </p>
                      )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}