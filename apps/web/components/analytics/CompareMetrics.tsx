"use client";

import type {
  CompareMode,
  ComparePlayersResult,
  CompareTeamsResult,
  PlayerSeasonProfile,
  TeamSeasonProfile,
} from "@/lib/profile-types";
import { formatXg } from "@/lib/xg-types";

interface CompareMetricsProps {
  mode: CompareMode;
  players?: ComparePlayersResult;
  teams?: CompareTeamsResult;
}

type MetricRow = {
  label: string;
  left: number;
  right: number;
  format?: (value: number) => string;
};

function buildPlayerRows(a: PlayerSeasonProfile, b: PlayerSeasonProfile): MetricRow[] {
  return [
    { label: "Goals", left: a.goals, right: b.goals },
    { label: "xG", left: a.xg, right: b.xg, format: formatXg },
    { label: "Shots", left: a.shots, right: b.shots },
    { label: "Passes", left: a.passes, right: b.passes },
    { label: "Completed passes", left: a.completed_passes, right: b.completed_passes },
    {
      label: "Progressive passes",
      left: a.progressive_passes,
      right: b.progressive_passes,
    },
    {
      label: "Matches with events",
      left: a.matches_with_events,
      right: b.matches_with_events,
    },
  ];
}

function buildTeamRows(a: TeamSeasonProfile, b: TeamSeasonProfile): MetricRow[] {
  return [
    { label: "Goals for", left: a.goals_for, right: b.goals_for },
    { label: "Goals against", left: a.goals_against, right: b.goals_against },
    { label: "xG for", left: a.xg_for, right: b.xg_for, format: formatXg },
    { label: "xG against", left: a.xg_against, right: b.xg_against, format: formatXg },
    { label: "Passes", left: a.passes, right: b.passes },
    { label: "Progressive passes", left: a.progressive_passes, right: b.progressive_passes },
    {
      label: "Passes / possession",
      left: a.avg_passes_per_possession,
      right: b.avg_passes_per_possession,
      format: (value) => value.toFixed(1),
    },
    {
      label: "Shot possession rate",
      left: a.shot_possession_rate * 100,
      right: b.shot_possession_rate * 100,
      format: (value) => `${value.toFixed(1)}%`,
    },
  ];
}

export function CompareMetrics({ mode, players, teams }: CompareMetricsProps) {
  if (mode === "players" && players) {
    return (
      <CompareTable
        leftLabel={players.player_a.player_name}
        rightLabel={players.player_b.player_name}
        rows={buildPlayerRows(players.player_a, players.player_b)}
      />
    );
  }

  if (mode === "teams" && teams) {
    return (
      <CompareTable
        leftLabel={teams.team_a.team}
        rightLabel={teams.team_b.team}
        rows={buildTeamRows(teams.team_a, teams.team_b)}
      />
    );
  }

  return null;
}

function CompareTable({
  leftLabel,
  rightLabel,
  rows,
}: {
  leftLabel: string;
  rightLabel: string;
  rows: MetricRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-sm font-medium">
        <span className="truncate text-right">{leftLabel}</span>
        <span className="text-center text-caption text-muted-foreground">Metric</span>
        <span className="truncate">{rightLabel}</span>
      </div>
      <ul className="space-y-3">
        {rows.map((row) => {
          const max = Math.max(row.left, row.right, 1);
          const format = row.format ?? ((value: number) => value.toLocaleString());
          return (
            <li key={row.label}>
              <div className="mb-1 grid grid-cols-3 gap-2 text-sm tabular-nums">
                <span className="text-right">{format(row.left)}</span>
                <span className="text-center text-caption text-muted-foreground">
                  {row.label}
                </span>
                <span>{format(row.right)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="ml-auto h-full rounded-full bg-primary/80"
                    style={{ width: `${(row.left / max) * 100}%` }}
                  />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-primary/55"
                    style={{ width: `${(row.right / max) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}