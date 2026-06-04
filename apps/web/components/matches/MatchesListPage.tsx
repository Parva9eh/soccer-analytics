"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { apiFetchJson } from "@/lib/api";
import {
  buildMatchesQuery,
  DEFAULT_COMPETITION,
  DEFAULT_SEASON,
  formatSeasonLabel,
  type CompetitionCatalogItem,
} from "@/lib/competition-filter";
import { MatchCard } from "@/components/matches/MatchCard";
import { CompetitionSeasonFilter } from "@/components/matches/CompetitionSeasonFilter";
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
  competition?: string | null;
  season?: string | null;
}

function readFilter(
  searchParams: URLSearchParams,
  key: string,
  fallback: string,
): string {
  const value = searchParams.get(key)?.trim();
  return value || fallback;
}

export function MatchesListPageSkeleton() {
  return (
    <PageShell>
      <div className="mb-8">
        <div className="h-8 w-32 animate-pulse rounded bg-muted/50" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted/50" />
      </div>
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
    </PageShell>
  );
}

export function MatchesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const competition = readFilter(searchParams, "competition", DEFAULT_COMPETITION);
  const season = readFilter(searchParams, "season", DEFAULT_SEASON);

  const updateFilters = useCallback(
    (nextCompetition: string, nextSeason: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("competition", nextCompetition);
      params.set("season", nextSeason);
      router.replace(`/matches?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const { data: catalog, isLoading: catalogLoading } = useQuery<
    CompetitionCatalogItem[]
  >({
    queryKey: ["competitions-catalog"],
    queryFn: () => apiFetchJson<CompetitionCatalogItem[]>("/competitions/"),
    staleTime: 5 * 60 * 1000,
  });

  const matchesQueryKey = ["matches", competition, season] as const;

  const {
    data: matches,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<Match[]>({
    queryKey: matchesQueryKey,
    queryFn: () => apiFetchJson<Match[]>(buildMatchesQuery(competition, season)),
  });

  const handleCompetitionChange = (name: string) => {
    const comp = catalog?.find((c) => c.name === name);
    const firstSeason = comp?.seasons[0] ?? DEFAULT_SEASON;
    updateFilters(name, firstSeason);
  };

  const handleSeasonChange = (year: string) => {
    updateFilters(competition, year);
  };

  const description = useMemo(() => {
    const count = matches?.length ?? 0;
    return `${competition} • ${formatSeasonLabel(season)} • ${count} fixture${count === 1 ? "" : "s"}`;
  }, [competition, season, matches?.length]);

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Matches" />
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load matches for this competition and season."
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  const isEmpty = !isLoading && matches && matches.length === 0;
  const showGridLoading = isLoading || (isFetching && !matches);

  return (
    <PageShell>
      <PageHeader
        title="Matches"
        description={description}
        action={
          <CompetitionSeasonFilter
            catalog={catalog}
            competition={competition}
            season={season}
            onCompetitionChange={handleCompetitionChange}
            onSeasonChange={handleSeasonChange}
            isLoading={catalogLoading}
          />
        }
      />

      {showGridLoading ? (
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
          title="No matches for this selection"
          description={`No fixtures found for ${competition} (${formatSeasonLabel(season)}). Try another season or load data via ETL.`}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateFilters(DEFAULT_COMPETITION, DEFAULT_SEASON)
              }
            >
              Reset to La Liga 2020/21
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