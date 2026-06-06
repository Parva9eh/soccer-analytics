export interface ReportDatasetItem {
  competition: string;
  season: string;
}

export interface ReportEventTypeItem {
  event_type: string;
  count: number;
}

export interface ReportWeekItem {
  match_week: number;
  count: number;
}

export interface WorkspaceDashboard {
  workspace_id: string | null;
  competition: string | null;
  season: string | null;
  total_matches: number;
  total_events: number;
  total_goals: number;
  avg_goals_per_match: number;
  event_types: ReportEventTypeItem[];
  matches_by_week: ReportWeekItem[];
  datasets: ReportDatasetItem[];
}

export interface WorkspaceReport {
  id: string;
  workspace_id: string;
  title: string;
  notes: string | null;
  competition: string | null;
  season: string | null;
  snapshot: WorkspaceDashboard;
  created_at: string;
  updated_at: string;
}

export type ReportScope = "all" | "filtered";

export function buildDashboardQuery(
  scope: ReportScope,
  competition?: string,
  season?: string,
): string {
  if (scope === "all") {
    return "/reports/dashboard";
  }
  const params = new URLSearchParams();
  if (competition) params.set("competition", competition);
  if (season) params.set("season", season);
  const query = params.toString();
  return query ? `/reports/dashboard?${query}` : "/reports/dashboard";
}

export function reportScopeLabel(
  competition: string | null | undefined,
  season: string | null | undefined,
): string {
  if (competition && season) {
    return `${competition} · ${season.replace("/", "–")}`;
  }
  return "all linked datasets";
}