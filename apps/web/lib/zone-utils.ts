import { PITCH_LENGTH_U } from "@/components/pitch/constants";

export type PitchZone = "left_third" | "middle_third" | "right_third";

export const PITCH_ZONE_LABELS: Record<PitchZone, string> = {
  left_third: "Left third",
  middle_third: "Middle third",
  right_third: "Right third",
};

export const PITCH_ZONES: PitchZone[] = [
  "left_third",
  "middle_third",
  "right_third",
];

export function pitchZoneFromX(x: number | null): PitchZone | null {
  if (x == null) {
    return null;
  }
  if (x < PITCH_LENGTH_U / 3) {
    return "left_third";
  }
  if (x < (PITCH_LENGTH_U * 2) / 3) {
    return "middle_third";
  }
  return "right_third";
}

export interface ZoneCount {
  zone: PitchZone;
  label: string;
  home: number;
  away: number;
}

export function buildZoneComparison(
  events: { x: number | null; details?: unknown }[],
  homeTeam: string,
  awayTeam: string,
  teamForEvent: (details: unknown) => string | null,
): ZoneCount[] {
  const counts: Record<PitchZone, { home: number; away: number }> = {
    left_third: { home: 0, away: 0 },
    middle_third: { home: 0, away: 0 },
    right_third: { home: 0, away: 0 },
  };

  for (const event of events) {
    const zone = pitchZoneFromX(event.x);
    if (!zone) {
      continue;
    }
    const team = teamForEvent(event.details);
    if (!team) {
      continue;
    }
    if (team === homeTeam) {
      counts[zone].home += 1;
    } else if (team === awayTeam) {
      counts[zone].away += 1;
    }
  }

  return PITCH_ZONES.map((zone) => ({
    zone,
    label: PITCH_ZONE_LABELS[zone],
    home: counts[zone].home,
    away: counts[zone].away,
  }));
}