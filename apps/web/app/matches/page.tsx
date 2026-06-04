"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { apiFetchJson } from "@/lib/api";
import { MatchCard } from "@/components/matches/MatchCard";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface Match {
  id: number;
  match_date: string;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  match_week: number | null;
}

export default function MatchesPage() {
  const {
    data: matches,
    isLoading,
    error,
    refetch,
  } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: () => apiFetchJson<Match[]>("/matches/?limit=100"),
  });

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Matches" />
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load matches."
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  const isEmpty = !isLoading && matches && matches.length === 0;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Competition"
        title="Matches"
        description={`La Liga 2020/2021 • ${matches?.length ?? 0} fixtures`}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="surface-card h-[220px] animate-pulse rounded-xl border p-6"
            >
              <div className="mb-4 flex justify-between">
                <div className="h-4 w-24 rounded bg-muted/50" />
                <div className="h-5 w-16 rounded-full bg-muted/50" />
              </div>
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="h-5 w-28 rounded bg-muted/50" />
                <div className="h-4 w-6 rounded bg-muted/50" />
                <div className="h-5 w-28 rounded bg-muted/50" />
              </div>
              <div className="mb-4 flex items-center justify-center gap-6 border-y border-border py-4">
                <div className="h-9 w-12 rounded bg-muted/50" />
                <div className="h-4 w-4 rounded bg-muted/50" />
                <div className="h-9 w-12 rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={CalendarDays}
          title="No matches yet"
          description="When fixtures are loaded into the database, they will appear here."
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Back to dashboard</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {matches?.map((match) => (
            <MatchCard key={match.id} match={match} hasEvents={false} />
          ))}
        </div>
      )}
    </PageShell>
  );
}