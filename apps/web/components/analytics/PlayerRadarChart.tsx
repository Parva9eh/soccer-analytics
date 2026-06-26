"use client";

import type { PlayerSeasonProfile } from "@/lib/profile-types";
import { formatXg } from "@/lib/xg-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlayerRadarChartProps {
  profile: PlayerSeasonProfile;
}

const AXES = [
  { key: "goals", label: "Goals", max: 20 },
  { key: "xg", label: "xG", max: 15 },
  { key: "shots", label: "Shots", max: 80 },
  { key: "passes", label: "Passes", max: 1200 },
  { key: "progressive_passes", label: "Prog. passes", max: 80 },
] as const;

function axisValue(profile: PlayerSeasonProfile, key: (typeof AXES)[number]["key"]) {
  return profile[key];
}

function normalize(value: number, max: number): number {
  return Math.min(value / max, 1);
}

export function PlayerRadarChart({ profile }: PlayerRadarChartProps) {
  const size = 220;
  const center = size / 2;
  const radius = 82;
  const angleStep = (Math.PI * 2) / AXES.length;

  const points = AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + index * angleStep;
    const value = normalize(axisValue(profile, axis.key), axis.max);
    const r = radius * value;
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      labelX: center + Math.cos(angle) * (radius + 22),
      labelY: center + Math.sin(angle) * (radius + 22),
      axis,
      raw: axisValue(profile, axis.key),
    };
  });

  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <Card className="surface-card border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Season profile</CardTitle>
        <p className="text-caption text-muted-foreground">
          Normalized radar — shape shows playing style in this season scope
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-52 w-52 shrink-0"
          role="img"
          aria-label={`Radar chart for ${profile.player_name}`}
        >
          {[0.25, 0.5, 0.75, 1].map((level) => (
            <polygon
              key={level}
              points={AXES.map((_, index) => {
                const angle = -Math.PI / 2 + index * angleStep;
                const r = radius * level;
                return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
              }).join(" ")}
              fill="none"
              stroke="hsl(var(--border))"
              strokeOpacity="0.6"
            />
          ))}
          {AXES.map((_, index) => {
            const angle = -Math.PI / 2 + index * angleStep;
            return (
              <line
                key={index}
                x1={center}
                y1={center}
                x2={center + Math.cos(angle) * radius}
                y2={center + Math.sin(angle) * radius}
                stroke="hsl(var(--border))"
                strokeOpacity="0.5"
              />
            );
          })}
          <polygon
            points={polygon}
            fill="hsl(var(--primary))"
            fillOpacity="0.25"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          {points.map((point) => (
            <g key={point.axis.key}>
              <circle cx={point.x} cy={point.y} r="3.5" fill="hsl(var(--primary))" />
              <text
                x={point.labelX}
                y={point.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[8px] font-medium"
              >
                {point.axis.label}
              </text>
            </g>
          ))}
        </svg>
        <ul className="grid w-full grid-cols-2 gap-2 text-sm sm:max-w-xs">
          {AXES.map((axis) => {
            const raw = axisValue(profile, axis.key);
            const formatted =
              axis.key === "xg" ? formatXg(raw) : raw.toLocaleString();
            return (
              <li
                key={axis.key}
                className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2"
              >
                <div className="text-caption text-muted-foreground">
                  {axis.label}
                </div>
                <div className="font-medium tabular-nums">{formatted}</div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}