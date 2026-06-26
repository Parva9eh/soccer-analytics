"use client";

import { useMemo } from "react";
import { PitchFrame } from "@/components/pitch/PitchFrame";
import { Goals2D } from "@/components/pitch/Goals2D";
import {
  PITCH_LENGTH_U,
  PITCH_WIDTH_U,
  SVG_VIEW,
  getSvgPitchMarkings,
  statsbombToSvg,
} from "@/components/pitch/constants";
import { buildHeatmapGrid } from "@/lib/heatmap-utils";

export interface HeatmapEvent {
  x: number | null;
  y: number | null;
}

interface TacticalHeatmapPitchProps {
  events: HeatmapEvent[];
}

export function TacticalHeatmapPitch({ events }: TacticalHeatmapPitchProps) {
  const { width, height, padding } = SVG_VIEW;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const cx = width / 2;
  const cy = height / 2;
  const m = getSvgPitchMarkings(innerW, innerH);

  const grid = useMemo(() => buildHeatmapGrid(events), [events]);

  const cellWidth = innerW / grid.cols;
  const cellHeight = innerH / grid.rows;

  const scaleX = (x: number) => statsbombToSvg(x, 0, width, height, padding).sx;
  const scaleY = (y: number) => statsbombToSvg(0, y, width, height, padding).sy;

  return (
    <PitchFrame mode="2d" label="Tactical heatmap">
      <div className="relative p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Tactical heatmap with ${grid.totalEvents} positioned events`}
        >
          <defs>
            <filter id="heatmapBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            <pattern id="heatmapGrassStripes" patternUnits="userSpaceOnUse" width="28" height={innerH}>
              <rect width="14" height={innerH} fill="#0c4a12" />
              <rect x="14" width="14" height={innerH} fill="#15803d" opacity="0.22" />
            </pattern>
            <radialGradient id="heatmapVignette" cx="50%" cy="50%" r="58%">
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
            fill="url(#heatmapGrassStripes)"
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

          <g filter="url(#heatmapBlur)">
            {grid.bins.map((bin) => {
              const x0 = (bin.col / grid.cols) * PITCH_LENGTH_U;
              const y0 = (bin.row / grid.rows) * PITCH_WIDTH_U;
              const x1 = ((bin.col + 1) / grid.cols) * PITCH_LENGTH_U;
              const y1 = ((bin.row + 1) / grid.rows) * PITCH_WIDTH_U;
              const sx = scaleX(x0);
              const sy = scaleY(y0);
              const sw = scaleX(x1) - sx;
              const sh = scaleY(y1) - sy;
              const opacity = 0.15 + bin.intensity * 0.65;

              return (
                <rect
                  key={`${bin.col}-${bin.row}`}
                  x={sx}
                  y={sy}
                  width={sw}
                  height={sh}
                  fill="hsl(var(--primary))"
                  fillOpacity={opacity}
                  rx="2"
                />
              );
            })}
          </g>

          <rect
            x={padding}
            y={padding}
            width={innerW}
            height={innerH}
            rx="4"
            fill="url(#heatmapVignette)"
            pointerEvents="none"
          />
        </svg>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span>{grid.totalEvents} events in view</span>
          <div className="flex items-center gap-1.5">
            <span>Low</span>
            <div className="flex h-2 w-20 overflow-hidden rounded-full">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="flex-1 bg-primary"
                  style={{ opacity: 0.15 + (index / 7) * 0.65 }}
                />
              ))}
            </div>
            <span>High</span>
          </div>
        </div>
      </div>
    </PitchFrame>
  );
}