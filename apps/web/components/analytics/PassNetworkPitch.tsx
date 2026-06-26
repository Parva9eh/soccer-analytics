"use client";

import { useMemo, useState } from "react";
import { PitchFrame } from "@/components/pitch/PitchFrame";
import { Goals2D } from "@/components/pitch/Goals2D";
import { SVG_VIEW, getSvgPitchMarkings, statsbombToSvg } from "@/components/pitch/constants";
import type { MatchPassNetwork } from "@/lib/pass-types";

interface PassNetworkPitchProps {
  network: MatchPassNetwork;
}

function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function PassNetworkPitch({ network }: PassNetworkPitchProps) {
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
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

  const nodeByPlayer = useMemo(
    () => new Map(network.nodes.map((node) => [node.player, node])),
    [network.nodes],
  );

  const maxEdgeCount = Math.max(...network.edges.map((edge) => edge.count), 1);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hoveredPlayer && !hoveredEdge) {
      setTooltipPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    });
  };

  const activeEdge = network.edges.find(
    (edge) => `${edge.passer}->${edge.recipient}` === hoveredEdge,
  );
  const activeNode = hoveredPlayer ? nodeByPlayer.get(hoveredPlayer) : null;

  return (
    <PitchFrame mode="2d" label="Pass network">
      <div className="relative p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`Pass network for ${network.team}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setHoveredPlayer(null);
            setHoveredEdge(null);
            setTooltipPos(null);
          }}
        >
          <defs>
            <marker
              id="passArrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" opacity="0.85" />
            </marker>
          </defs>

          <rect
            x={padding}
            y={padding}
            width={innerW}
            height={innerH}
            rx="4"
            fill="#0c4a12"
          />

          <g
            stroke="#f8fafc"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          >
            <rect x={padding} y={padding} width={innerW} height={innerH} rx="4" />
            <line x1={cx} y1={padding} x2={cx} y2={height - padding} />
            <circle cx={cx} cy={cy} r={m.centerCircleR} />
          </g>

          <Goals2D padding={padding} width={width} height={height} cy={cy} m={m} />

          {network.edges.map((edge) => {
            const passer = nodeByPlayer.get(edge.passer);
            const recipient = nodeByPlayer.get(edge.recipient);
            if (!passer || !recipient) {
              return null;
            }
            const x1 = scaleX(passer.avg_x);
            const y1 = scaleY(passer.avg_y);
            const x2 = scaleX(recipient.avg_x);
            const y2 = scaleY(recipient.avg_y);
            const edgeKey = `${edge.passer}->${edge.recipient}`;
            const isActive = hoveredEdge === edgeKey;
            const strokeWidth = 1.2 + (edge.count / maxEdgeCount) * 5;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const curveOffset = Math.min(36, Math.hypot(x2 - x1, y2 - y1) * 0.18);
            const path = `M ${x1} ${y1} Q ${midX} ${midY - curveOffset} ${x2} ${y2}`;

            return (
              <path
                key={edgeKey}
                d={path}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={isActive ? strokeWidth + 1.5 : strokeWidth}
                strokeOpacity={isActive ? 0.95 : 0.55}
                markerEnd="url(#passArrow)"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredEdge(edgeKey)}
                onMouseLeave={() => setHoveredEdge(null)}
              />
            );
          })}

          {network.nodes.map((node) => {
            const x = scaleX(node.avg_x);
            const y = scaleY(node.avg_y);
            const isActive = hoveredPlayer === node.player;
            const radius = isActive ? 16 : 13;
            const total = node.passes_made + node.passes_received;

            return (
              <g
                key={node.player}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPlayer(node.player)}
                onMouseLeave={() => setHoveredPlayer(null)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={isActive ? "hsl(var(--primary))" : "hsl(var(--card))"}
                  stroke={isActive ? "#fff" : "hsl(var(--primary))"}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  className="fill-foreground text-[9px] font-semibold"
                  style={{ pointerEvents: "none" }}
                >
                  {playerInitials(node.player)}
                </text>
                {total >= 8 && (
                  <text
                    x={x}
                    y={y + radius + 12}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[8px]"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.passes_made}/{node.passes_received}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {tooltipPos && activeNode && (
          <NetworkTooltip
            title={activeNode.player}
            lines={[
              `Made ${activeNode.passes_made} · Received ${activeNode.passes_received}`,
              `Avg position (${activeNode.avg_x.toFixed(1)}, ${activeNode.avg_y.toFixed(1)})`,
            ]}
            tooltipPos={tooltipPos}
            width={width}
            height={height}
          />
        )}

        {tooltipPos && activeEdge && !activeNode && (
          <NetworkTooltip
            title={`${activeEdge.passer} → ${activeEdge.recipient}`}
            lines={[
              `${activeEdge.count} completed passes`,
              `${activeEdge.progressive_count} progressive`,
            ]}
            tooltipPos={tooltipPos}
            width={width}
            height={height}
          />
        )}

        <p className="pointer-events-none mt-2 text-center text-[9px] text-muted-foreground/80">
          Line thickness shows pass volume · Arrows flow passer → recipient
        </p>
      </div>
    </PitchFrame>
  );
}

function NetworkTooltip({
  title,
  lines,
  tooltipPos,
  width,
  height,
}: {
  title: string;
  lines: string[];
  tooltipPos: { x: number; y: number };
  width: number;
  height: number;
}) {
  return (
    <div
      className="pointer-events-none absolute z-50 max-w-[260px] rounded-lg border border-border bg-card/95 px-3.5 py-2 text-sm text-foreground shadow-xl backdrop-blur-sm"
      style={{
        left: `${(tooltipPos.x / width) * 100 + 2}%`,
        top: `${(tooltipPos.y / height) * 100 - 6}%`,
        transform: "translate(0, -100%)",
      }}
    >
      <div className="font-semibold">{title}</div>
      {lines.map((line) => (
        <div key={line} className="text-caption mt-0.5 text-muted-foreground">
          {line}
        </div>
      ))}
    </div>
  );
}