export function possessionIdFromDetails(details: unknown): number | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const raw = (details as Record<string, unknown>).possession;
  if (raw == null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function possessionTeamFromDetails(details: unknown): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const team = (details as Record<string, unknown>).possession_team;
  if (!team || typeof team !== "object" || Array.isArray(team)) {
    return null;
  }
  const name = (team as Record<string, unknown>).name;
  return typeof name === "string" ? name : null;
}

export function chainKey(possessionId: number, team: string): string {
  return `${team}:${possessionId}`;
}