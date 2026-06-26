"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiFetchJson } from "@/lib/api";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import {
  DEFAULT_COMPETITION,
  DEFAULT_SEASON,
  formatSeasonLabel,
  getFirstCatalogFilters,
  isFilterInCatalog,
  type CompetitionCatalogItem,
} from "@/lib/competition-filter";
import type {
  CompareMode,
  ComparePlayersResult,
  CompareTeamsResult,
} from "@/lib/profile-types";
import type { TeamXgLeaderboard } from "@/lib/xg-types";
import { CompareMetrics } from "@/components/analytics/CompareMetrics";
import { CompetitionSeasonFilter } from "@/components/matches/CompetitionSeasonFilter";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlayerOption {
  id: number;
  name: string;
}

export default function AnalyticsComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = useActiveWorkspaceId();

  const initialMode =
    searchParams.get("mode") === "teams" ? "teams" : "players";

  const [mode, setMode] = useState<CompareMode>(initialMode);
  const [competition, setCompetition] = useState(
    searchParams.get("competition")?.trim() || DEFAULT_COMPETITION,
  );
  const [season, setSeason] = useState(
    searchParams.get("season")?.trim() || DEFAULT_SEASON,
  );
  const [playerA, setPlayerA] = useState(
    searchParams.get("player_a")?.trim() || "",
  );
  const [playerB, setPlayerB] = useState(
    searchParams.get("player_b")?.trim() || "",
  );
  const [teamA, setTeamA] = useState(searchParams.get("team_a")?.trim() || "");
  const [teamB, setTeamB] = useState(searchParams.get("team_b")?.trim() || "");

  const { data: catalog, isLoading: catalogLoading } = useQuery<
    CompetitionCatalogItem[]
  >({
    queryKey: ["competitions", workspaceId],
    queryFn: () => apiFetchJson<CompetitionCatalogItem[]>("/competitions/"),
  });

  useEffect(() => {
    if (!catalog?.length) {
      return;
    }
    const defaults = getFirstCatalogFilters(catalog);
    if (defaults && !isFilterInCatalog(catalog, competition, season)) {
      setCompetition(defaults.competition);
      setSeason(defaults.season);
    }
  }, [catalog, competition, season]);

  const { data: players } = useQuery<PlayerOption[]>({
    queryKey: ["players-compare", workspaceId],
    queryFn: () => apiFetchJson<PlayerOption[]>("/players/?limit=200"),
  });

  const seasonParams = new URLSearchParams({ competition, season });
  const { data: teamXg } = useQuery<TeamXgLeaderboard>({
    queryKey: ["team-xg-compare", workspaceId, competition, season],
    queryFn: () =>
      apiFetchJson<TeamXgLeaderboard>(
        `/analytics/xg/teams?${seasonParams}`,
      ),
    enabled: mode === "teams",
  });

  const teamOptions = teamXg?.teams.map((team) => team.team) ?? [];

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams({
      mode,
      competition,
      season,
    });
    if (mode === "players") {
      if (playerA) params.set("player_a", playerA);
      if (playerB) params.set("player_b", playerB);
    } else {
      if (teamA) params.set("team_a", teamA);
      if (teamB) params.set("team_b", teamB);
    }
    router.replace(`/analytics/compare?${params.toString()}`);
  }, [mode, competition, season, playerA, playerB, teamA, teamB, router]);

  useEffect(() => {
    syncUrl();
  }, [syncUrl]);

  const comparePlayersEnabled =
    mode === "players" && Boolean(playerA) && Boolean(playerB) && playerA !== playerB;
  const compareTeamsEnabled =
    mode === "teams" && Boolean(teamA) && Boolean(teamB) && teamA !== teamB;

  const {
    data: playerComparison,
    isLoading: playersLoading,
    error: playersError,
    refetch: refetchPlayers,
  } = useQuery<ComparePlayersResult>({
    queryKey: [
      "compare-players",
      workspaceId,
      competition,
      season,
      playerA,
      playerB,
    ],
    queryFn: () =>
      apiFetchJson<ComparePlayersResult>(
        `/analytics/profiles/compare/players?${seasonParams}&player_a=${playerA}&player_b=${playerB}`,
      ),
    enabled: comparePlayersEnabled,
  });

  const {
    data: teamComparison,
    isLoading: teamsLoading,
    error: teamsError,
    refetch: refetchTeams,
  } = useQuery<CompareTeamsResult>({
    queryKey: [
      "compare-teams",
      workspaceId,
      competition,
      season,
      teamA,
      teamB,
    ],
    queryFn: () =>
      apiFetchJson<CompareTeamsResult>(
        `/analytics/profiles/compare/teams?${seasonParams}&team_a=${encodeURIComponent(teamA)}&team_b=${encodeURIComponent(teamB)}`,
      ),
    enabled: compareTeamsEnabled,
  });

  const scopeLabel = useMemo(
    () => `${competition} · ${formatSeasonLabel(season)}`,
    [competition, season],
  );

  const loading = mode === "players" ? playersLoading : teamsLoading;
  const error = mode === "players" ? playersError : teamsError;

  return (
    <PageShell>
      <Link
        href="/analytics"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to analytics
      </Link>

      <PageHeader
        eyebrow="Phase 4 analytics"
        title="Compare"
        description={`Side-by-side season profiles for ${scopeLabel}.`}
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <SegmentedControl
          aria-label="Compare mode"
          options={[
            { value: "players", label: "Players" },
            { value: "teams", label: "Teams" },
          ]}
          value={mode}
          onChange={(value) => setMode(value as CompareMode)}
        />
        <CompetitionSeasonFilter
          catalog={catalog}
          competition={competition}
          season={season}
          onCompetitionChange={(name) => {
            const comp = catalog?.find((item) => item.name === name);
            setCompetition(name);
            setSeason(comp?.seasons[0] ?? DEFAULT_SEASON);
          }}
          onSeasonChange={setSeason}
          isLoading={catalogLoading}
        />
      </div>

      <Card className="surface-card mb-6 border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selection</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {mode === "players" ? (
            <>
              <PlayerSelect
                label="Player A"
                value={playerA}
                options={players ?? []}
                onChange={setPlayerA}
              />
              <PlayerSelect
                label="Player B"
                value={playerB}
                options={players ?? []}
                onChange={setPlayerB}
              />
            </>
          ) : (
            <>
              <TeamSelect
                label="Team A"
                value={teamA}
                options={teamOptions}
                onChange={setTeamA}
              />
              <TeamSelect
                label="Team B"
                value={teamB}
                options={teamOptions}
                onChange={setTeamB}
              />
            </>
          )}
        </CardContent>
      </Card>

      {error ? (
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load comparison."
          onRetry={() => (mode === "players" ? refetchPlayers() : refetchTeams())}
        />
      ) : loading ? (
        <div className="surface-card h-64 animate-pulse rounded-xl border" />
      ) : mode === "players" && playerComparison ? (
        <Card className="surface-card border">
          <CardContent className="pt-6">
            <CompareMetrics mode="players" players={playerComparison} />
          </CardContent>
        </Card>
      ) : mode === "teams" && teamComparison ? (
        <Card className="surface-card border">
          <CardContent className="pt-6">
            <CompareMetrics mode="teams" teams={teamComparison} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-caption text-muted-foreground">
          Pick two different {mode === "players" ? "players" : "teams"} to compare.
        </p>
      )}
    </PageShell>
  );
}

function PlayerSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: PlayerOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-label mb-1.5 block">{label}</label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-card/80">
          <SelectValue placeholder="Select player" />
        </SelectTrigger>
        <SelectContent>
          {options.map((player) => (
            <SelectItem key={player.id} value={String(player.id)}>
              {player.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function TeamSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-label mb-1.5 block">{label}</label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-card/80">
          <SelectValue placeholder="Select team" />
        </SelectTrigger>
        <SelectContent>
          {options.map((team) => (
            <SelectItem key={team} value={team}>
              {team}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}