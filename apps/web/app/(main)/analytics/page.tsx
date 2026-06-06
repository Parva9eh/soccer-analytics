"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { StatCard } from "@/components/ui/stat-card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Target,
  GitBranch,
  Users,
  BarChart3,
  TrendingUp,
  Calendar,
  Activity,
} from "lucide-react";

interface SummaryData {
  total_matches: number;
  total_events: number;
  total_players: number;
  status: string;
}

export default function AnalyticsPage() {
  const workspaceId = useActiveWorkspaceId();
  const {
    data: summary,
    isLoading: summaryLoading,
    error,
    refetch,
  } = useQuery<SummaryData>({
    queryKey: ["summary", workspaceId],
    queryFn: () => apiFetchJson<SummaryData>("/summary/"),
  });

  const roadmap = [
    {
      title: "Expected Goals (xG)",
      icon: Target,
      body: "Shot quality and xG models for players and teams.",
    },
    {
      title: "Passing networks",
      icon: GitBranch,
      body: "Interactive passing networks and progressive passes.",
    },
    {
      title: "Possession & build-up",
      icon: BarChart3,
      body: "Possession chains, build-up patterns, and territory.",
    },
    {
      title: "Player insights",
      icon: Users,
      body: "Advanced profiles, radar charts, and comparisons.",
    },
    {
      title: "Trends & form",
      icon: TrendingUp,
      body: "Rolling form, momentum metrics, and trend analysis.",
    },
  ];

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Analytics" eyebrow="Tactical analysis" />
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load analytics summary."
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Tactical analysis"
        title="Analytics"
        description={
          summary && summary.total_matches === 0
            ? "No match data for the active workspace. Link datasets in workspace settings to analyze fixtures."
            : "Metrics for the active workspace. Match and event counts follow linked competition seasons."
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Matches analyzed"
          value={summary?.total_matches ?? "—"}
          icon={Calendar}
          loading={summaryLoading}
        />
        <StatCard
          label="Total events"
          value={summary?.total_events?.toLocaleString() ?? "—"}
          icon={Activity}
          loading={summaryLoading}
        />
        <StatCard
          label="Players tracked"
          value={summary?.total_players ?? "—"}
          hint="All loaded players (not yet filtered by workspace)"
          icon={Users}
          loading={summaryLoading}
        />
        <StatCard
          label="Workspace data"
          value={summary?.total_matches ?? 0}
          hint="Matches in linked datasets"
          icon={BarChart3}
          className="col-span-2 lg:col-span-1"
          loading={summaryLoading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roadmap.map(({ title, icon: Icon, body }) => (
          <Card key={title} className="surface-card card-compact">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body-sm text-muted-foreground">
                Coming soon — {body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-caption mt-8">
        Interactive charts and filters are planned for the next development increment.
      </p>
    </PageShell>
  );
}