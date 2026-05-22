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

  const width = 880;
  const height = 570;
  const padding = 32;

  const scaleX = (x: number) => padding + (x / 120) * (width - padding * 2);
  const scaleY = (y: number) => padding + (y / 80) * (height - padding * 2);

  return (
    <div className="relative w-full max-w-[900px] mx-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto border border-slate-700 rounded-2xl bg-[#0F172A] shadow-inner"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Pitch Background */}
        <rect
          x={padding - 12}
          y={padding - 12}
          width={width - padding * 2 + 24}
          height={height - padding * 2 + 24}
          rx="14"
          fill="#0F172A"
          stroke="#334155"
          strokeWidth="2.5"
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
                    strokeWidth={isActive ? 2.7 : 2.1}
                    strokeOpacity={isActive ? 1 : 0.9}
                    className="cursor-pointer transition-all"
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
                    strokeWidth={isActive ? 2.5 : 2.0}
                    strokeOpacity={isActive ? 1 : 0.85}
                    strokeDasharray="5 3"
                    className="cursor-pointer transition-all"
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
                    stroke="#fff"
                    strokeWidth={isActive ? 2.8 : 2.1}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredEvent(event)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => onEventClick?.(event)}
                  />
                </g>
              );
            }

            // === Default Events (Pressure, Duel, etc.) ===
            const size = isActive ? 7.5 : 5.8;
            return (
              <circle
                key={event.id}
                cx={scaleX(event.x!)}
                cy={scaleY(event.y!)}
                r={size}
                fill={getEventColor(event.event_type)}
                stroke="#fff"
                strokeWidth={isActive ? 2.2 : 1.4}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredEvent(event)}
                onMouseLeave={() => setHoveredEvent(null)}
                onClick={() => onEventClick?.(event)}
              />
            );
          })}
      </svg>

      {/* Tooltip */}
      {hoveredEvent && (
        <div className="absolute top-4 right-4 bg-slate-800 border border-slate-700 shadow-lg rounded-lg px-3.5 py-2.5 text-sm z-50 pointer-events-none">
          <div className="font-medium text-white">
            {hoveredEvent.event_type}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            Minute {hoveredEvent.minute}
            {hoveredEvent.second !== null &&
              `:${hoveredEvent.second.toString().padStart(2, "0")}`}
          </div>
        </div>
      )}
    </div>
  );
}
