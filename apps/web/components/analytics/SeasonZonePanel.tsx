"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSeasonLabel } from "@/lib/competition-filter";
import type { SeasonZonesSummary } from "@/lib/zone-types";

interface SeasonZonePanelProps {
  competition: string;
  season: string;
  data?: SeasonZonesSummary;
  loading?: boolean;
}

export function SeasonZonePanel({
  competition,
  season,
  data,
  loading,
}: SeasonZonePanelProps) {
  const scopeLabel = `${competition} · ${formatSeasonLabel(season)}`;
  const teams = data?.teams ?? [];
  const maxTotal = Math.max(...teams.map((team) => team.total_events), 1);

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
        <CardTitle className="text-base">Season zone distribution</CardTitle>
        <p className="text-caption text-muted-foreground">
          Event share by pitch third · {scopeLabel}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {teams.map((team) => {
            const total = team.total_events || 1;
            return (
              <li key={team.team}>
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{team.team}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {team.total_events.toLocaleString()} events
                  </span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="bg-primary/75"
                    style={{ width: `${(team.left_third / total) * 100}%` }}
                    title={`Left third: ${team.left_third}`}
                  />
                  <div
                    className="bg-primary/50"
                    style={{ width: `${(team.middle_third / total) * 100}%` }}
                    title={`Middle third: ${team.middle_third}`}
                  />
                  <div
                    className="bg-primary/35"
                    style={{ width: `${(team.right_third / total) * 100}%` }}
                    title={`Right third: ${team.right_third}`}
                  />
                </div>
                <div className="mt-1 grid grid-cols-3 gap-2 text-[10px] tabular-nums text-muted-foreground">
                  <span>L {team.left_third}</span>
                  <span className="text-center">M {team.middle_third}</span>
                  <span className="text-right">R {team.right_third}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className="h-full rounded-full bg-muted-foreground/35"
                    style={{ width: `${(team.total_events / maxTotal) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}