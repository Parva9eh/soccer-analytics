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
import type { TeamSeasonHeatmap } from "@/lib/zone-types";

interface SeasonHeatmapPitchProps {
  data: TeamSeasonHeatmap;
}

export function SeasonHeatmapPitch({ data }: SeasonHeatmapPitchProps) {
  const { width, height, padding } = SVG_VIEW;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const cx = width / 2;
  const cy = height / 2;
  const m = getSvgPitchMarkings(innerW, innerH);

  const maxCount = useMemo(
    () => Math.max(...data.bins.map((bin) => bin.count), 1),
    [data.bins],
  );

  const scaleX = (x: number) => statsbombToSvg(x, 0, width, height, padding).sx;
  const scaleY = (y: number) => statsbombToSvg(0, y, width, height, padding).sy;

  const instanceId = data.team.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filterId = `seasonHeatmapBlur-${instanceId}`;

  return (
    <PitchFrame mode="2d" label={`${data.team} · season`}>
      <div className="relative p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Season heatmap for ${data.team}`}
        >
          <defs>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
            </filter>
            <pattern
              id={`seasonGrass-${instanceId}`}
              patternUnits="userSpaceOnUse"
              width="28"
              height={innerH}
            >
              <rect width="14" height={innerH} fill="#0c4a12" />
              <rect x="14" width="14" height={innerH} fill="#15803d" opacity="0.22" />
            </pattern>
          </defs>

          <rect
            x={padding}
            y={padding}
            width={innerW}
            height={innerH}
            rx="4"
            fill={`url(#seasonGrass-${instanceId})`}
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
          </g>

          <Goals2D padding={padding} width={width} height={height} cy={cy} m={m} />

          <g filter={`url(#${filterId})`}>
            {data.bins.map((bin) => {
              const x0 = (bin.col / data.cols) * PITCH_LENGTH_U;
              const y0 = (bin.row / data.rows) * PITCH_WIDTH_U;
              const x1 = ((bin.col + 1) / data.cols) * PITCH_LENGTH_U;
              const y1 = ((bin.row + 1) / data.rows) * PITCH_WIDTH_U;
              const intensity = bin.count / maxCount;
              return (
                <rect
                  key={`${bin.col}-${bin.row}`}
                  x={scaleX(x0)}
                  y={scaleY(y0)}
                  width={scaleX(x1) - scaleX(x0)}
                  height={scaleY(y1) - scaleY(y0)}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.15 + intensity * 0.65}
                  rx="2"
                />
              );
            })}
          </g>
        </svg>
        <p className="mt-2 text-[10px] text-muted-foreground">
          {data.total_events.toLocaleString()} positioned events · {data.cols}×{data.rows} bins
        </p>
      </div>
    </PitchFrame>
  );
}