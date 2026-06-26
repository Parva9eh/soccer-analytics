export interface TeamZoneSummary {
  team: string;
  left_third: number;
  middle_third: number;
  right_third: number;
  total_events: number;
}

export interface SeasonZonesSummary {
  competition: string;
  season: string;
  teams: TeamZoneSummary[];
}

export interface HeatmapBinDto {
  col: number;
  row: number;
  count: number;
}

export interface TeamSeasonHeatmap {
  competition: string;
  season: string;
  team: string;
  cols: number;
  rows: number;
  bins: HeatmapBinDto[];
  total_events: number;
}