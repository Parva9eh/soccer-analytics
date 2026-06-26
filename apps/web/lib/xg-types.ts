export interface TeamXgSummary {
  team: string;
  shots: number;
  goals: number;
  xg: number;
}

export interface MatchXg {
  match_id: number;
  home_team: string;
  away_team: string;
  home: TeamXgSummary;
  away: TeamXgSummary;
}

export interface SeasonXg {
  competition: string;
  season: string;
  matches: number;
  total_shots: number;
  total_goals: number;
  total_xg: number;
  avg_xg_per_match: number;
}

export interface PlayerXgSummary {
  player: string;
  team: string | null;
  shots: number;
  goals: number;
  xg: number;
}

export interface PlayerXgLeaderboard {
  competition: string;
  season: string;
  players: PlayerXgSummary[];
}

export interface TeamXgLeaderboard {
  competition: string;
  season: string;
  teams: TeamXgSummary[];
}

export interface MatchXgFormPoint {
  match_id: number;
  match_week: number | null;
  match_date: string | null;
  opponent: string;
  is_home: boolean;
  xg_for: number;
  xg_against: number;
  goals_for: number | null;
  goals_against: number | null;
  rolling_xg_for: number;
  rolling_xg_against: number;
}

export interface TeamXgForm {
  competition: string;
  season: string;
  team: string;
  window: number;
  points: MatchXgFormPoint[];
}

export function formatXg(value: number): string {
  return value.toFixed(2);
}