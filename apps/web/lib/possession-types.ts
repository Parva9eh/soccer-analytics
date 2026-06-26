export interface PossessionChainSummary {
  possession_id: number;
  team: string;
  event_count: number;
  pass_count: number;
  duration_seconds: number;
  start_minute: number | null;
  end_minute: number | null;
  play_pattern: string | null;
  ended_with_shot: boolean;
  ended_with_goal: boolean;
  event_ids: number[];
}

export interface MatchPossessionChains {
  match_id: number;
  home_team: string;
  away_team: string;
  team: string | null;
  chains: PossessionChainSummary[];
}

export interface TeamPossessionSummary {
  team: string;
  possessions: number;
  avg_duration_seconds: number;
  avg_passes_per_possession: number;
  shot_possession_rate: number;
}

export interface SeasonPossessionSummary {
  competition: string;
  season: string;
  matches: number;
  teams: TeamPossessionSummary[];
}

export type PossessionTeamFilter = "all" | "home" | "away";