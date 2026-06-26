"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import {
  DEFAULT_COMPETITION,
  DEFAULT_SEASON,
  formatSeasonLabel,
} from "@/lib/competition-filter";
import type { PlayerSeasonProfile } from "@/lib/profile-types";
import { formatXg } from "@/lib/xg-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Goal, Target, GitBranch, Activity } from "lucide-react";

interface PlayerSeasonStatsProps {
  playerId: number;
  competition?: string;
  season?: string;
}

export function PlayerSeasonStats({
  playerId,
  competition = DEFAULT_COMPETITION,
  season = DEFAULT_SEASON,
}: PlayerSeasonStatsProps) {
  const workspaceId = useActiveWorkspaceId();
  const params = new URLSearchParams({ competition, season });

  const { data, isLoading, error } = useQuery<PlayerSeasonProfile>({
    queryKey: ["player-profile", workspaceId, playerId, competition, season],
    queryFn: () =>
      apiFetchJson<PlayerSeasonProfile>(
        `/analytics/profiles/players/${playerId}?${params}`,
      ),
  });

  if (isLoading) {
    return (
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <p className="text-caption mt-6 text-muted-foreground">
        Season stats unavailable for this player in {competition} ·{" "}
        {formatSeasonLabel(season)}.
      </p>
    );
  }

  if (data.shots === 0 && data.passes === 0) {
    return (
      <p className="text-caption mt-6 text-muted-foreground">
        No event data for {data.player_name} in {competition} ·{" "}
        {formatSeasonLabel(season)}.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption text-muted-foreground">
          {competition} · {formatSeasonLabel(season)}
          {data.team ? ` · ${data.team}` : ""} · {data.matches_with_events} matches
        </p>
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/analytics/compare?mode=players&player_a=${playerId}&competition=${encodeURIComponent(competition)}&season=${encodeURIComponent(season)}`}
          >
            Compare player
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Goals" value={data.goals} icon={Goal} />
        <StatCard label="xG" value={formatXg(data.xg)} icon={Target} />
        <StatCard
          label="Shots"
          value={data.shots}
          hint={`${data.passes} passes`}
          icon={Activity}
        />
        <StatCard
          label="Progressive passes"
          value={data.progressive_passes}
          hint={`${data.completed_passes} completed`}
          icon={GitBranch}
        />
      </div>
    </div>
  );
}