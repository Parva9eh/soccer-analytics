"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import type { ProgressivePassLeaderboard } from "@/lib/pass-types";
import type { SeasonPossessionSummary } from "@/lib/possession-types";
import type {
  PlayerXgLeaderboard,
  SeasonXg,
  TeamXgLeaderboard,
} from "@/lib/xg-types";
import type { SeasonZonesSummary } from "@/lib/zone-types";

export interface SeasonAnalyticsQueries {
  seasonXg: SeasonXg | undefined;
  seasonXgLoading: boolean;
  playerXg: PlayerXgLeaderboard | undefined;
  playerXgLoading: boolean;
  teamXg: TeamXgLeaderboard | undefined;
  teamXgLoading: boolean;
  progressivePasses: ProgressivePassLeaderboard | undefined;
  progressivePassesLoading: boolean;
  possessionSummary: SeasonPossessionSummary | undefined;
  possessionSummaryLoading: boolean;
  seasonZones: SeasonZonesSummary | undefined;
  seasonZonesLoading: boolean;
}

/** Shared season analytics fan-out for guest + workspace dashboards. */
export function useSeasonAnalyticsQueries(
  workspaceId: string | undefined,
  competition: string,
  season: string,
  enabled: boolean,
): SeasonAnalyticsQueries {
  const params = new URLSearchParams({ competition, season });

  const seasonXgQuery = useQuery<SeasonXg>({
    queryKey: ["season-xg", workspaceId, competition, season],
    queryFn: () =>
      apiFetchJson<SeasonXg>(`/analytics/xg/season?${params}`),
    enabled,
  });

  const playerXgQuery = useQuery<PlayerXgLeaderboard>({
    queryKey: ["player-xg", workspaceId, competition, season],
    queryFn: () =>
      apiFetchJson<PlayerXgLeaderboard>(
        `/analytics/xg/players?${params}&limit=8`,
      ),
    enabled,
  });

  const teamXgQuery = useQuery<TeamXgLeaderboard>({
    queryKey: ["team-xg", workspaceId, competition, season],
    queryFn: () =>
      apiFetchJson<TeamXgLeaderboard>(`/analytics/xg/teams?${params}`),
    enabled,
  });

  const progressiveQuery = useQuery<ProgressivePassLeaderboard>({
    queryKey: ["progressive-passes", workspaceId, competition, season],
    queryFn: () =>
      apiFetchJson<ProgressivePassLeaderboard>(
        `/analytics/passes/progressive?${params}&limit=10`,
      ),
    enabled,
  });

  const possessionQuery = useQuery<SeasonPossessionSummary>({
    queryKey: ["season-possession", workspaceId, competition, season],
    queryFn: () =>
      apiFetchJson<SeasonPossessionSummary>(
        `/analytics/possession/season?${params}`,
      ),
    enabled,
  });

  const zonesQuery = useQuery<SeasonZonesSummary>({
    queryKey: ["season-zones", workspaceId, competition, season],
    queryFn: () =>
      apiFetchJson<SeasonZonesSummary>(
        `/analytics/zones/season?${params}`,
      ),
    enabled,
  });

  return {
    seasonXg: seasonXgQuery.data,
    seasonXgLoading: seasonXgQuery.isLoading,
    playerXg: playerXgQuery.data,
    playerXgLoading: playerXgQuery.isLoading,
    teamXg: teamXgQuery.data,
    teamXgLoading: teamXgQuery.isLoading,
    progressivePasses: progressiveQuery.data,
    progressivePassesLoading: progressiveQuery.isLoading,
    possessionSummary: possessionQuery.data,
    possessionSummaryLoading: possessionQuery.isLoading,
    seasonZones: zonesQuery.data,
    seasonZonesLoading: zonesQuery.isLoading,
  };
}
