import { ApiError } from "@/lib/api";

/** React Query key prefixes for signed-in collaboration data. */
export const COLLABORATION_QUERY_ROOTS = [
  "auth-me",
  "workspaces",
  "workspace-reports",
  "saved-analyses",
  "reports-dashboard",
] as const;

/** React Query key prefixes invalidated when the active workspace changes. */
export const WORKSPACE_SCOPED_QUERY_PREFIXES = [
  "competitions-catalog",
  "matches",
  "summary",
  "match",
  "events",
  "pitch-events",
  "saved-analyses",
  "reports-dashboard",
  "workspace-reports",
  // Analytics (must invalidate on workspace switch)
  "season-xg",
  "player-xg",
  "team-xg",
  "progressive-passes",
  "season-possession",
  "season-zones",
  "team-season-heatmap",
  "team-xg-form",
  "match-xg",
  "match-pass-network",
  "player-season-profile",
  "team-season-profile",
  "compare-players",
  "compare-teams",
  "compare-matches",
] as const;

/** Avoid caching auth failures; retry once when the session may not be ready yet. */
export const COLLABORATION_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnMount: "always" as const,
  retry: (failureCount: number, error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      return failureCount < 2;
    }
    return failureCount < 1;
  },
};