"use client";

import { forwardRef } from "react";
import type { PlayerSeasonProfile } from "@/lib/profile-types";
import { formatXg } from "@/lib/xg-types";
import {
  BASE_AXES,
  buildRadarPoints,
  positionGroupLabel,
  radarAxesForPosition,
  radarPolygonPoints,
  type RadarAxis,
} from "@/lib/radar-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RADAR_SIZE = 220;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 82;
const AXIS_COUNT = BASE_AXES.length;

interface PlayerRadarChartProps {
  profile: PlayerSeasonProfile;
  position?: string | null;
}

export function PlayerRadarChart({ profile, position }: PlayerRadarChartProps) {
  const axes = radarAxesForPosition(position);
  const points = buildRadarPoints(profile, RADAR_CENTER, RADAR_RADIUS, axes);

  return (
    <Card className="surface-card border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Season profile</CardTitle>
        <p className="text-caption text-muted-foreground">
          {positionGroupLabel(position)} — shape vs role expectations
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <RadarSvg
          ariaLabel={`Radar chart for ${profile.player_name}`}
          axes={axes}
          layers={[
            {
              points,
              fill: "hsl(var(--primary))",
              stroke: "hsl(var(--primary))",
              showVertices: true,
            },
          ]}
          showAxisLabels
        />
        <RadarStatGrid points={points} />
      </CardContent>
    </Card>
  );
}

interface ComparePlayerRadarChartProps {
  playerA: PlayerSeasonProfile;
  playerB: PlayerSeasonProfile;
  positionA?: string | null;
  positionB?: string | null;
}

const COMPARE_COLORS = {
  a: { fill: "hsl(var(--primary))", stroke: "hsl(var(--primary))" },
  b: { fill: "hsl(199 89% 48%)", stroke: "hsl(199 89% 48%)" },
} as const;

export const ComparePlayerRadarChart = forwardRef<
  SVGSVGElement,
  ComparePlayerRadarChartProps
>(function ComparePlayerRadarChart(
  { playerA, playerB, positionA, positionB },
  ref,
) {
  const axesA = radarAxesForPosition(positionA);
  const axesB = radarAxesForPosition(positionB);
  const pointsA = buildRadarPoints(playerA, RADAR_CENTER, RADAR_RADIUS, axesA);
  const pointsB = buildRadarPoints(playerB, RADAR_CENTER, RADAR_RADIUS, axesB);

  return (
    <Card className="surface-card border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Radar overlay</CardTitle>
        <p className="text-caption text-muted-foreground">
          Each player normalized to their position — {positionGroupLabel(positionA)} vs{" "}
          {positionGroupLabel(positionB).toLowerCase()}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 lg:flex-row lg:items-start">
        <RadarSvg
          ref={ref}
          ariaLabel={`Radar comparison of ${playerA.player_name} and ${playerB.player_name}`}
          axes={axesA}
          layers={[
            {
              points: pointsB,
              fill: COMPARE_COLORS.b.fill,
              stroke: COMPARE_COLORS.b.stroke,
              fillOpacity: 0.18,
            },
            {
              points: pointsA,
              fill: COMPARE_COLORS.a.fill,
              stroke: COMPARE_COLORS.a.stroke,
              fillOpacity: 0.28,
              showVertices: true,
            },
          ]}
          showAxisLabels
        />
        <div className="w-full space-y-4 lg:max-w-xs">
          <RadarLegend
            items={[
              {
                label: `${playerA.player_name}${positionA ? ` · ${positionA}` : ""}`,
                color: COMPARE_COLORS.a.stroke,
              },
              {
                label: `${playerB.player_name}${positionB ? ` · ${positionB}` : ""}`,
                color: COMPARE_COLORS.b.stroke,
              },
            ]}
          />
          <RadarStatGrid points={pointsA} secondaryPoints={pointsB} />
        </div>
      </CardContent>
    </Card>
  );
});

function RadarGrid({ axisCount }: { axisCount: number }) {
  const angleStep = (Math.PI * 2) / axisCount;
  return (
    <>
      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon
          key={level}
          points={Array.from({ length: axisCount }, (_, index) => {
            const angle = -Math.PI / 2 + index * angleStep;
            const r = RADAR_RADIUS * level;
            return `${RADAR_CENTER + Math.cos(angle) * r},${RADAR_CENTER + Math.sin(angle) * r}`;
          }).join(" ")}
          fill="none"
          stroke="hsl(var(--border))"
          strokeOpacity="0.6"
        />
      ))}
      {Array.from({ length: axisCount }, (_, index) => {
        const angle = -Math.PI / 2 + index * angleStep;
        return (
          <line
            key={index}
            x1={RADAR_CENTER}
            y1={RADAR_CENTER}
            x2={RADAR_CENTER + Math.cos(angle) * RADAR_RADIUS}
            y2={RADAR_CENTER + Math.sin(angle) * RADAR_RADIUS}
            stroke="hsl(var(--border))"
            strokeOpacity="0.5"
          />
        );
      })}
    </>
  );
}

const RadarSvg = forwardRef<
  SVGSVGElement,
  {
    ariaLabel: string;
    axes: RadarAxis[];
    layers: {
      points: ReturnType<typeof buildRadarPoints>;
      fill: string;
      stroke: string;
      fillOpacity?: number;
      showVertices?: boolean;
    }[];
    showAxisLabels?: boolean;
  }
>(function RadarSvg({ ariaLabel, axes, layers, showAxisLabels }, ref) {
  const labelPoints = layers[layers.length - 1]?.points ?? [];

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
      className="h-52 w-52 shrink-0"
      role="img"
      aria-label={ariaLabel}
    >
      <RadarGrid axisCount={axes.length || AXIS_COUNT} />
      {layers.map((layer, index) => (
        <g key={index}>
          <polygon
            points={radarPolygonPoints(layer.points)}
            fill={layer.fill}
            fillOpacity={layer.fillOpacity ?? 0.25}
            stroke={layer.stroke}
            strokeWidth="2"
          />
          {layer.showVertices &&
            layer.points.map((point) => (
              <circle
                key={point.axis.key}
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill={layer.stroke}
              />
            ))}
        </g>
      ))}
      {showAxisLabels &&
        labelPoints.map((point) => (
          <text
            key={point.axis.key}
            x={point.labelX}
            y={point.labelY}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[8px] font-medium"
          >
            {point.axis.label}
          </text>
        ))}
    </svg>
  );
});

function RadarLegend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <ul className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="truncate">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function RadarStatGrid({
  points,
  secondaryPoints,
}: {
  points: ReturnType<typeof buildRadarPoints>;
  secondaryPoints?: ReturnType<typeof buildRadarPoints>;
}) {
  return (
    <ul className="grid w-full grid-cols-2 gap-2 text-sm">
      {points.map((point, index) => {
        const secondary = secondaryPoints?.[index];
        const formatted =
          point.axis.key === "xg"
            ? formatXg(point.raw)
            : point.raw.toLocaleString();
        const secondaryFormatted =
          secondary && secondary.axis.key === "xg"
            ? formatXg(secondary.raw)
            : secondary?.raw.toLocaleString();

        return (
          <li
            key={point.axis.key}
            className="rounded-md border border-border/70 bg-muted/20 px-2.5 py-2"
          >
            <div className="text-caption text-muted-foreground">
              {point.axis.label}
            </div>
            <div className="font-medium tabular-nums">{formatted}</div>
            {secondaryFormatted != null && (
              <div className="text-caption tabular-nums text-sky-400">
                {secondaryFormatted}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}