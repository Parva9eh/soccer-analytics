"use client";

import { useState } from "react";
import { getEventColor } from "./utils";

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
  selectedEventIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
}


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
  onSelectionChange,
  selectedEventIds = [],
}: PitchProps) {
  const [hoveredEvent, setHoveredEvent] = useState<EventPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Drag-to-select state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);

  const width = 880;
  const height = 570;
  const padding = 32;

  const scaleX = (x: number) => padding + (x / 120) * (width - padding * 2);
  const scaleY = (y: number) => padding + (y / 80) * (height - padding * 2);

  // Convert SVG coordinates to screen for tooltip positioning
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isSelecting) { setTooltipPos(null); return; }
    if (!hoveredEvent) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const svgY = ((e.clientY - rect.top) / rect.height) * height;
    setTooltipPos({ x: svgX, y: svgY });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  };

  const handleMouseMoveSelection = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isSelecting || !selectionStart) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    setSelectionEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) {
      setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null); return;
    }
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);
    if (Math.hypot(maxX - minX, maxY - minY) < 25) {
      setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null); return;
    }
    const selected = events.filter(e => e.x != null && e.y != null).filter(e => {
      const sx = scaleX(e.x!); const sy = scaleY(e.y!);
      return sx >= minX && sx <= maxX && sy >= minY && sy <= maxY;
    }).map(e => e.id);
    if (selected.length > 0 && onSelectionChange) onSelectionChange(selected);
    setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null);
  };

  return (
    <div className="relative w-full max-w-[900px] mx-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto border border-slate-700/70 rounded-2xl bg-[#0B1120] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        preserveAspectRatio="xMidYMid meet"
        onMouseMove={(e) => { handleMouseMove(e); handleMouseMoveSelection(e); }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setTooltipPos(null); setHoveredEvent(null);
          if (isSelecting) { setIsSelecting(false); setSelectionStart(null); setSelectionEnd(null); }
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

          {/* Advanced mow-stripe grass texture for 2D (matches 3D procedural iconic look) */}
          <pattern id="grassPattern" patternUnits="userSpaceOnUse" width="14" height="7">
            <rect width="14" height="7" fill="#0a3d0a" />
            {/* Stripe variation */}
            <rect x="0" y="0" width="7" height="7" fill="#0f4d12" opacity="0.12" />
            <line x1="0" y1="3.5" x2="14" y2="3.5" stroke="#083308" strokeWidth="0.6" opacity="0.25" />
            <line x1="0" y1="1.2" x2="14" y2="1.2" stroke="#145a14" strokeWidth="0.4" opacity="0.15" />
          </pattern>
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

        {/* Subtle grass texture fill for advanced field realism (2D) */}
        <rect
          x={padding}
          y={padding}
          width={width - padding * 2}
          height={height - padding * 2}
          fill="url(#grassPattern)"
          opacity="0.55"
        />

        {/* Simple stadium stands for 2D real pitch atmosphere (advanced visual) */}
        <rect x={padding - 25} y={padding - 25} width={width - padding*2 + 50} height={25} fill="#1a2a4a" opacity="0.7" />
        <rect x={padding - 25} y={height - padding} width={width - padding*2 + 50} height={25} fill="#1a2a4a" opacity="0.7" />
        <rect x={padding - 25} y={padding - 25} width={25} height={height - padding*2 + 50} fill="#1a2a4a" opacity="0.7" />
        <rect x={width - padding} y={padding - 25} width={25} height={height - padding*2 + 50} fill="#1a2a4a" opacity="0.7" />
        {/* Seat lines on stands */}
        <g stroke="#334455" strokeWidth="1" opacity="0.6">
          <line x1={padding-20} y1={padding-15} x2={width-padding+20} y2={padding-15} />
          <line x1={padding-20} y1={height-padding+15} x2={width-padding+20} y2={height-padding+15} />
          <line x1={padding-15} y1={padding-20} x2={padding-15} y2={height-padding+20} />
          <line x1={width-padding+15} y1={padding-20} x2={width-padding+15} y2={height-padding+20} />
        </g>

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
          <circle cx={width / 2} cy={height / 2} r="73" />
          <circle cx={width / 2} cy={height / 2} r="3.2" fill="#475569" />

          {/* Left Penalty Area - accurate proportions */}
          <rect
            x={padding}
            y={(height - 322) / 2}
            width="132"
            height="322"
            rx="3"
          />
          <rect
            x={padding}
            y={(height - 146) / 2}
            width="44"
            height="146"
            rx="2"
          />
          <circle cx={padding + 120} cy={height / 2} r="4.2" fill="#475569" />

          {/* Right Penalty Area */}
          <rect
            x={width - padding - 132}
            y={(height - 322) / 2}
            width="132"
            height="322"
            rx="3"
          />
          <rect
            x={width - padding - 44}
            y={(height - 146) / 2}
            width="44"
            height="146"
            rx="2"
          />
          <circle
            cx={width - padding - 120}
            cy={height / 2}
            r="4.2"
            fill="#475569"
          />

          {/* Penalty D arcs (the "D") - accurate radius ~73px for real proportion */}
          {/* Left D - curves toward center */}
          <path
            d={`M ${padding + 132} ${height / 2 - 73} A 73 73 0 0 1 ${padding + 132} ${height / 2 + 73}`}
            fill="none"
            stroke="#475569"
            strokeWidth="1.7"
          />
          {/* Right D */}
          <path
            d={`M ${width - padding - 132} ${height / 2 - 73} A 73 73 0 0 0 ${width - padding - 132} ${height / 2 + 73}`}
            fill="none"
            stroke="#475569"
            strokeWidth="1.7"
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

          {/* Goal posts (advanced visual pop for 2D, matching 3D posts) */}
          {/* Left goal */}
          <g stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round">
            <line x1={padding - 4} y1={height / 2 - 38} x2={padding - 4} y2={height / 2 + 38} />
            <line x1={padding + 4} y1={height / 2 - 38} x2={padding + 4} y2={height / 2 + 38} />
            <line x1={padding - 4} y1={height / 2 - 38} x2={padding + 4} y2={height / 2 - 38} />
          </g>
          {/* Right goal */}
          <g stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round">
            <line x1={width - padding + 4} y1={height / 2 - 38} x2={width - padding + 4} y2={height / 2 + 38} />
            <line x1={width - padding - 4} y1={height / 2 - 38} x2={width - padding - 4} y2={height / 2 + 38} />
            <line x1={width - padding - 4} y1={height / 2 - 38} x2={width - padding + 4} y2={height / 2 - 38} />
          </g>
        </g>

        {/* Drag Selection Rectangle */}
        {isSelecting && selectionStart && selectionEnd && (
          <rect
            x={Math.min(selectionStart.x, selectionEnd.x)}
            y={Math.min(selectionStart.y, selectionEnd.y)}
            width={Math.abs(selectionEnd.x - selectionStart.x)}
            height={Math.abs(selectionEnd.y - selectionStart.y)}
            fill="rgba(163, 172, 194, 0.15)"
            stroke="#a3aca6"
            strokeWidth="1"
            strokeDasharray="4 2"
          />
        )}

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

            const isFaded = selectedEventIds && selectedEventIds.length > 0 && !selectedEventIds.includes(event.id);
            const finalOpacity = isFaded ? Math.min(opacity, 0.25) : opacity;
            const finalScale = isFaded ? 0.6 : 1;

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
                    strokeOpacity={finalOpacity}
                    filter={isActive ? "url(#eventGlow)" : undefined}
                    className="cursor-pointer transition-all duration-150"
                    style={{ opacity: finalOpacity }}
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
                    style={{ opacity: finalOpacity }}
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
                    strokeOpacity={finalOpacity}
                    strokeDasharray="5 3"
                    className="cursor-pointer transition-all duration-150"
                    style={{ opacity: finalOpacity }}
                    onMouseEnter={() => setHoveredEvent(event)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => onEventClick?.(event)}
                  />
                  <polygon
                    points={getArrowPoints(x2, y2, angle, 8)}
                    fill={getEventColor(event.event_type)}
                    className="cursor-pointer"
                    onClick={() => onEventClick?.(event)}
                    style={{ opacity: finalOpacity }}
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
                    strokeOpacity={finalOpacity}
                    filter={isActive ? "url(#eventGlow)" : undefined}
                    className="cursor-pointer transition-all duration-150"
                    style={{ opacity: finalOpacity }}
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
                strokeOpacity={finalOpacity}
                filter={isActive ? "url(#eventGlow)" : undefined}
                className="cursor-pointer transition-all duration-150"
                style={{ opacity: finalOpacity }}
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
