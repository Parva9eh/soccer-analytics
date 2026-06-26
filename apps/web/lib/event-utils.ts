import { possessionTeamFromDetails } from "@/lib/possession-utils";

function readDetailsRecord(details: unknown): Record<string, unknown> | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  return details as Record<string, unknown>;
}

function teamNameFromField(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const name = (value as Record<string, unknown>).name;
  return typeof name === "string" ? name : null;
}

export function eventTeamFromDetails(details: unknown): string | null {
  const record = readDetailsRecord(details);
  if (!record) {
    return null;
  }
  return (
    teamNameFromField(record.team) ?? possessionTeamFromDetails(details)
  );
}

export type HeatmapTeamFilter = "all" | "home" | "away" | "split";

export function eventMatchesTeamFilter(
  details: unknown,
  filter: "home" | "away",
  homeTeam: string,
  awayTeam: string,
): boolean {
  const team = eventTeamFromDetails(details);
  if (!team) {
    return false;
  }
  return filter === "home" ? team === homeTeam : team === awayTeam;
}