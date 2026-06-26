import type { PlayerSeasonProfile } from "@/lib/profile-types";

export const RADAR_AXES = [
  { key: "goals", label: "Goals", max: 20 },
  { key: "xg", label: "xG", max: 15 },
  { key: "shots", label: "Shots", max: 80 },
  { key: "passes", label: "Passes", max: 1200 },
  { key: "progressive_passes", label: "Prog. passes", max: 80 },
] as const;

export type RadarAxisKey = (typeof RADAR_AXES)[number]["key"];

export function radarAxisValue(
  profile: PlayerSeasonProfile,
  key: RadarAxisKey,
): number {
  return profile[key];
}

export function normalizeRadarValue(value: number, max: number): number {
  return Math.min(value / max, 1);
}

export interface RadarPoint {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  axis: (typeof RADAR_AXES)[number];
  raw: number;
}

export function buildRadarPoints(
  profile: PlayerSeasonProfile,
  center: number,
  radius: number,
): RadarPoint[] {
  const angleStep = (Math.PI * 2) / RADAR_AXES.length;

  return RADAR_AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const value = normalizeRadarValue(radarAxisValue(profile, axis.key), axis.max);
    const r = radius * value;
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      labelX: center + Math.cos(angle) * (radius + 22),
      labelY: center + Math.sin(angle) * (radius + 22),
      axis,
      raw: radarAxisValue(profile, axis.key),
    };
  });
}

export function radarPolygonPoints(points: RadarPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}