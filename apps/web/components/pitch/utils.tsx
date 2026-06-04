import { Target, ArrowRight, Zap, Move, Swords } from "lucide-react";
import type { ReactNode } from "react";
import { getEventTypeColor } from "@/lib/design-tokens";

export { EVENT_TYPES, type EventType } from "@/lib/design-tokens";

/** @deprecated import EVENT_TYPES from design-tokens — re-exported for compatibility */
export const getEventColor = getEventTypeColor;

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