"use client";

import Link from "next/link";
import { use } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { apiFetchJson, ApiError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { downloadReportCsv } from "@/lib/report-export";
import { reportScopeLabel, type WorkspaceReport } from "@/lib/report-types";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { DashboardPanels } from "@/components/reports/DashboardPanels";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { StatCard } from "@/components/ui/stat-card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Calendar, Goal } from "lucide-react";

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const { id } = use(params);
  const workspaceId = useActiveWorkspaceId();

  const { data, isLoading, error, refetch } = useQuery<WorkspaceReport>({
    queryKey: ["workspace-report", workspaceId, id],
    queryFn: () => apiFetchJson<WorkspaceReport>(`/reports/${id}`),
    enabled: AUTH_ENABLED && Boolean(id),
  });

  const exportMutation = useMutation({
    mutationFn: () => downloadReportCsv(id, data?.title ?? "report"),
  });

  if (!AUTH_ENABLED) {
    return (
      <PageShell>
        <PageHeader
          title="Report"
          description="Enable authentication to view saved workspace reports."
        />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Report" />
        <QueryErrorState error={error} onRetry={() => refetch()} />
      </PageShell>
    );
  }

  const scope = data
    ? reportScopeLabel(data.competition, data.season)
    : "";

  return (
    <PageShell>
      <PageHeader
        eyebrow="Saved snapshot"
        title={data?.title ?? "Report"}
        description={
          data
            ? `${scope} · Saved ${new Date(data.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
            : "Loading report…"
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/reports">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All reports
              </Link>
            </Button>
            {data && (
              <Button
                type="button"
                size="sm"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate()}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        }
      />

      {data?.notes && (
        <p className="text-body-sm mb-6 text-muted-foreground">{data.notes}</p>
      )}

      {exportMutation.error && (
        <p className="text-caption mb-4 text-destructive">
          {exportMutation.error instanceof ApiError
            ? exportMutation.error.message
            : "Could not export CSV."}
        </p>
      )}

      {isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="surface-card h-24 animate-pulse rounded-xl border"
              />
            ))}
          </div>
          <div className="surface-card h-64 animate-pulse rounded-xl border" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard
              label="Matches"
              value={data.snapshot.total_matches}
              icon={Calendar}
            />
            <StatCard
              label="Events"
              value={data.snapshot.total_events.toLocaleString()}
              icon={Activity}
            />
            <StatCard
              label="Goals"
              value={data.snapshot.total_goals}
              icon={Goal}
            />
            <StatCard
              label="Avg goals / match"
              value={data.snapshot.avg_goals_per_match}
              icon={BarChart3}
            />
          </div>
          <DashboardPanels dashboard={data.snapshot} />
        </>
      )}
    </PageShell>
  );
}