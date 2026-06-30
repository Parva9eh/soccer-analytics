"use client";

import { useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { formatSeasonLabel } from "@/lib/competition-filter";
import { formatXg, type TeamXgForm, type TeamXgLeaderboard } from "@/lib/xg-types";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const WINDOW_OPTIONS = [3, 5, 10] as const;

interface XgFormChartProps {
  competition: string;
  season: string;
  teams?: TeamXgLeaderboard;
  teamsLoading?: boolean;
}

function formatMatchLabel(point: TeamXgForm["points"][number], index: number): string {
  if (point.match_week != null) {
    return `GW${point.match_week}`;
  }
  return `M${index + 1}`;
}

export function XgFormChart({
  competition,
  season,
  teams,
  teamsLoading,
}: XgFormChartProps) {
  const workspaceId = useActiveWorkspaceId();
  const gradientForId = useId().replace(/:/g, "");
  const gradientAgainstId = useId().replace(/:/g, "");

  const teamOptions = useMemo(
    () => teams?.teams.map((item) => item.team) ?? [],
    [teams?.teams],
  );
  const [selectedTeam, setSelectedTeam] = useState("");
  const [windowSize, setWindowSize] = useState<number>(5);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeTeam = useMemo(() => {
    if (selectedTeam && teamOptions.includes(selectedTeam)) {
      return selectedTeam;
    }
    return teamOptions[0] ?? "";
  }, [selectedTeam, teamOptions]);

  const formParams = new URLSearchParams({
    competition,
    season,
    team: activeTeam,
    window: String(windowSize),
  });

  const { data: form, isLoading: formLoading } = useQuery<TeamXgForm>({
    queryKey: [
      "team-xg-form",
      workspaceId,
      competition,
      season,
      activeTeam,
      windowSize,
    ],
    queryFn: () =>
      apiFetchJson<TeamXgForm>(`/analytics/xg/form?${formParams}`),
    enabled: Boolean(activeTeam),
  });

  const points = useMemo(() => form?.points ?? [], [form?.points]);

  const chartMetrics = useMemo(() => {
    if (!points.length) {
      return null;
    }
    const maxValue = Math.max(
      ...points.flatMap((point) => [
        point.xg_for,
        point.xg_against,
        point.rolling_xg_for,
        point.rolling_xg_against,
      ]),
      0.25,
    );
    return { maxValue };
  }, [points]);

  const loading = teamsLoading || formLoading;

  if (!teamsLoading && !teamOptions.length) {
    return null;
  }

  const scopeLabel = `${competition} · ${formatSeasonLabel(season)}`;

  return (
    <Card className="surface-card mb-8 border">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Rolling xG form</CardTitle>
            <p className="text-caption text-muted-foreground">
              Match-by-match xG for and against with a {windowSize}-match rolling
              average · {scopeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={activeTeam || undefined}
              onValueChange={setSelectedTeam}
              disabled={!teamOptions.length}
            >
              <SelectTrigger className="h-9 w-[12rem] bg-card/80">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent>
                {teamOptions.map((team) => (
                  <SelectItem key={team} value={team}>
                    {team}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(windowSize)}
              onValueChange={(value) => setWindowSize(Number(value))}
            >
              <SelectTrigger className="h-9 w-[7.5rem] bg-card/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WINDOW_OPTIONS.map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {value}-match avg
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
        ) : !points.length ? (
          <p className="text-caption text-muted-foreground">
            No match xG data for this team in the selected season.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <svg
                viewBox="0 0 720 240"
                className="h-auto min-w-[560px] w-full"
                role="img"
                aria-label={`Rolling xG form for ${activeTeam}`}
              >
                <defs>
                  <linearGradient id={gradientForId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id={gradientAgainstId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#f87171" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {chartMetrics && (
                  <FormChartBody
                    points={points}
                    maxValue={chartMetrics.maxValue}
                    hoveredIndex={hoveredIndex}
                    onHover={setHoveredIndex}
                    gradientForId={gradientForId}
                    gradientAgainstId={gradientAgainstId}
                  />
                )}
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
              <LegendSwatch color="hsl(var(--primary))" label="xG for" dashed={false} />
              <LegendSwatch color="#f87171" label="xG against" dashed={false} />
              <LegendSwatch color="hsl(var(--primary))" label="Rolling for" dashed />
              <LegendSwatch color="#f87171" label="Rolling against" dashed />
            </div>

            {hoveredIndex != null && points[hoveredIndex] && (
              <FormMatchDetail point={points[hoveredIndex]} team={activeTeam} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LegendSwatch({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="22" height="8" aria-hidden>
        <line
          x1="0"
          y1="4"
          x2="22"
          y2="4"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "4 3" : undefined}
        />
      </svg>
      {label}
    </span>
  );
}

function FormChartBody({
  points,
  maxValue,
  hoveredIndex,
  onHover,
  gradientForId,
  gradientAgainstId,
}: {
  points: TeamXgForm["points"];
  maxValue: number;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  gradientForId: string;
  gradientAgainstId: string;
}) {
  const padding = { top: 18, right: 16, bottom: 34, left: 36 };
  const width = 720;
  const height = 240;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xAt = (index: number) =>
    padding.left +
    (points.length === 1 ? chartW / 2 : (index / (points.length - 1)) * chartW);

  const yAt = (value: number) =>
    padding.top + chartH - (value / maxValue) * chartH;

  const forPath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.xg_for)}`)
    .join(" ");
  const againstPath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.xg_against)}`,
    )
    .join(" ");
  const rollingForPath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.rolling_xg_for)}`,
    )
    .join(" ");
  const rollingAgainstPath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.rolling_xg_against)}`,
    )
    .join(" ");

  const areaForPath = `${forPath} L ${xAt(points.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`;
  const areaAgainstPath = `${againstPath} L ${xAt(points.length - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`;

  const yTicks = [0, maxValue / 2, maxValue];

  return (
    <g>
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={padding.left}
            y1={yAt(tick)}
            x2={width - padding.right}
            y2={yAt(tick)}
            stroke="hsl(var(--border))"
            strokeOpacity="0.55"
          />
          <text
            x={padding.left - 8}
            y={yAt(tick) + 4}
            textAnchor="end"
            className="fill-muted-foreground text-[10px]"
          >
            {formatXg(tick)}
          </text>
        </g>
      ))}

      <path d={areaForPath} fill={`url(#${gradientForId})`} />
      <path d={areaAgainstPath} fill={`url(#${gradientAgainstId})`} />

      <path
        d={rollingForPath}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeDasharray="5 4"
        strokeOpacity="0.9"
      />
      <path
        d={rollingAgainstPath}
        fill="none"
        stroke="#f87171"
        strokeWidth="2"
        strokeDasharray="5 4"
        strokeOpacity="0.9"
      />
      <path
        d={forPath}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.2"
      />
      <path
        d={againstPath}
        fill="none"
        stroke="#f87171"
        strokeWidth="2.2"
      />

      {points.map((point, index) => {
        const x = xAt(index);
        const active = hoveredIndex === index;
        return (
          <g key={point.match_id}>
            <rect
              x={x - (chartW / points.length) / 2}
              y={padding.top}
              width={chartW / points.length}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => onHover(index)}
              onMouseLeave={() => onHover(null)}
            />
            <circle
              cx={x}
              cy={yAt(point.xg_for)}
              r={active ? 4.5 : 3}
              fill="hsl(var(--primary))"
              stroke={active ? "#fff" : "none"}
              strokeWidth="1.5"
            />
            <circle
              cx={x}
              cy={yAt(point.xg_against)}
              r={active ? 4.5 : 3}
              fill="#f87171"
              stroke={active ? "#fff" : "none"}
              strokeWidth="1.5"
            />
            {(index === 0 ||
              index === points.length - 1 ||
              index % Math.ceil(points.length / 8) === 0) && (
              <text
                x={x}
                y={height - 10}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {formatMatchLabel(point, index)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

function FormMatchDetail({
  point,
  team,
}: {
  point: TeamXgForm["points"][number];
  team: string;
}) {
  const venue = point.is_home ? "Home" : "Away";
  const score =
    point.goals_for != null && point.goals_against != null
      ? `${point.goals_for}–${point.goals_against}`
      : "—";

  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-sm">
      <div className="font-medium text-foreground">
        {team} {venue} vs {point.opponent}
      </div>
      <div className="text-caption mt-1 text-muted-foreground">
        xG {formatXg(point.xg_for)}–{formatXg(point.xg_against)} · Score {score} ·
        Rolling {formatXg(point.rolling_xg_for)} / {formatXg(point.rolling_xg_against)}
      </div>
    </div>
  );
}