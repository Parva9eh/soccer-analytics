export interface PassNetworkNode {
  player: string;
  player_id: number | null;
  passes_made: number;
  passes_received: number;
  avg_x: number;
  avg_y: number;
}

export interface PassNetworkEdge {
  passer: string;
  recipient: string;
  count: number;
  progressive_count: number;
}

export interface MatchPassNetwork {
  match_id: number;
  team: string;
  home_team: string;
  away_team: string;
  total_passes: number;
  completed_passes: number;
  progressive_passes: number;
  nodes: PassNetworkNode[];
  edges: PassNetworkEdge[];
}

export interface TeamProgressivePassSummary {
  team: string;
  total_passes: number;
  completed_passes: number;
  progressive_passes: number;
}

export interface ProgressivePassLeaderboard {
  competition: string;
  season: string;
  teams: TeamProgressivePassSummary[];
}

export type PassTeamFilter = "home" | "away";