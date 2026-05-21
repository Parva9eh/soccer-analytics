"use client";

import { useState } from "react";

interface EventPoint {
  id: number;
  x: number | null;
  y: number | null;
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

export function Pitch({
  events,
  onEventClick,
  highlightedEventId,
}: PitchProps) {
  const [hoveredEvent, setHoveredEvent] = useState<EventPoint | null>(null);
  const width = 860;
  const height = 560;
  const padding = 28;

  const scaleX = (x: number) => padding + (x / 120) * (width - padding * 2);
  const scaleY = (y: number) => padding + (y / 80) * (height - padding * 2);

  return (
    <div className="relative w-full max-w-[880px] mx-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto border border-slate-700 rounded-2xl bg-[#0F172A] shadow-inner"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Pitch Background */}
        <rect
          x={padding - 10}
          y={padding - 10}
          width={width - padding * 2 + 20}
          height={height - padding * 2 + 20}
          rx="10"
          fill="#0F172A"
          stroke="#334155"
          strokeWidth="2"
        />

        {/* Pitch Lines - Softer for dark theme */}
        <g stroke="#475569" strokeWidth="1.5" fill="none">
          <line
            x1={width / 2}
            y1={padding}
            x2={width / 2}
            y2={height - padding}
          />
          <circle cx={width / 2} cy={height / 2} r="52" />
          <circle cx={width / 2} cy={height / 2} r="3.5" fill="#475569" />

          {/* Left Penalty Area */}
          <rect x={padding} y={(height - 240) / 2} width="140" height="240" />
          <rect x={padding} y={(height - 100) / 2} width="60" height="100" />
          <circle cx={padding + 95} cy={height / 2} r="4" fill="#475569" />

          {/* Right Penalty Area */}
          <rect
            x={width - padding - 140}
            y={(height - 240) / 2}
            width="140"
            height="240"
          />
          <rect
            x={width - padding - 60}
            y={(height - 100) / 2}
            width="60"
            height="100"
          />
          <circle
            cx={width - padding - 95}
            cy={height / 2}
            r="4"
            fill="#475569"
          />
        </g>

        {/* Event Dots */}
        {events
          .filter((e) => e.x !== null && e.y !== null)
          .map((event) => {
            const isHighlighted = highlightedEventId === event.id;
            const isHovered = hoveredEvent?.id === event.id;
            const size = isHighlighted || isHovered ? 7.5 : 5.5;

            return (
              <circle
                key={event.id}
                cx={scaleX(event.x!)}
                cy={scaleY(event.y!)}
                r={size}
                fill={getEventColor(event.event_type)}
                stroke="#fff"
                strokeWidth={isHighlighted || isHovered ? 2 : 1}
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
        <div className="absolute top-4 right-4 bg-slate-800 border border-slate-700 shadow-lg rounded-lg px-3 py-2 text-sm z-50 pointer-events-none">
          <div className="font-medium text-white">
            {hoveredEvent.event_type}
          </div>
          <div className="text-xs text-slate-400">
            Minute {hoveredEvent.minute}
            {hoveredEvent.second !== null &&
              `:${hoveredEvent.second.toString().padStart(2, "0")}`}
          </div>
        </div>
      )}
    </div>
  );
}
