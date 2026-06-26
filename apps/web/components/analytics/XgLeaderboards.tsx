"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSeasonLabel } from "@/lib/competition-filter";
import { formatXg } from "@/lib/xg-types";
import type { PlayerXgLeaderboard, TeamXgLeaderboard } from "@/lib/xg-types";

interface XgLeaderboardsProps {
  competition: string;
  season: string;
  players?: PlayerXgLeaderboard;
  teams?: TeamXgLeaderboard;
  loading?: boolean;
}

export function XgLeaderboards({
  competition,
  season,
  players,
  teams,
  loading,
}: XgLeaderboardsProps) {
  const scopeLabel = `${competition} · ${formatSeasonLabel(season)}`;
  const maxPlayerXg = Math.max(...(players?.players.map((p) => p.xg) ?? [1]), 1);
  const maxTeamXg = Math.max(...(teams?.teams.map((t) => t.xg) ?? [1]), 1);

  if (loading) {
    return (
      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="surface-card h-64 animate-pulse rounded-xl border"
          />
        ))}
      </div>
    );
  }

  if (!players?.players.length && !teams?.teams.length) {
    return null;
  }

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="surface-card border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Top players by xG</CardTitle>
          <p className="text-caption text-muted-foreground">{scopeLabel}</p>
        </CardHeader>
        <CardContent>
          {!players?.players.length ? (
            <p className="text-caption text-muted-foreground">
              No shot data in this scope.
            </p>
          ) : (
            <ul className="space-y-3">
              {players.players.map((item, index) => (
                <li key={`${item.player}-${index}`}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate font-medium">
                      {index + 1}. {item.player}
                      {item.team && (
                        <span className="text-caption ml-1 font-normal text-muted-foreground">
                          ({item.team})
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatXg(item.xg)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{
                        width: `${(item.xg / maxPlayerXg) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-caption mt-1 text-muted-foreground">
                    {item.shots} shots · {item.goals} goals
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="surface-card border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Teams by xG</CardTitle>
          <p className="text-caption text-muted-foreground">{scopeLabel}</p>
        </CardHeader>
        <CardContent>
          {!teams?.teams.length ? (
            <p className="text-caption text-muted-foreground">
              No shot data in this scope.
            </p>
          ) : (
            <ul className="space-y-3">
              {teams.teams.map((item) => (
                <li key={item.team}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{item.team}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatXg(item.xg)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{
                        width: `${(item.xg / maxTeamXg) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-caption mt-1 text-muted-foreground">
                    {item.shots} shots · {item.goals} goals
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}