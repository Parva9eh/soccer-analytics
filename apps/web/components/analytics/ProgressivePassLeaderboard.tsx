"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSeasonLabel } from "@/lib/competition-filter";
import type { ProgressivePassLeaderboard } from "@/lib/pass-types";

interface ProgressivePassLeaderboardProps {
  competition: string;
  season: string;
  data?: ProgressivePassLeaderboard;
  loading?: boolean;
}

export function ProgressivePassLeaderboardPanel({
  competition,
  season,
  data,
  loading,
}: ProgressivePassLeaderboardProps) {
  const scopeLabel = `${competition} · ${formatSeasonLabel(season)}`;
  const teams = data?.teams ?? [];
  const maxProgressive = Math.max(...teams.map((team) => team.progressive_passes), 1);

  if (loading) {
    return (
      <Card className="surface-card mb-8 border">
        <div className="h-56 animate-pulse rounded-xl" />
      </Card>
    );
  }

  if (!teams.length) {
    return (
      <Card className="surface-card mb-8 border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progressive passes by team</CardTitle>
          <p className="text-caption text-muted-foreground">{scopeLabel}</p>
        </CardHeader>
        <CardContent>
          <p className="text-caption text-muted-foreground">
            No progressive pass data for this season.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="surface-card mb-8 border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Progressive passes by team</CardTitle>
        <p className="text-caption text-muted-foreground">
          Completed passes moving the ball ≥10 units toward goal · {scopeLabel}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {teams.map((team) => (
            <li key={team.team}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{team.team}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {team.progressive_passes}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{
                    width: `${(team.progressive_passes / maxProgressive) * 100}%`,
                  }}
                />
              </div>
              <p className="text-caption mt-1 text-muted-foreground">
                {team.completed_passes} completed of {team.total_passes} passes
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}