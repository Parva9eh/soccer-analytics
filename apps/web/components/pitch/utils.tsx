import { Target, ArrowRight, Zap, Move, Swords } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Shared event color logic for consistent visualization across 2D/3D pitch and UI.
 * Colors chosen for high contrast on dark pitch + pro analytics feel (FBref/Driblab inspired).
 */
export const getEventColor = (eventType: string | null): string => {
  if (!eventType) return "#64748b";
  const type = eventType.toLowerCase();
  if (type.includes("shot")) return "#ef4444";
  if (type.includes("pass")) return "#3b82f6";
  if (type.includes("pressure")) return "#f59e0b";
  if (type.includes("carry")) return "#10b981";
  if (type.includes("duel")) return "#8b5cf6";
  return "#64748b";
};

/**
 * Shared icon for event types (used in sheets, timelines, legends).
 */
export const getEventIcon = (eventType: string | null | undefined): ReactNode => {
  if (!eventType) return <Target className="h-4 w-4" />;
  const type = eventType.toLowerCase();
  if (type.includes("shot")) return <Target className="h-4 w-4" />;
  if (type.includes("pass")) return <ArrowRight className="h-4 w-4" />;
  if (type.includes("pressure")) return <Zap className="h-4 w-4" />;
  if (type.includes("carry")) return <Move className="h-4 w-4" />;
  if (type.includes("duel")) return <Swords className="h-4 w-4" />;
  return <Target className="h-4 w-4" />;
};

/**
 * Event type labels for legend / accessibility.
 */
export const EVENT_TYPES = ["Shot", "Pass", "Pressure", "Carry", "Duel"] as const;

export type EventType = (typeof EVENT_TYPES)[number];
