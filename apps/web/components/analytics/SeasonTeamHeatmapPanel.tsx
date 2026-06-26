"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { formatSeasonLabel } from "@/lib/competition-filter";
import type { TeamSeasonHeatmap, SeasonZonesSummary } from "@/lib/zone-types";
import { SeasonHeatmapPitch } from "@/components/analytics/SeasonHeatmapPitch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SeasonTeamHeatmapPanelProps {
  competition: string;
  season: string;
  zoneData?: SeasonZonesSummary;
  zoneLoading?: boolean;
}

export function SeasonTeamHeatmapPanel({
  competition,
  season,
  zoneData,
  zoneLoading,
}: SeasonTeamHeatmapPanelProps) {
  const workspaceId = useActiveWorkspaceId();
  const teams = zoneData?.teams ?? [];
  const [selectedTeam, setSelectedTeam] = useState("");

  useEffect(() => {
    if (!selectedTeam && teams.length > 0) {
      setSelectedTeam(teams[0].team);
    }
  }, [teams, selectedTeam]);

  const seasonParams = useMemo(
    () => new URLSearchParams({ competition, season }),
    [competition, season],
  );

  const { data: heatmap, isLoading: heatmapLoading } = useQuery<TeamSeasonHeatmap>({
    queryKey: ["team-season-heatmap", workspaceId, competition, season, selectedTeam],
    queryFn: () =>
      apiFetchJson<TeamSeasonHeatmap>(
        `/analytics/zones/heatmap?${seasonParams}&team=${encodeURIComponent(selectedTeam)}`,
      ),
    enabled: Boolean(selectedTeam),
  });

  if (zoneLoading) {
    return (
      <Card className="surface-card mb-8 border">
        <div className="h-80 animate-pulse rounded-xl" />
      </Card>
    );
  }

  if (!teams.length) {
    return null;
  }

  return (
    <Card className="surface-card mb-8 border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">Team season heatmap</CardTitle>
            <p className="text-caption text-muted-foreground">
              Spatial event density · {competition} · {formatSeasonLabel(season)}
            </p>
          </div>
          <div className="w-full sm:w-56">
            <Select value={selectedTeam || undefined} onValueChange={setSelectedTeam}>
              <SelectTrigger className="h-9 bg-card/80">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.team} value={team.team}>
                    {team.team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {heatmapLoading ? (
          <div className="h-72 animate-pulse rounded-xl bg-muted/30" />
        ) : heatmap ? (
          <SeasonHeatmapPitch data={heatmap} />
        ) : (
          <p className="text-caption text-muted-foreground">
            No positioned events for {selectedTeam} in this season scope.
          </p>
        )}
      </CardContent>
    </Card>
  );
}