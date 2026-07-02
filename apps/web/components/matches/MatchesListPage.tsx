"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { apiFetchJson } from "@/lib/api";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import {
  buildMatchesQuery,
  DEFAULT_COMPETITION,
  DEFAULT_SEASON,
  formatSeasonLabel,
  getFirstCatalogFilters,
  isFilterInCatalog,
  type CompetitionCatalogItem,
} from "@/lib/competition-filter";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
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

  const workspaceId = useActiveWorkspaceId();
  const { session } = useAuthSession();
  const isSignedIn = AUTH_ENABLED && Boolean(session?.access_token);
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
    queryKey: ["competitions-catalog", workspaceId],
    queryFn: () => apiFetchJson<CompetitionCatalogItem[]>("/competitions/"),
    staleTime: 5 * 60 * 1000,
  });

  const catalogReady = !catalogLoading && catalog !== undefined;
  const hasLinkedData = (catalog?.length ?? 0) > 0;
  const filterInCatalog = isFilterInCatalog(catalog, competition, season);
  const firstCatalog = getFirstCatalogFilters(catalog);

  const matchesQueryKey = ["matches", workspaceId, competition, season] as const;

  const {
    data: matches,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<Match[]>({
    queryKey: matchesQueryKey,
    queryFn: () => apiFetchJson<Match[]>(buildMatchesQuery(competition, season)),
    enabled:
      catalogReady && (!hasLinkedData || filterInCatalog || isGuest),
  });

  const handleCompetitionChange = (name: string) => {
    const comp = catalog?.find((c) => c.name === name);
    const firstSeason = comp?.seasons[0] ?? DEFAULT_SEASON;
    updateFilters(name, firstSeason);
  };

  const handleSeasonChange = (year: string) => {
    updateFilters(competition, year);
  };

  useEffect(() => {
    if (!catalogReady || !hasLinkedData || !firstCatalog) {
      return;
    }
    if (!filterInCatalog) {
      updateFilters(firstCatalog.competition, firstCatalog.season);
    }
  }, [
    catalogReady,
    hasLinkedData,
    filterInCatalog,
    firstCatalog,
    updateFilters,
  ]);

  const description = useMemo(() => {
    if (catalogReady && !hasLinkedData) {
      return "No competition data linked to this workspace";
    }
    const count = matches?.length ?? 0;
    return `${competition} • ${formatSeasonLabel(season)} • ${count} fixture${count === 1 ? "" : "s"}`;
  }, [catalogReady, hasLinkedData, competition, season, matches?.length]);

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
  const showNoLinkedData = catalogReady && !hasLinkedData;

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

      {showNoLinkedData ? (
        <EmptyState
          icon={CalendarDays}
          title="No data linked to this workspace"
          description={
            isSignedIn
              ? "This workspace has no competition seasons yet. A workspace admin can add datasets under Settings → Manage → Data access."
              : AUTH_ENABLED
                ? "Guest demo data is unavailable. Sign in for workspace-scoped datasets, or apply the anon public-read migration."
                : "Load competition data via ETL, then link it to a workspace."
          }
          action={
            isSignedIn ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">Open workspaces</Link>
              </Button>
            ) : AUTH_ENABLED ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            ) : undefined
          }
        />
      ) : showGridLoading ? (
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
          description={`No fixtures found for ${competition} (${formatSeasonLabel(season)}). Try another season in the filter above, or ask an admin to link data for this workspace.`}
          action={
            firstCatalog &&
            (competition !== firstCatalog.competition ||
              season !== firstCatalog.season) ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateFilters(
                    firstCatalog.competition,
                    firstCatalog.season,
                  )
                }
              >
                Show {firstCatalog.competition}{" "}
                {formatSeasonLabel(firstCatalog.season)}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {matches?.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              hasEvents={false}
              competition={competition}
              season={season}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}