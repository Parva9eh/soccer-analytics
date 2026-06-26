"use client";

import { useMemo, useState } from "react";
import { PitchFrame } from "@/components/pitch/PitchFrame";
import { Goals2D } from "@/components/pitch/Goals2D";
import { SVG_VIEW, getSvgPitchMarkings, statsbombToSvg } from "@/components/pitch/constants";
import { formatXg } from "@/lib/xg-types";
import {
  formatShotOutcome,
  parseShotMeta,
  shotMarkerRadius,
  shotOutcomeColor,
  type ShotMeta,
} from "@/lib/shot-utils";

export interface ShotMapEvent {
  id: number;
  x: number | null;
  y: number | null;
  end_x?: number | null;
  end_y?: number | null;
  minute: number | null;
  second: number | null;
  details?: unknown;
}

interface ShotMapPitchProps {
  events: ShotMapEvent[];
  onEventClick?: (event: ShotMapEvent) => void;
  highlightedEventId?: number | null;
}

export function ShotMapPitch({
  events,
  onEventClick,
  highlightedEventId,
}: ShotMapPitchProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const { width, height, padding } = SVG_VIEW;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const cx = width / 2;
  const cy = height / 2;
  const m = getSvgPitchMarkings(innerW, innerH);

  const scaleX = (x: number) => statsbombToSvg(x, 0, width, height, padding).sx;
  const scaleY = (y: number) => statsbombToSvg(0, y, width, height, padding).sy;

  const plotted = useMemo(
    () =>
      events
        .filter((event) => event.x != null && event.y != null)
        .map((event) => ({
          event,
          meta: parseShotMeta(event.details),
        })),
    [events],
  );

  const hovered = plotted.find(
    (item) => item.event.id === (hoveredId ?? highlightedEventId),
  );

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hoveredId) {
      setTooltipPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    });
  };

  return (
    <PitchFrame mode="2d" label="Shot map">
      <div className="relative p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Shot map with expected goals"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setTooltipPos(null);
            setHoveredId(null);
          }}
        >
          <defs>
            <filter id="shotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <pattern id="shotGrassStripes" patternUnits="userSpaceOnUse" width="28" height={innerH}>
              <rect width="14" height={innerH} fill="#0c4a12" />
              <rect x="14" width="14" height={innerH} fill="#15803d" opacity="0.22" />
            </pattern>
            <radialGradient id="shotVignette" cx="50%" cy="50%" r="58%">
              <stop offset="55%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
            </radialGradient>
          </defs>

          <rect
            x={padding}
            y={padding}
            width={innerW}
            height={innerH}
            rx="4"
            fill="url(#shotGrassStripes)"
          />

          <g
            stroke="#f8fafc"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={padding} y={padding} width={innerW} height={innerH} rx="4" />
            <line x1={cx} y1={padding} x2={cx} y2={height - padding} />
            <circle cx={cx} cy={cy} r={m.centerCircleR} />
            <circle cx={cx} cy={cy} r="3.2" fill="#f8fafc" />

            <rect x={padding} y={cy - m.pboxH / 2} width={m.pboxW} height={m.pboxH} rx="2" />
            <rect x={padding} y={cy - m.sixH / 2} width={m.sixW} height={m.sixH} rx="2" />
            <circle cx={padding + m.penaltySpotX} cy={cy} r="4.2" fill="#f8fafc" />

            <rect
              x={width - padding - m.pboxW}
              y={cy - m.pboxH / 2}
              width={m.pboxW}
              height={m.pboxH}
              rx="2"
            />
            <rect
              x={width - padding - m.sixW}
              y={cy - m.sixH / 2}
              width={m.sixW}
              height={m.sixH}
              rx="2"
            />
            <circle cx={width - padding - m.penaltySpotX} cy={cy} r="4.2" fill="#f8fafc" />

            <path
              d={`M ${padding + m.pboxW} ${cy - m.centerCircleR} A ${m.centerCircleR} ${m.centerCircleR} 0 0 1 ${padding + m.pboxW} ${cy + m.centerCircleR}`}
            />
            <path
              d={`M ${width - padding - m.pboxW} ${cy - m.centerCircleR} A ${m.centerCircleR} ${m.centerCircleR} 0 0 0 ${width - padding - m.pboxW} ${cy + m.centerCircleR}`}
            />
          </g>

          <Goals2D padding={padding} width={width} height={height} cy={cy} m={m} />

          {plotted.map(({ event, meta }) => {
            const isHighlighted = highlightedEventId === event.id;
            const isHovered = hoveredId === event.id;
            const isActive = isHighlighted || isHovered;
            const x1 = scaleX(event.x!);
            const y1 = scaleY(event.y!);
            const radius = shotMarkerRadius(meta.xg, isActive);
            const fill = shotOutcomeColor(meta.outcome);
            const opacity = isActive ? 1 : 0.88;

            let directionLine = null;
            if (event.end_x != null && event.end_y != null) {
              const x2 = scaleX(event.end_x);
              const y2 = scaleY(event.end_y);
              const dx = x2 - x1;
              const dy = y2 - y1;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const shortLength = Math.min(dist, 30);
              directionLine = (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x1 + (dx / dist) * shortLength}
                  y2={y1 + (dy / dist) * shortLength}
                  stroke={fill}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  strokeOpacity={isActive ? 0.95 : 0.7}
                />
              );
            }

            return (
              <g key={event.id}>
                {directionLine}
                <circle
                  cx={x1}
                  cy={y1}
                  r={radius}
                  fill={fill}
                  stroke={isActive ? "#fff" : "rgba(15,23,42,0.35)"}
                  strokeWidth={isActive ? 2.6 : 1}
                  filter={isActive ? "url(#shotGlow)" : undefined}
                  className="cursor-pointer"
                  style={{ opacity }}
                  onMouseEnter={() => setHoveredId(event.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onEventClick?.(event)}
                />
              </g>
            );
          })}

          <rect
            x={padding - 30}
            y={padding - 30}
            width={innerW + 60}
            height={innerH + 60}
            fill="url(#shotVignette)"
            pointerEvents="none"
          />
        </svg>

        {hovered && tooltipPos && (
          <ShotTooltip
            meta={hovered.meta}
            minute={hovered.event.minute}
            second={hovered.event.second}
            tooltipPos={tooltipPos}
            width={width}
            height={height}
          />
        )}

        <p className="pointer-events-none mt-2 text-center text-[9px] text-muted-foreground/80">
          Marker size reflects xG · Color shows outcome · Click a shot for details
        </p>
      </div>
    </PitchFrame>
  );
}

