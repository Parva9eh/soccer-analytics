"use client";

import { useQuery } from "@tanstack/react-query";
import { MatchCard } from "@/components/matches/MatchCard";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api";

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
  } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await apiFetch("/matches/?limit=100");
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
  });

  if (error) {
    return (
      <div className="content">
        <PageHeader title="Matches" />
        <p className="text-destructive">Failed to load matches. Please check the backend.</p>
      </div>
    );
  }

  return (
    <div className="content">
      <PageHeader
        eyebrow="Competition"
        title="Matches"
        description={`La Liga 2020/2021 • ${matches?.length ?? 0} fixtures`}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
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
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {matches?.map((match) => (
            <MatchCard key={match.id} match={match} hasEvents={false} />
          ))}
        </div>
      )}
    </div>
  );
}