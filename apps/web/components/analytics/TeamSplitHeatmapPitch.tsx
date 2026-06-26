"use client";

import { TacticalHeatmapPitch, type HeatmapEvent } from "@/components/analytics/TacticalHeatmapPitch";

interface TeamSplitHeatmapPitchProps {
  homeEvents: HeatmapEvent[];
  awayEvents: HeatmapEvent[];
  homeTeam: string;
  awayTeam: string;
}

export function TeamSplitHeatmapPitch({
  homeEvents,
  awayEvents,
  homeTeam,
  awayTeam,
}: TeamSplitHeatmapPitchProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <TacticalHeatmapPitch
        events={homeEvents}
        label={homeTeam}
        fillColor="hsl(var(--primary))"
        instanceId="home"
      />
      <TacticalHeatmapPitch
        events={awayEvents}
        label={awayTeam}
        fillColor="hsl(199 89% 48%)"
        instanceId="away"
      />
    </div>
  );
}