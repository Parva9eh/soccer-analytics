"use client";

import { useState } from "react";

interface EventPoint {
  id: number;
  x: number | null;
  y: number | null;
  end_x?: number | null;
  end_y?: number | null;
  event_type: string | null;
  minute: number | null;
  second: number | null;
}

interface PitchProps {
  events: EventPoint[];
  onEventClick?: (event: EventPoint) => void;
  highlightedEventId?: number | null;

}

const getEventColor = (eventType: string | null): string => {
  if (!eventType) return "#64748B";
  const type = eventType.toLowerCase();
  if (type.includes("shot")) return "#EF4444";
  if (type.includes("pass")) return "#3B82F6";
  if (type.includes("pressure")) return "#F59E0B";
  if (type.includes("carry")) return "#10B981";
  if (type.includes("duel")) return "#8B5CF6";
  return "#64748B";
};

// Helper to calculate angle in degrees
const getAngle = (x1: number, y1: number, x2: number, y2: number): number => {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
};

// Helper to create arrowhead points (properly aligned)
const getArrowPoints = (
  x: number,
  y: number,
  angleDeg: number,
  size: number = 9,
) => {
  const rad = (angleDeg * Math.PI) / 180;
  const leftX = x - size * Math.cos(rad - 0.45);
  const leftY = y - size * Math.sin(rad - 0.45);
  const rightX = x - size * Math.cos(rad + 0.45);
  const rightY = y - size * Math.sin(rad + 0.45);
  return `${x},${y} ${leftX},${leftY} ${rightX},${rightY}`;
};

