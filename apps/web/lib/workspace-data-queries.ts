/** React Query key prefixes invalidated when the active workspace changes. */
export const WORKSPACE_SCOPED_QUERY_PREFIXES = [
  "competitions-catalog",
  "matches",
  "summary",
  "match",
  "events",
  "pitch-events",
] as const;