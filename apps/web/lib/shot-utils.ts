export interface ShotMeta {
  xg: number | null;
  outcome: string | null;
  player: string | null;
  team: string | null;
}

export type ShotTeamFilter = "all" | "home" | "away";

function readDetailsRecord(details: unknown): Record<string, unknown> | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  return details as Record<string, unknown>;
}

export function isShotEvent(eventType: string | null | undefined): boolean {
  return Boolean(eventType?.toLowerCase().includes("shot"));
}

export function parseShotMeta(details: unknown): ShotMeta {
  const record = readDetailsRecord(details);
  if (!record) {
    return { xg: null, outcome: null, player: null, team: null };
  }

  const shot = record.shot;
  const shotRecord =
    shot && typeof shot === "object" && !Array.isArray(shot)
      ? (shot as Record<string, unknown>)
      : null;

  let xg: number | null = null;
  const rawXg = shotRecord?.statsbomb_xg;
  if (rawXg != null) {
    const parsed = Number(rawXg);
    xg = Number.isFinite(parsed) ? parsed : null;
  }

  let outcome: string | null = null;
  const rawOutcome = shotRecord?.outcome;
  if (
    rawOutcome &&
    typeof rawOutcome === "object" &&
    !Array.isArray(rawOutcome)
  ) {
    const name = (rawOutcome as Record<string, unknown>).name;
    outcome = typeof name === "string" ? name : null;
  }

  let player: string | null = null;
  const rawPlayer = record.player;
  if (
    rawPlayer &&
    typeof rawPlayer === "object" &&
    !Array.isArray(rawPlayer)
  ) {
    const name = (rawPlayer as Record<string, unknown>).name;
    player = typeof name === "string" ? name : null;
  }

  let team: string | null = null;
  const rawTeam = record.team;
  if (rawTeam && typeof rawTeam === "object" && !Array.isArray(rawTeam)) {
    const name = (rawTeam as Record<string, unknown>).name;
    team = typeof name === "string" ? name : null;
  }

  return { xg, outcome, player, team };
}

export function shotOutcomeColor(outcome: string | null): string {
  switch (outcome) {
    case "Goal":
      return "#22c55e";
    case "Saved":
      return "#3b82f6";
    case "Blocked":
      return "#f97316";
    case "Off T":
    case "Wayward":
      return "#94a3b8";
    case "Post":
      return "#eab308";
    default:
      return "#ef4444";
  }
}

export function shotMarkerRadius(xg: number | null, highlighted: boolean): number {
  const base = xg != null ? 4.5 + Math.min(xg, 1) * 9 : 6;
  return highlighted ? base + 2.2 : base;
}

export function formatShotOutcome(outcome: string | null): string {
  return outcome ?? "Unknown";
}

export function shotMatchesTeamFilter(
  teamName: string | null,
  filter: ShotTeamFilter,
  homeTeam: string,
  awayTeam: string,
): boolean {
  if (filter === "all") {
    return true;
  }
  if (!teamName) {
    return false;
  }
  if (filter === "home") {
    return teamName === homeTeam;
  }
  return teamName === awayTeam;
}

export const SHOT_OUTCOME_LEGEND = [
  { label: "Goal", color: shotOutcomeColor("Goal") },
  { label: "Saved", color: shotOutcomeColor("Saved") },
  { label: "Blocked", color: shotOutcomeColor("Blocked") },
  { label: "Off target", color: shotOutcomeColor("Off T") },
  { label: "Other", color: shotOutcomeColor(null) },
] as const;