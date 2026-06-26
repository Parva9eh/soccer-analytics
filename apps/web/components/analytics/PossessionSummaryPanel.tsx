"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSeasonLabel } from "@/lib/competition-filter";
import type { SeasonPossessionSummary } from "@/lib/possession-types";

interface PossessionSummaryPanelProps {
  competition: string;
  season: string;
  data?: SeasonPossessionSummary;
  loading?: boolean;
}

export function PossessionSummaryPanel({
  competition,
  season,
  data,
  loading,
}: PossessionSummaryPanelProps) {
  const scopeLabel = `${competition} · ${formatSeasonLabel(season)}`;
  const teams = data?.teams ?? [];
  const maxPasses = Math.max(
    ...teams.map((team) => team.avg_passes_per_possession),
    1,
  );

  if (loading) {
    return (
      <Card className="surface-card mb-8 border">
        <div className="h-56 animate-pulse rounded-xl" />
      </Card>
    );
  }

  if (!teams.length) {
    return null;
  }

  return (
    <Card className="surface-card mb-8 border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Possession & build-up</CardTitle>
        <p className="text-caption text-muted-foreground">
          Avg passes and duration per possession · {scopeLabel}
          {data?.matches ? ` · ${data.matches} matches` : ""}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {teams.map((team) => (
            <li key={team.team}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium">{team.team}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {team.avg_passes_per_possession.toFixed(1)} passes/poss
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-primary/65"
                  style={{
                    width: `${(team.avg_passes_per_possession / maxPasses) * 100}%`,
                  }}
                />
              </div>
              <p className="text-caption mt-1 text-muted-foreground">
                {team.avg_duration_seconds.toFixed(1)}s avg ·{" "}
                {(team.shot_possession_rate * 100).toFixed(1)}% end in a shot ·{" "}
                {team.possessions.toLocaleString()} possessions
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}