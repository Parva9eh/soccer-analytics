export interface PlayerSeasonProfile {
  player_id: number;
  player_name: string;
  competition: string;
  season: string;
  team: string | null;
  matches_with_events: number;
  shots: number;
  goals: number;
  xg: number;
  passes: number;
  completed_passes: number;
  progressive_passes: number;
}

export interface TeamSeasonProfile {
  team: string;
  competition: string;
  season: string;
  matches: number;
  goals_for: number;
  goals_against: number;
  xg_for: number;
  xg_against: number;
  passes: number;
  completed_passes: number;
  progressive_passes: number;
  avg_passes_per_possession: number;
  shot_possession_rate: number;
}

export interface ComparePlayersResult {
  competition: string;
  season: string;
  player_a: PlayerSeasonProfile;
  player_b: PlayerSeasonProfile;
}

export interface CompareTeamsResult {
  competition: string;
  season: string;
  team_a: TeamSeasonProfile;
  team_b: TeamSeasonProfile;
}

export type CompareMode = "players" | "teams";