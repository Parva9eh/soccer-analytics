"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, Target, Users, BarChart3 } from "lucide-react";
import { apiFetchJson } from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { StatCard } from "@/components/ui/stat-card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SummaryData {
  total_matches: number;
  total_events: number;
  total_players: number;
  status: string;
}

export default function Dashboard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery<SummaryData>({
    queryKey: ["summary"],
    queryFn: () => apiFetchJson<SummaryData>("/summary/"),
  });

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Dashboard" />
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load dashboard summary. Is the API running?"
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="La Liga 2020/21"
        title="Dashboard"
        description="Season overview — matches, events, and squad data at a glance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
        <StatCard
          label="Total matches"
          value={data?.total_matches ?? 0}
          hint="Full season fixture list"
          icon={Calendar}
          loading={isLoading || isFetching}
        />
        <StatCard
          label="Total events"
          value={data?.total_events?.toLocaleString() ?? 0}
          hint="Passes, shots, pressures, and more"
          icon={Target}
          loading={isLoading || isFetching}
        />
        <StatCard
          label="Players tracked"
          value={data?.total_players ?? 0}
          hint="From match lineups"
          icon={Users}
          loading={isLoading || isFetching}
        />
      </div>

      <Card className="surface-card mt-8">
        <CardHeader>
          <CardTitle>Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/matches">Browse matches</Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              View analytics
            </Link>
          </Button>
        </CardContent>
      </Card>
    </PageShell>
  );
}