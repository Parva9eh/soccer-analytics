import type { PlayerSeasonProfile } from "@/lib/profile-types";

export type RadarAxisKey =
  | "goals"
  | "xg"
  | "shots"
  | "passes"
  | "progressive_passes";

export interface RadarAxis {
  key: RadarAxisKey;
  label: string;
  max: number;
}

export type PositionGroup =
  | "goalkeeper"
  | "defender"
  | "midfielder"
  | "forward"
  | "default";

export const BASE_AXES: RadarAxis[] = [
  { key: "goals", label: "Goals", max: 20 },
  { key: "xg", label: "xG", max: 15 },
  { key: "shots", label: "Shots", max: 80 },
  { key: "passes", label: "Passes", max: 1200 },
  { key: "progressive_passes", label: "Prog. passes", max: 80 },
];

const POSITION_AXIS_MAXES: Record<
  PositionGroup,
  Record<RadarAxisKey, number>
> = {
  goalkeeper: {
    goals: 2,
    xg: 1,
    shots: 8,
    passes: 500,
    progressive_passes: 25,
  },
  defender: {
    goals: 6,
    xg: 4,
    shots: 35,
    passes: 1400,
    progressive_passes: 90,
  },
  midfielder: {
    goals: 12,
    xg: 8,
    shots: 55,
    passes: 1500,
    progressive_passes: 120,
  },
  forward: {
    goals: 25,
    xg: 20,
    shots: 100,
    passes: 800,
    progressive_passes: 60,
  },
  default: {
    goals: 20,
    xg: 15,
    shots: 80,
    passes: 1200,
    progressive_passes: 80,
  },
};

export function positionGroup(position: string | null | undefined): PositionGroup {
  if (!position) {
    return "default";
  }
  const normalized = position.toLowerCase();
  if (normalized.includes("goalkeeper") || normalized === "gk") {
    return "goalkeeper";
  }
  if (
    normalized.includes("back") ||
    normalized.includes("defender") ||
    normalized.includes("centre back") ||
    normalized.includes("center back")
  ) {
    return "defender";
  }
  if (
    normalized.includes("midfield") ||
    normalized.includes("midfielder") ||
    normalized.includes("wing back")
  ) {
    return "midfielder";
  }
  if (
    normalized.includes("forward") ||
    normalized.includes("striker") ||
    normalized.includes("winger")
  ) {
    return "forward";
  }
  return "default";
}

export function radarAxesForPosition(
  position: string | null | undefined,
): RadarAxis[] {
  const group = positionGroup(position);
  const maxes = POSITION_AXIS_MAXES[group];
  return BASE_AXES.map((axis) => ({
    ...axis,
    max: maxes[axis.key],
  }));
}

/** @deprecated Use radarAxesForPosition — kept for imports expecting a static list */
export const RADAR_AXES = BASE_AXES;

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
  axis: RadarAxis;
  raw: number;
}

export function buildRadarPoints(
  profile: PlayerSeasonProfile,
  center: number,
  radius: number,
  axes: RadarAxis[] = BASE_AXES,
): RadarPoint[] {
  const angleStep = (Math.PI * 2) / axes.length;

  return axes.map((axis, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const value = normalizeRadarValue(
      radarAxisValue(profile, axis.key),
      axis.max,
    );
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

export function positionGroupLabel(position: string | null | undefined): string {
  const group = positionGroup(position);
  switch (group) {
    case "goalkeeper":
      return "Goalkeeper benchmarks";
    case "defender":
      return "Defender benchmarks";
    case "midfielder":
      return "Midfielder benchmarks";
    case "forward":
      return "Forward benchmarks";
    default:
      return "Default benchmarks";
  }
}