export function Pitch({
  events,
  onEventClick,
  highlightedEventId,
}: PitchProps) {
  const [hoveredEvent, setHoveredEvent] = useState<EventPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const width = 880;
  const height = 570;
  const padding = 32;

  const scaleX = (x: number) => padding + (x / 120) * (width - padding * 2);
  const scaleY = (y: number) => padding + (y / 80) * (height - padding * 2);

  // Convert SVG coordinates to screen for tooltip positioning
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hoveredEvent) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const svgY = ((e.clientY - rect.top) / rect.height) * height;
    setTooltipPos({ x: svgX, y: svgY });
  };

  return (
    <div className="relative w-full max-w-[900px] mx-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto border border-slate-700/70 rounded-2xl bg-[#0B1120] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setTooltipPos(null);
          setHoveredEvent(null);
        }}
      >
        <defs>
          {/* Subtle glow for highlighted/hovered events */}
          <filter id="eventGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Pitch Background */}
        <rect
          x={padding - 12}
          y={padding - 12}
          width={width - padding * 2 + 24}
          height={height - padding * 2 + 24}
          rx="14"
          fill="#0B1120"
          stroke="#1E2937"
          strokeWidth="2"
        />

        {/* Pitch Lines */}
        <g
          stroke="#475569"
          strokeWidth="1.7"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line
            x1={width / 2}
            y1={padding}
            x2={width / 2}
            y2={height - padding}
          />
          <circle cx={width / 2} cy={height / 2} r="54" />
          <circle cx={width / 2} cy={height / 2} r="3.2" fill="#475569" />

          {/* Left Penalty Area */}
          <rect
            x={padding}
            y={(height - 248) / 2}
            width="148"
            height="248"
            rx="3"
          />
          <rect
            x={padding}
            y={(height - 108) / 2}
            width="64"
            height="108"
            rx="2"
          />
          <circle cx={padding + 102} cy={height / 2} r="4.2" fill="#475569" />

          {/* Right Penalty Area */}
          <rect
            x={width - padding - 148}
            y={(height - 248) / 2}
            width="148"
            height="248"
            rx="3"
          />
          <rect
            x={width - padding - 64}
            y={(height - 108) / 2}
            width="64"
            height="108"
            rx="2"
          />
          <circle
            cx={width - padding - 102}
            cy={height / 2}
            r="4.2"
            fill="#475569"
          />

          {/* Corner Arcs */}
          <path
            d={`M ${padding + 18} ${padding} Q ${padding} ${padding} ${padding} ${padding + 18}`}
          />
          <path
            d={`M ${width - padding - 18} ${padding} Q ${width - padding} ${padding} ${width - padding} ${padding + 18}`}
          />
          <path
            d={`M ${padding + 18} ${height - padding} Q ${padding} ${height - padding} ${padding} ${height - padding - 18}`}
          />
          <path
            d={`M ${width - padding - 18} ${height - padding} Q ${width - padding} ${height - padding} ${width - padding} ${height - padding - 18}`}
          />
        </g>

        {/* Event Elements */}
        {events
          .filter((e) => e.x !== null && e.y !== null)
          .map((event) => {
            const eventType = event.event_type?.toLowerCase() || "";
            const isPass = eventType.includes("pass");
            const isCarry = eventType.includes("carry");
            const isShot = eventType.includes("shot");
            const isHighlighted = highlightedEventId === event.id;
            const isHovered = hoveredEvent?.id === event.id;
            const isActive = isHighlighted || isHovered;
            const strokeW = isHighlighted ? 3.4 : isHovered ? 2.9 : 2.2;
            const opacity = isActive ? 1 : 0.88;

            // === PASSES (Solid line + properly aligned arrowhead) ===
            if (isPass && event.end_x != null && event.end_y != null) {
              const x1 = scaleX(event.x!);
              const y1 = scaleY(event.y!);
              const x2 = scaleX(event.end_x);
              const y2 = scaleY(event.end_y);
              const angle = getAngle(x1, y1, x2, y2);

              return (
                <g key={event.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={getEventColor(event.event_type)}
                    strokeWidth={strokeW}
                    strokeOpacity={opacity}
                    filter={isActive ? "url(#eventGlow)" : undefined}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredEvent(event)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => onEventClick?.(event)}
                  />
                  {/* Properly aligned arrowhead */}
                  <polygon
                    points={getArrowPoints(x2, y2, angle, 9.5)}
                    fill={getEventColor(event.event_type)}
                    className="cursor-pointer"
                    onClick={() => onEventClick?.(event)}
                  />
                </g>
              );
            }

            // === CARRIES (Dashed line + aligned arrowhead) ===
            if (isCarry && event.end_x != null && event.end_y != null) {
              const x1 = scaleX(event.x!);
              const y1 = scaleY(event.y!);
              const x2 = scaleX(event.end_x);
              const y2 = scaleY(event.end_y);
              const angle = getAngle(x1, y1, x2, y2);

              return (
                <g key={event.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={getEventColor(event.event_type)}
                    strokeWidth={strokeW}
                    strokeOpacity={opacity}
                    strokeDasharray="5 3"
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredEvent(event)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => onEventClick?.(event)}
                  />
                  <polygon
                    points={getArrowPoints(x2, y2, angle, 8)}
                    fill={getEventColor(event.event_type)}
                    className="cursor-pointer"
                    onClick={() => onEventClick?.(event)}
                  />
                </g>
              );
            }

            // === SHOTS (Larger dot + direction indicator line) ===
            if (isShot) {
              const x1 = scaleX(event.x!);
              const y1 = scaleY(event.y!);
              const size = isActive ? 9.8 : 7.5;

              // Draw short direction line if end location exists
              let shotDirectionLine = null;
              if (event.end_x != null && event.end_y != null) {
                const x2 = scaleX(event.end_x);
                const y2 = scaleY(event.end_y);
                const dx = x2 - x1;
                const dy = y2 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const shortLength = Math.min(dist, 26);
                const shortX = x1 + (dx / dist) * shortLength;
                const shortY = y1 + (dy / dist) * shortLength;

                shotDirectionLine = (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={shortX}
                    y2={shortY}
                    stroke="#EF4444"
                    strokeWidth={isActive ? 2.2 : 1.6}
                    strokeOpacity={isActive ? 0.9 : 0.65}
                  />
                );
              }

              return (
                <g key={event.id}>
                  {shotDirectionLine}
                  <circle
                    cx={x1}
                    cy={y1}
                    r={size}
                    fill="#EF4444"
                    stroke={isActive ? "#fff" : "none"}
                    strokeWidth={isActive ? 3 : 0}
                    strokeOpacity={0.5}
                    filter={isActive ? "url(#eventGlow)" : undefined}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredEvent(event)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => onEventClick?.(event)}
                  />
                </g>
              );
            }

            // === Default Events (Pressure, Duel, etc.) ===
            const size = isHighlighted ? 8.5 : isHovered ? 7.5 : 6;
            return (
              <circle
                key={event.id}
                cx={scaleX(event.x!)}
                cy={scaleY(event.y!)}
                r={size}
                fill={getEventColor(event.event_type)}
                stroke={isActive ? "#fff" : "none"}
                strokeWidth={isActive ? 2.4 : 0}
                strokeOpacity={0.6}
                filter={isActive ? "url(#eventGlow)" : undefined}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredEvent(event)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => onEventClick?.(event)}
              />
            );
          })}
      </svg>

      {/* Advanced Tooltip - follows cursor near event */}
      {hoveredEvent && tooltipPos && (
        <div
          className="absolute z-50 pointer-events-none rounded-lg border border-slate-700/80 bg-slate-900/95 px-3.5 py-2 text-sm shadow-xl backdrop-blur-sm"
          style={{
            left: `${(tooltipPos.x / width) * 100 + 3}%`,
            top: `${(tooltipPos.y / height) * 100 - 8}%`,
            transform: "translate(0, -100%)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: getEventColor(hoveredEvent.event_type) }}
            />
            <span className="font-semibold text-white">
              {hoveredEvent.event_type}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-400 tabular-nums">
            {hoveredEvent.minute}:
            {hoveredEvent.second !== null
              ? hoveredEvent.second.toString().padStart(2, "0")
              : "00"}
          </div>
        </div>
      )}
    </div>
  );
}