function ShotTooltip({
  meta,
  minute,
  second,
  tooltipPos,
  width,
  height,
}: {
  meta: ShotMeta;
  minute: number | null;
  second: number | null;
  tooltipPos: { x: number; y: number };
  width: number;
  height: number;
}) {
  const time =
    minute != null
      ? `${minute}:${(second ?? 0).toString().padStart(2, "0")}`
      : "—";
  const xgLabel = meta.xg != null ? formatXg(meta.xg) : "—";

  return (
    <div
      className="pointer-events-none absolute z-50 max-w-[240px] rounded-lg border border-border bg-card/95 px-3.5 py-2 text-sm text-foreground shadow-xl backdrop-blur-sm"
      style={{
        left: `${(tooltipPos.x / width) * 100 + 2}%`,
        top: `${(tooltipPos.y / height) * 100 - 6}%`,
        transform: "translate(0, -100%)",
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: shotOutcomeColor(meta.outcome) }}
        />
        <span className="truncate font-semibold">{meta.player ?? "Unknown player"}</span>
      </div>
      <div className="mt-1 text-[11px] font-medium text-muted-foreground">
        {xgLabel} xG · {formatShotOutcome(meta.outcome)} · {time}
        {meta.team ? ` · ${meta.team}` : ""}
      </div>
    </div>
  );
}