"use client";

import { PossessionSummaryPanel } from "@/components/analytics/PossessionSummaryPanel";
import { ProgressivePassLeaderboardPanel } from "@/components/analytics/ProgressivePassLeaderboard";
import { SeasonZonePanel } from "@/components/analytics/SeasonZonePanel";
import { SeasonTeamHeatmapPanel } from "@/components/analytics/SeasonTeamHeatmapPanel";
import { XgFormChart } from "@/components/analytics/XgFormChart";
import { XgLeaderboards } from "@/components/analytics/XgLeaderboards";
import type { SeasonAnalyticsQueries } from "@/lib/use-season-analytics-queries";

type Props = {
  competition: string;
  season: string;
  queries: SeasonAnalyticsQueries;
};

/** Shared season panel stack for guest demo and workspace analytics. */
export function SeasonAnalyticsPanels({ competition, season, queries }: Props) {
  const {
    playerXg,
    playerXgLoading,
    teamXg,
    teamXgLoading,
    progressivePasses,
    progressivePassesLoading,
    possessionSummary,
    possessionSummaryLoading,
    seasonZones,
    seasonZonesLoading,
  } = queries;

  return (
    <>
      <XgLeaderboards
        competition={competition}
        season={season}
        players={playerXg}
        teams={teamXg}
        loading={playerXgLoading || teamXgLoading}
      />

      <XgFormChart
        competition={competition}
        season={season}
        teams={teamXg}
        teamsLoading={teamXgLoading}
      />

      <ProgressivePassLeaderboardPanel
        competition={competition}
        season={season}
        data={progressivePasses}
        loading={progressivePassesLoading}
      />

      <PossessionSummaryPanel
        competition={competition}
        season={season}
        data={possessionSummary}
        loading={possessionSummaryLoading}
      />

      <SeasonZonePanel
        competition={competition}
        season={season}
        data={seasonZones}
        loading={seasonZonesLoading}
      />

      <SeasonTeamHeatmapPanel
        competition={competition}
        season={season}
        zoneData={seasonZones}
        zoneLoading={seasonZonesLoading}
      />
    </>
  );
}
