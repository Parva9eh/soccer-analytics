/**
 * Soccer analytics semantic palette — tuned for dark UI, pitch viz, and WCAG contrast.
 * Values mirror CSS variables in globals.css for JS/Three.js use.
 */
export const eventTypeColors = {
  shot: "#f87171", // red-400 — danger / finishing
  pass: "#60a5fa", // blue-400 — distribution
  pressure: "#fbbf24", // amber-400 — intensity
  carry: "#34d399", // emerald-400 — progression
  duel: "#a78bfa", // violet-400 — contests
  default: "#94a3b8", // slate-400
} as const;

export const EVENT_TYPES = ["Shot", "Pass", "Pressure", "Carry", "Duel"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export function getEventTypeColor(eventType: string | null | undefined): string {
  if (!eventType) return eventTypeColors.default;
  const t = eventType.toLowerCase();
  if (t.includes("shot")) return eventTypeColors.shot;
  if (t.includes("pass")) return eventTypeColors.pass;
  if (t.includes("pressure")) return eventTypeColors.pressure;
  if (t.includes("carry")) return eventTypeColors.carry;
  if (t.includes("duel")) return eventTypeColors.duel;
  return eventTypeColors.default;
}