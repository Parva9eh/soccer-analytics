"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Link2, Check, Download, ImageDown, FileText } from "lucide-react";
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
  CompareMatchesResult,
  CompareMode,
  ComparePlayersResult,
  CompareTeamsResult,
} from "@/lib/profile-types";
import type { TeamXgLeaderboard } from "@/lib/xg-types";
import { CompareMetrics } from "@/components/analytics/CompareMetrics";
import { ComparePlayerRadarChart } from "@/components/analytics/PlayerRadarChart";
import {
  downloadCompareCsv,
  downloadSvgAsPng,
  openComparePdfReport,
  radarSvgToDataUrl,
} from "@/lib/compare-export";
import { CompetitionSeasonFilter } from "@/components/matches/CompetitionSeasonFilter";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  position: string | null;
}

interface MatchOption {
  id: number;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  match_week: number | null;
}

export default function AnalyticsComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = useActiveWorkspaceId();

  const modeParam = searchParams.get("mode");
  const initialMode: CompareMode =
    modeParam === "teams"
      ? "teams"
      : modeParam === "matches"
        ? "matches"
        : "players";

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
  const [matchA, setMatchA] = useState(searchParams.get("match_a")?.trim() || "");
  const [matchB, setMatchB] = useState(searchParams.get("match_b")?.trim() || "");
  const [linkCopied, setLinkCopied] = useState(false);
  const radarRef = useRef<SVGSVGElement>(null);

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

  const { data: matchOptions } = useQuery<MatchOption[]>({
    queryKey: ["matches-compare", workspaceId, competition, season],
    queryFn: () =>
      apiFetchJson<MatchOption[]>(
        `/matches/?competition=${encodeURIComponent(competition)}&season=${encodeURIComponent(season)}&limit=80`,
      ),
    enabled: mode === "matches",
  });

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams({
      mode,
      competition,
      season,
    });
    if (mode === "players") {
      if (playerA) params.set("player_a", playerA);
      if (playerB) params.set("player_b", playerB);
    } else if (mode === "teams") {
      if (teamA) params.set("team_a", teamA);
      if (teamB) params.set("team_b", teamB);
    } else {
      if (matchA) params.set("match_a", matchA);
      if (matchB) params.set("match_b", matchB);
    }
    router.replace(`/analytics/compare?${params.toString()}`);
  }, [
    mode,
    competition,
    season,
    playerA,
    playerB,
    teamA,
    teamB,
    matchA,
    matchB,
    router,
  ]);

  useEffect(() => {
    syncUrl();
  }, [syncUrl]);

  const comparePlayersEnabled =
    mode === "players" && Boolean(playerA) && Boolean(playerB) && playerA !== playerB;
  const compareTeamsEnabled =
    mode === "teams" && Boolean(teamA) && Boolean(teamB) && teamA !== teamB;
  const compareMatchesEnabled =
    mode === "matches" && Boolean(matchA) && Boolean(matchB) && matchA !== matchB;

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

  const {
    data: matchComparison,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
  } = useQuery<CompareMatchesResult>({
    queryKey: ["compare-matches", workspaceId, matchA, matchB],
    queryFn: () =>
      apiFetchJson<CompareMatchesResult>(
        `/analytics/profiles/compare/matches?match_a=${matchA}&match_b=${matchB}`,
      ),
    enabled: compareMatchesEnabled,
  });

  const scopeLabel = useMemo(
    () => `${competition} · ${formatSeasonLabel(season)}`,
    [competition, season],
  );

  const playerPositionById = useMemo(() => {
    const map = new Map<number, string | null>();
    for (const player of players ?? []) {
      map.set(player.id, player.position);
    }
    return map;
  }, [players]);

  const activeComparison =
    mode === "players"
      ? playerComparison
      : mode === "teams"
        ? teamComparison
        : matchComparison;

  const canExport = Boolean(activeComparison);

  const loading =
    mode === "players"
      ? playersLoading
      : mode === "teams"
        ? teamsLoading
        : matchesLoading;
  const error =
    mode === "players"
      ? playersError
      : mode === "teams"
        ? teamsError
        : matchesError;

  return (
    <PageShell>
      <Link
        href="/analytics"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to analytics
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="Phase 4 analytics"
          title="Compare"
          description={
            mode === "matches"
              ? `Compare match analytics within ${scopeLabel}.`
              : `Side-by-side season profiles for ${scopeLabel}.`
          }
          className="mb-0"
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          {canExport && activeComparison && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() =>
                  downloadCompareCsv(mode, activeComparison, scopeLabel)
                }
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  const radarImage =
                    mode === "players" && radarRef.current
                      ? await radarSvgToDataUrl(radarRef.current)
                      : null;
                  openComparePdfReport(
                    mode,
                    activeComparison,
                    scopeLabel,
                    radarImage,
                  );
                }}
              >
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
            </>
          )}
          {mode === "players" && playerComparison && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                if (!radarRef.current) {
                  return;
                }
                await downloadSvgAsPng(
                  radarRef.current,
                  `compare-radar-${playerComparison.player_a.player_name}-vs-${playerComparison.player_b.player_name}.png`,
                );
              }}
            >
              <ImageDown className="h-4 w-4" />
              Radar PNG
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                setLinkCopied(true);
                window.setTimeout(() => setLinkCopied(false), 2000);
              } catch {
                setLinkCopied(false);
              }
            }}
          >
            {linkCopied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                Copy link
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <SegmentedControl
          aria-label="Compare mode"
          options={[
            { value: "players", label: "Players" },
            { value: "teams", label: "Teams" },
            { value: "matches", label: "Matches" },
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
          ) : mode === "teams" ? (
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
          ) : (
            <>
              <MatchSelect
                label="Match A"
                value={matchA}
                options={matchOptions ?? []}
                onChange={setMatchA}
              />
              <MatchSelect
                label="Match B"
                value={matchB}
                options={matchOptions ?? []}
                onChange={setMatchB}
              />
            </>
          )}
        </CardContent>
      </Card>

      {error ? (
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load comparison."
          onRetry={() =>
            mode === "players"
              ? refetchPlayers()
              : mode === "teams"
                ? refetchTeams()
                : refetchMatches()
          }
        />
      ) : loading ? (
        <div className="surface-card h-64 animate-pulse rounded-xl border" />
      ) : mode === "players" && playerComparison ? (
        <div className="space-y-6">
          <Card className="surface-card border">
            <CardContent className="pt-6">
              <CompareMetrics mode="players" players={playerComparison} />
            </CardContent>
          </Card>
          <ComparePlayerRadarChart
            ref={radarRef}
            playerA={playerComparison.player_a}
            playerB={playerComparison.player_b}
            positionA={playerPositionById.get(playerComparison.player_a.player_id)}
            positionB={playerPositionById.get(playerComparison.player_b.player_id)}
          />
        </div>
      ) : mode === "teams" && teamComparison ? (
        <Card className="surface-card border">
          <CardContent className="pt-6">
            <CompareMetrics mode="teams" teams={teamComparison} />
          </CardContent>
        </Card>
      ) : mode === "matches" && matchComparison ? (
        <Card className="surface-card border">
          <CardContent className="pt-6">
            <CompareMetrics mode="matches" matches={matchComparison} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-caption text-muted-foreground">
          Pick two different{" "}
          {mode === "players"
            ? "players"
            : mode === "teams"
              ? "teams"
              : "matches"}{" "}
          to compare.
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

function formatMatchOptionLabel(match: MatchOption): string {
  const score =
    match.home_score != null && match.away_score != null
      ? ` (${match.home_score}–${match.away_score})`
      : "";
  const week =
    match.match_week != null ? `W${match.match_week}: ` : "";
  return `${week}${match.home_team ?? "Home"} vs ${match.away_team ?? "Away"}${score}`;
}

function MatchSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: MatchOption[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-label mb-1.5 block">{label}</label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-card/80">
          <SelectValue placeholder="Select match" />
        </SelectTrigger>
        <SelectContent>
          {options.map((match) => (
            <SelectItem key={match.id} value={String(match.id)}>
              {formatMatchOptionLabel(match)}
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