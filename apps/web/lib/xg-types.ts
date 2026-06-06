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

export function formatXg(value: number): string {
  return value.toFixed(2);
}