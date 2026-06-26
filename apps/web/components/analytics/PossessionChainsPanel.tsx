"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { chainKey } from "@/lib/possession-utils";
import type {
  MatchPossessionChains,
  PossessionChainSummary,
  PossessionTeamFilter,
} from "@/lib/possession-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Badge } from "@/components/ui/badge";

interface PossessionChainsPanelProps {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  selectedChainKey: string | null;
  onSelectChain: (chain: PossessionChainSummary | null) => void;
}

export function PossessionChainsPanel({
  matchId,
  homeTeam,
  awayTeam,
  selectedChainKey,
  onSelectChain,
}: PossessionChainsPanelProps) {
  const workspaceId = useActiveWorkspaceId();
  const [teamFilter, setTeamFilter] = useState<PossessionTeamFilter>("all");

  const teamParam =
    teamFilter === "home"
      ? homeTeam
      : teamFilter === "away"
        ? awayTeam
        : null;

  const queryParams = new URLSearchParams({ limit: "20" });
  if (teamParam) {
    queryParams.set("team", teamParam);
  }

  const { data, isLoading } = useQuery<MatchPossessionChains>({
    queryKey: ["match-possession", workspaceId, matchId, teamFilter],
    queryFn: () =>
      apiFetchJson<MatchPossessionChains>(
        `/analytics/possession/matches/${matchId}?${queryParams}`,
      ),
  });

  useEffect(() => {
    onSelectChain(null);
  }, [teamFilter, matchId, onSelectChain]);

  const chains = data?.chains ?? [];

  return (
    <Card className="surface-card mb-8 border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Possession chains</CardTitle>
            <p className="text-caption text-muted-foreground">
              Ranked by pass count · Click a row to highlight on the pitch
            </p>
          </div>
          <SegmentedControl
            aria-label="Possession team filter"
            size="sm"
            options={[
              { value: "all", label: "All" },
              { value: "home", label: "Home" },
              { value: "away", label: "Away" },
            ]}
            value={teamFilter}
            onChange={(value) => setTeamFilter(value as PossessionTeamFilter)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted/40" />
        ) : !chains.length ? (
          <p className="text-caption text-muted-foreground">
            No possession data for this filter.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {chains.map((chain) => {
              const key = chainKey(chain.possession_id, chain.team);
              const active = selectedChainKey === key;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() =>
                      onSelectChain(active ? null : chain)
                    }
                    className={`flex w-full items-start justify-between gap-3 py-3 text-left transition-colors ${
                      active ? "bg-primary/5" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {chain.team}
                        </span>
                        <span className="text-caption text-muted-foreground">
                          #{chain.possession_id}
                        </span>
                        {chain.ended_with_goal && (
                          <Badge variant="secondary" className="text-[10px]">
                            Goal
                          </Badge>
                        )}
                        {chain.ended_with_shot && !chain.ended_with_goal && (
                          <Badge variant="outline" className="text-[10px]">
                            Shot
                          </Badge>
                        )}
                      </div>
                      <p className="text-caption mt-1 text-muted-foreground">
                        {chain.pass_count} passes · {chain.event_count} events ·{" "}
                        {chain.duration_seconds}s
                        {chain.start_minute != null && chain.end_minute != null
                          ? ` · ${chain.start_minute}'–${chain.end_minute}'`
                          : ""}
                        {chain.play_pattern ? ` · ${chain.play_pattern}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                      {chain.pass_count} passes
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {selectedChainKey && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => onSelectChain(null)}
          >
            Clear possession filter
          </Button>
        )}
      </CardContent>
    </Card>
  );
}