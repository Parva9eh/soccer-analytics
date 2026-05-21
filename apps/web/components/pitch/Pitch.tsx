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
  width?: number;
  height?: number;
}

const getEventColor = (eventType: string | null): string => {
  if (!eventType) return "#9CA3AF"; // Gray

  const type = eventType.toLowerCase();

  if (type.includes("pass")) return "#3B82F6"; // Blue
  if (type.includes("shot")) return "#EF4444"; // Red
  if (type.includes("pressure")) return "#F59E0B"; // Amber
  if (type.includes("carry")) return "#10B981"; // Green
  if (type.includes("duel")) return "#8B5CF6"; // Purple
  if (type.includes("ball receipt")) return "#60A5FA"; // Light Blue

  return "#6B7280"; // Default gray
};

export function Pitch({ events, width = 800, height = 520 }: PitchProps) {
  const [hoveredEvent, setHoveredEvent] = useState<EventPoint | null>(null);

  // Scale coordinates from StatsBomb (0-120 x, 0-80 y) to our SVG
  const scaleX = (x: number) => (x / 120) * width;
  const scaleY = (y: number) => (y / 80) * height;

  return (
    <div className="relative bg-white rounded-xl border shadow-sm p-4">
      <svg
        width={width}
        height={height}
        className="mx-auto"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Pitch Background */}
        <rect x="0" y="0" width={width} height={height} fill="#166534" rx="8" />

        {/* Pitch Lines */}
        <g stroke="#fff" strokeWidth="2" fill="none">
          {/* Outer Boundary */}
          <rect x="10" y="10" width={width - 20} height={height - 20} rx="4" />

          {/* Center Line */}
          <line x1={width / 2} y1="10" x2={width / 2} y2={height - 10} />

          {/* Center Circle */}
          <circle cx={width / 2} cy={height / 2} r="60" />

          {/* Center Spot */}
          <circle cx={width / 2} cy={height / 2} r="4" fill="#fff" />

          {/* Left Penalty Area */}
          <rect x="10" y={(height - 200) / 2} width="120" height="200" />
          <rect x="10" y={(height - 80) / 2} width="50" height="80" />

          {/* Right Penalty Area */}
          <rect
            x={width - 130}
            y={(height - 200) / 2}
            width="120"
            height="200"
          />
          <rect x={width - 60} y={(height - 80) / 2} width="50" height="80" />

          {/* Penalty Spots */}
          <circle cx="90" cy={height / 2} r="4" fill="#fff" />
          <circle cx={width - 90} cy={height / 2} r="4" fill="#fff" />
        </g>

        {/* Event Dots */}
        {events
          .filter((e) => e.x !== null && e.y !== null)
          .map((event) => {
            const color = getEventColor(event.event_type);
            const isHovered = hoveredEvent?.id === event.id;

            return (
              <g key={event.id}>
                <circle
                  cx={scaleX(event.x!)}
                  cy={scaleY(event.y!)}
                  r={isHovered ? 7 : 5}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={isHovered ? 2 : 1}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredEvent(event)}
                  onMouseLeave={() => setHoveredEvent(null)}
                />
              </g>
            );
          })}
      </svg>

      {/* Tooltip */}
      {hoveredEvent && (
        <div className="absolute bottom-4 left-4 bg-white border shadow-lg rounded-lg px-3 py-2 text-sm z-50">
          <div className="font-medium">{hoveredEvent.event_type}</div>
          <div className="text-xs text-muted-foreground">
            Minute {hoveredEvent.minute}
            {hoveredEvent.second !== null &&
              `:${hoveredEvent.second.toString().padStart(2, "0")}`}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />{" "}
          Pass
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />{" "}
          Shot
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />{" "}
          Pressure
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />{" "}
          Carry
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-500" />{" "}
          Duel
        </div>
      </div>
    </div>
  );
}
