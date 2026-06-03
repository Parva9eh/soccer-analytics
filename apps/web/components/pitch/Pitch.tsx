"use client";

import { useState } from "react";
import { getEventColor } from "./utils";
import { PitchFrame } from "./PitchFrame";
import { Goals2D } from "./Goals2D";
import { SVG_VIEW, getSvgPitchMarkings, statsbombToSvg } from "./constants";

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

const getAngle = (x1: number, y1: number, x2: number, y2: number): number =>
  (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;

const getArrowPoints = (x: number, y: number, angleDeg: number, size = 9) => {
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
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);

  const { width, height, padding } = SVG_VIEW;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const scaleX = (x: number) => statsbombToSvg(x, 0, width, height, padding).sx;
  const scaleY = (y: number) => statsbombToSvg(0, y, width, height, padding).sy;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isSelecting) {
      setTooltipPos(null);
      return;
    }
    if (!hoveredEvent) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    });
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
    setSelectionEnd({
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    });
  };

  const handleMouseUp = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }
    const minX = Math.min(selectionStart.x, selectionEnd.x);
    const maxX = Math.max(selectionStart.x, selectionEnd.x);
    const minY = Math.min(selectionStart.y, selectionEnd.y);
    const maxY = Math.max(selectionStart.y, selectionEnd.y);
    if (Math.hypot(maxX - minX, maxY - minY) < 25) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }
    const selected = events
      .filter((ev) => ev.x != null && ev.y != null)
      .filter((ev) => {
        const sx = scaleX(ev.x!);
        const sy = scaleY(ev.y!);
        return sx >= minX && sx <= maxX && sy >= minY && sy <= maxY;
      })
      .map((ev) => ev.id);
    if (selected.length > 0 && onSelectionChange) onSelectionChange(selected);
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const cx = width / 2;
  const cy = height / 2;
  const m = getSvgPitchMarkings(innerW, innerH);

  return (
    <PitchFrame mode="2d" className="w-full max-w-[960px] mx-auto">
      <div className="relative p-2 sm:p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Football pitch with match events"
          onMouseMove={(e) => {
            handleMouseMove(e);
            handleMouseMoveSelection(e);
          }}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setTooltipPos(null);
            setHoveredEvent(null);
            if (isSelecting) {
              setIsSelecting(false);
              setSelectionStart(null);
              setSelectionEnd(null);
            }
          }}
        >
          <defs>
            <filter id="eventGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <pattern id="grassStripes" patternUnits="userSpaceOnUse" width="28" height={innerH}>
              <rect width="14" height={innerH} fill="#0c4a12" />
              <rect x="14" width="14" height={innerH} fill="#15803d" opacity="0.22" />
            </pattern>

            <linearGradient id="standNorth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="standSouth" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="standWest" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="standEast" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            <radialGradient id="floodGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#fef3c7" stopOpacity="0" />
            </radialGradient>

            <pattern id="netPattern" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M0 0 L6 6 M6 0 L0 6" stroke="#94a3b8" strokeWidth="0.5" opacity="0.45" />
            </pattern>

            <radialGradient id="vignette" cx="50%" cy="50%" r="58%">
              <stop offset="55%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
            </radialGradient>
          </defs>

          {/* Stadium bowl — tiered stands */}
          <g aria-hidden>
            <rect
              x={padding - 42}
              y={padding - 52}
              width={innerW + 84}
              height={46}
              rx="6"
              fill="url(#standNorth)"
            />
            {[0, 1, 2, 3, 4].map((t) => (
              <line
                key={`nt-${t}`}
                x1={padding - 36 + t * 8}
                y1={padding - 48 + t * 9}
                x2={width - padding + 36 - t * 8}
                y2={padding - 48 + t * 9}
                stroke="#475569"
                strokeWidth="0.8"
                opacity="0.5"
              />
            ))}

            <rect
              x={padding - 42}
              y={height - padding + 6}
              width={innerW + 84}
              height={46}
              rx="6"
              fill="url(#standSouth)"
            />
            {[0, 1, 2, 3, 4].map((t) => (
              <line
                key={`st-${t}`}
                x1={padding - 36 + t * 8}
                y1={height - padding + 10 + t * 9}
                x2={width - padding + 36 - t * 8}
                y2={height - padding + 10 + t * 9}
                stroke="#475569"
                strokeWidth="0.8"
                opacity="0.5"
              />
            ))}

            <rect
              x={padding - 52}
              y={padding - 20}
              width={46}
              height={innerH + 40}
              rx="6"
              fill="url(#standWest)"
            />
            <rect
              x={width - padding + 6}
              y={padding - 20}
              width={46}
              height={innerH + 40}
              rx="6"
              fill="url(#standEast)"
            />

            {/* Roof truss lines */}
            <path
              d={`M ${padding - 30} ${padding - 54} Q ${cx} ${padding - 68} ${width - padding + 30} ${padding - 54}`}
              fill="none"
              stroke="#334155"
              strokeWidth="2"
              opacity="0.6"
            />
          </g>

          {/* Floodlight glow at corners */}
          <g aria-hidden opacity="0.9">
            <circle cx={padding - 20} cy={padding - 20} r="48" fill="url(#floodGlow)" />
            <circle cx={width - padding + 20} cy={padding - 20} r="48" fill="url(#floodGlow)" />
            <circle cx={padding - 20} cy={height - padding + 20} r="42" fill="url(#floodGlow)" />
            <circle cx={width - padding + 20} cy={height - padding + 20} r="42" fill="url(#floodGlow)" />
          </g>

          {/* Running track ring */}
          <rect
            x={padding - 14}
            y={padding - 14}
            width={innerW + 28}
            height={innerH + 28}
            rx="10"
            fill="none"
            stroke="#3d2817"
            strokeWidth="10"
          />
          <rect
            x={padding - 8}
            y={padding - 8}
            width={innerW + 16}
            height={innerH + 16}
            rx="8"
            fill="none"
            stroke="#1c1917"
            strokeWidth="3"
          />

          {/* LED hoardings */}
          <g aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => {
              const segW = innerW / 10;
              const x = padding + i * segW;
              const colors = ["#fbbf24", "#38bdf8", "#f87171", "#34d399", "#a78bfa"];
              return (
                <rect
                  key={`led-n-${i}`}
                  x={x + 1}
                  y={padding - 12}
                  width={segW - 2}
                  height={5}
                  fill={colors[i % colors.length]}
                  opacity="0.85"
                  rx="1"
                />
              );
            })}
            {Array.from({ length: 10 }).map((_, i) => {
              const segW = innerW / 10;
              const x = padding + i * segW;
              const colors = ["#34d399", "#a78bfa", "#fbbf24", "#38bdf8", "#f87171"];
              return (
                <rect
                  key={`led-s-${i}`}
                  x={x + 1}
                  y={height - padding + 7}
                  width={segW - 2}
                  height={5}
                  fill={colors[i % colors.length]}
                  opacity="0.85"
                  rx="1"
                />
              );
            })}
          </g>

          {/* Grass */}
          <rect
            x={padding}
            y={padding}
            width={innerW}
            height={innerH}
            rx="4"
            fill="url(#grassStripes)"
          />

          {/* Markings */}
          <g
            stroke="#f8fafc"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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

            <path
              d={`M ${padding + m.cornerArcR} ${padding} Q ${padding} ${padding} ${padding} ${padding + m.cornerArcR}`}
            />
            <path
              d={`M ${width - padding - m.cornerArcR} ${padding} Q ${width - padding} ${padding} ${width - padding} ${padding + m.cornerArcR}`}
            />
            <path
              d={`M ${padding + m.cornerArcR} ${height - padding} Q ${padding} ${height - padding} ${padding} ${height - padding - m.cornerArcR}`}
            />
            <path
              d={`M ${width - padding - m.cornerArcR} ${height - padding} Q ${width - padding} ${height - padding} ${width - padding} ${height - padding - m.cornerArcR}`}
            />
          </g>

          <Goals2D padding={padding} width={width} height={height} cy={cy} m={m} />

          <g stroke="#f8fafc" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Corner flags */}
            {[
              [padding, padding],
              [padding, height - padding],
              [width - padding, padding],
              [width - padding, height - padding],
            ].map(([fx, fy], i) => (
              <g key={`flag-${i}`}>
                <line x1={fx} y1={fy} x2={fx + (fx < cx ? 14 : -14)} y2={fy + (fy < cy ? 14 : -14)} stroke="#cbd5e1" strokeWidth="1.2" />
                <polygon
                  points={`${fx + (fx < cx ? 14 : -14)},${fy + (fy < cy ? 10 : -10)} ${fx + (fx < cx ? 26 : -26)},${fy + (fy < cy ? 14 : -14)} ${fx + (fx < cx ? 14 : -14)},${fy + (fy < cy ? 18 : -18)}`}
                  fill={i % 2 === 0 ? "#ef4444" : "#3b82f6"}
                  opacity="0.9"
                />
              </g>
            ))}
          </g>

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
              const isFaded =
                selectedEventIds.length > 0 && !selectedEventIds.includes(event.id);
              const finalOpacity = isFaded ? Math.min(opacity, 0.25) : opacity;

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
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredEvent(event)}
                      onMouseLeave={() => setHoveredEvent(null)}
                      onClick={() => onEventClick?.(event)}
                    />
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
                      className="cursor-pointer"
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

              if (isShot) {
                const x1 = scaleX(event.x!);
                const y1 = scaleY(event.y!);
                const size = isActive ? 9.8 : 7.5;
                let shotDirectionLine = null;
                if (event.end_x != null && event.end_y != null) {
                  const x2 = scaleX(event.end_x);
                  const y2 = scaleY(event.end_y);
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                  const shortLength = Math.min(dist, 26);
                  shotDirectionLine = (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x1 + (dx / dist) * shortLength}
                      y2={y1 + (dy / dist) * shortLength}
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
                      filter={isActive ? "url(#eventGlow)" : undefined}
                      className="cursor-pointer"
                      style={{ opacity: finalOpacity }}
                      onMouseEnter={() => setHoveredEvent(event)}
                      onMouseLeave={() => setHoveredEvent(null)}
                      onClick={() => onEventClick?.(event)}
                    />
                  </g>
                );
              }

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
                  filter={isActive ? "url(#eventGlow)" : undefined}
                  className="cursor-pointer"
                  style={{ opacity: finalOpacity }}
                  onMouseEnter={() => setHoveredEvent(event)}
                  onMouseLeave={() => setHoveredEvent(null)}
                  onClick={() => onEventClick?.(event)}
                />
              );
            })}

          <rect
            x={padding - 30}
            y={padding - 30}
            width={innerW + 60}
            height={innerH + 60}
            fill="url(#vignette)"
            pointerEvents="none"
          />
        </svg>

        {hoveredEvent && tooltipPos && (
          <div
            className="absolute z-50 pointer-events-none rounded-lg border border-slate-700/80 bg-slate-900/95 px-3.5 py-2 text-sm shadow-xl backdrop-blur-sm"
            style={{
              left: `${(tooltipPos.x / width) * 100 + 2}%`,
              top: `${(tooltipPos.y / height) * 100 - 6}%`,
              transform: "translate(0, -100%)",
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getEventColor(hoveredEvent.event_type) }}
              />
              <span className="font-semibold text-white">{hoveredEvent.event_type}</span>
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-slate-400 tabular-nums">
              {hoveredEvent.minute}:
              {hoveredEvent.second !== null
                ? hoveredEvent.second.toString().padStart(2, "0")
                : "00"}
            </div>
          </div>
        )}

        <p className="pointer-events-none mt-2 text-center text-[9px] text-slate-500/80">
          Drag to explore • Click events • Shift+drag to select (3D)
        </p>
      </div>
    </PitchFrame>
  );
}