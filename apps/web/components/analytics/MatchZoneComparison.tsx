"use client";

import { useMemo } from "react";
import { buildZoneComparison } from "@/lib/zone-utils";
import { eventTeamFromDetails } from "@/lib/event-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ZoneEvent {
  x: number | null;
  details?: unknown;
}

interface MatchZoneComparisonProps {
  events: ZoneEvent[];
  homeTeam: string;
  awayTeam: string;
}

export function MatchZoneComparison({
  events,
  homeTeam,
  awayTeam,
}: MatchZoneComparisonProps) {
  const zones = useMemo(
    () => buildZoneComparison(events, homeTeam, awayTeam, eventTeamFromDetails),
    [events, homeTeam, awayTeam],
  );

  const totalHome = zones.reduce((sum, zone) => sum + zone.home, 0);
  const totalAway = zones.reduce((sum, zone) => sum + zone.away, 0);

  if (totalHome === 0 && totalAway === 0) {
    return null;
  }

  const maxPerZone = Math.max(
    ...zones.map((zone) => Math.max(zone.home, zone.away)),
    1,
  );

  return (
    <Card className="surface-card border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Zone comparison</CardTitle>
        <p className="text-caption text-muted-foreground">
          Event counts by pitch third — {homeTeam} vs {awayTeam}
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span>{homeTeam}</span>
            <span className="tabular-nums text-muted-foreground">
              {totalHome.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
            <span>{awayTeam}</span>
            <span className="tabular-nums text-muted-foreground">
              {totalAway.toLocaleString()}
            </span>
          </div>
        </div>
        <ul className="space-y-4">
          {zones.map((zone) => (
            <li key={zone.zone}>
              <div className="mb-1.5 text-sm font-medium">{zone.label}</div>
              <div className="space-y-2">
                <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-sm">
                  <span className="truncate text-caption text-muted-foreground">
                    Home
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{ width: `${(zone.home / maxPerZone) * 100}%` }}
                    />
                  </div>
                  <span className="tabular-nums">{zone.home}</span>
                </div>
                <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-sm">
                  <span className="truncate text-caption text-muted-foreground">
                    Away
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className="h-full rounded-full bg-sky-400/80"
                      style={{ width: `${(zone.away / maxPerZone) * 100}%` }}
                    />
                  </div>
                  <span className="tabular-nums">{zone.away}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}