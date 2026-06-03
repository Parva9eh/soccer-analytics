"use client";

import type { getSvgPitchMarkings } from "./constants";

type Markings = ReturnType<typeof getSvgPitchMarkings>;

interface Goals2DProps {
  padding: number;
  width: number;
  height: number;
  cy: number;
  m: Markings;
}

/**
 * Top-down 2D goals: mouth ON the goal line; net BEHIND the line (outside the field).
 */
export function Goals2D({ padding, width, height, cy, m }: Goals2DProps) {
  const { goalHalfW, netDepthPx, postStroke } = m;
  const leftLineX = padding;
  const rightLineX = width - padding;
  const y1 = cy - goalHalfW;
  const y2 = cy + goalHalfW;

  return (
    <g>
      {/* Left net (outside pitch, x < goal line) */}
      <rect
        x={leftLineX - netDepthPx}
        y={y1}
        width={netDepthPx}
        height={y2 - y1}
        fill="url(#netPattern)"
        stroke="none"
        opacity={0.45}
      />
      {/* Right net (outside pitch, x > goal line) */}
      <rect
        x={rightLineX}
        y={y1}
        width={netDepthPx}
        height={y2 - y1}
        fill="url(#netPattern)"
        stroke="none"
        opacity={0.45}
      />

      {/* Left goal mouth + posts on the line */}
      <g stroke="#f8fafc" strokeLinecap="round" fill="none">
        <line
          x1={leftLineX}
          y1={y1}
          x2={leftLineX}
          y2={y2}
          strokeWidth={postStroke}
        />
        {/* Post caps (slight tick into field = +x) */}
        <line x1={leftLineX} y1={y1} x2={leftLineX + 5} y2={y1} strokeWidth={postStroke * 0.85} />
        <line x1={leftLineX} y1={y2} x2={leftLineX + 5} y2={y2} strokeWidth={postStroke * 0.85} />
        {/* Crossbar tick (top-down: short bar along mouth — marks upper bound of mouth plane) */}
        <line x1={leftLineX} y1={y1} x2={leftLineX} y2={y2} strokeWidth={postStroke * 0.35} opacity={0.5} />
      </g>

      {/* Right goal */}
      <g stroke="#f8fafc" strokeLinecap="round" fill="none">
        <line
          x1={rightLineX}
          y1={y1}
          x2={rightLineX}
          y2={y2}
          strokeWidth={postStroke}
        />
        <line x1={rightLineX} y1={y1} x2={rightLineX - 5} y2={y1} strokeWidth={postStroke * 0.85} />
        <line x1={rightLineX} y1={y2} x2={rightLineX - 5} y2={y2} strokeWidth={postStroke * 0.85} />
      </g>

      {/* Net attachment strings (back edge to goal line corners) */}
      <g stroke="#94a3b8" strokeWidth="0.6" opacity="0.5">
        <line x1={leftLineX - netDepthPx} y1={y1} x2={leftLineX} y2={y1} />
        <line x1={leftLineX - netDepthPx} y1={y2} x2={leftLineX} y2={y2} />
        <line x1={leftLineX - netDepthPx} y1={y1} x2={leftLineX - netDepthPx} y2={y2} />
        <line x1={rightLineX + netDepthPx} y1={y1} x2={rightLineX} y2={y1} />
        <line x1={rightLineX + netDepthPx} y1={y2} x2={rightLineX} y2={y2} />
        <line x1={rightLineX + netDepthPx} y1={y1} x2={rightLineX + netDepthPx} y2={y2} />
      </g>
    </g>
  );
}