"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import {
  fetchAllMatchEvents,
  type EventsPageResponse,
} from "@/lib/event-types";
import type { MatchPassNetwork, PassTeamFilter } from "@/lib/pass-types";
import type { MatchXg } from "@/lib/xg-types";

export interface MatchDetail {
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

/** Data-loading for match detail (table + pitch + analytics strips). */
export function useMatchDetailQueries(options: {
  matchId: number | null;
  workspaceId: string | undefined;
  savedId: string | null;
  passTeamFilter: PassTeamFilter;
  pitchViewMode: string;
  currentPage: number;
  pageSize: number;
  selectedEventType: string;
}) {
  const {
    matchId,
    workspaceId,
    savedId,
    passTeamFilter,
    pitchViewMode,
    currentPage,
    pageSize,
    selectedEventType,
  } = options;

  const savedAnalysisQuery = useQuery<{
    id: string;
    title: string;
    config: Record<string, unknown>;
  }>({
    queryKey: ["saved-analysis", savedId],
    queryFn: () => apiFetchJson(`/analyses/${savedId}`),
    enabled: AUTH_ENABLED && Boolean(savedId),
  });

  const matchQuery = useQuery<MatchDetail>({
    queryKey: ["match", workspaceId, matchId],
    queryFn: () => apiFetchJson<MatchDetail>(`/matches/${matchId}`),
    enabled: !!matchId,
  });

  const match = matchQuery.data;

  const matchXgQuery = useQuery<MatchXg>({
    queryKey: ["match-xg", workspaceId, matchId],
    queryFn: () => apiFetchJson<MatchXg>(`/analytics/xg/matches/${matchId}`),
    enabled: matchId != null,
  });

  const passNetworkTeam =
    match && passTeamFilter === "home"
      ? (match.home_team ?? "")
      : (match?.away_team ?? "");

  const passNetworkQuery = useQuery<MatchPassNetwork>({
    queryKey: ["match-pass-network", workspaceId, matchId, passNetworkTeam],
    queryFn: () =>
      apiFetchJson<MatchPassNetwork>(
        `/analytics/passes/matches/${matchId}?team=${encodeURIComponent(passNetworkTeam)}`,
      ),
    enabled:
      pitchViewMode === "passes" &&
      matchId != null &&
      Boolean(passNetworkTeam),
  });

  const eventsQuery = useQuery<EventsPageResponse>({
    queryKey: ["events", workspaceId, matchId, currentPage, selectedEventType],
    queryFn: async () => {
      const eventTypeParam =
        selectedEventType === "all" ? "" : `&event_type=${selectedEventType}`;
      return apiFetchJson<EventsPageResponse>(
        `/events/?match_id=${matchId}&page=${currentPage}&page_size=${pageSize}${eventTypeParam}`,
      );
    },
    enabled: !!matchId,
  });

  const pitchEventsQuery = useQuery<EventsPageResponse>({
    queryKey: ["pitch-events", workspaceId, matchId],
    queryFn: () => fetchAllMatchEvents(matchId!),
    enabled: !!matchId,
  });

  const pitchEventsLoading =
    pitchEventsQuery.isPending ||
    (pitchEventsQuery.isFetching && pitchEventsQuery.data === undefined);

  return {
    savedAnalysis: savedAnalysisQuery.data,
    match,
    matchLoading: matchQuery.isLoading,
    matchError: matchQuery.error,
    refetchMatch: matchQuery.refetch,
    matchXg: matchXgQuery.data,
    passNetwork: passNetworkQuery.data,
    passNetworkLoading: passNetworkQuery.isLoading,
    eventsData: eventsQuery.data,
    eventsLoading: eventsQuery.isLoading,
    pitchEventsData: pitchEventsQuery.data,
    pitchEventsLoading,
    pitchEventsError: pitchEventsQuery.isError,
    refetchPitchEvents: pitchEventsQuery.refetch,
    allPitchEvents: pitchEventsQuery.data?.events ?? [],
  };
}
