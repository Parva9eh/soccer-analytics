export type TacticalPreset =
  | "all"
  | "final_third"
  | "set_piece"
  | "counter"
  | "shots";

export const TACTICAL_PRESET_OPTIONS: {
  value: TacticalPreset;
  label: string;
  description: string;
}[] = [
  { value: "all", label: "All events", description: "No tactical filter" },
  {
    value: "final_third",
    label: "Final third",
    description: "Events in either attacking third (x ≥ 80 or x ≤ 40)",
  },
  {
    value: "set_piece",
    label: "Set pieces",
    description: "Corners, free kicks, throw-ins, penalties, and restarts",
  },
  {
    value: "counter",
    label: "Counters",
    description: "Events from counter-attacking possessions",
  },
  {
    value: "shots",
    label: "Shots",
    description: "Shot events only",
  },
];

const SET_PIECE_MARKERS = [
  "From Corner",
  "From Free Kick",
  "From Throw In",
  "From Goal Kick",
  "From Penalty",
  "From Kick Off",
];

export function playPatternFromDetails(details: unknown): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const pattern = (details as Record<string, unknown>).play_pattern;
  if (!pattern || typeof pattern !== "object" || Array.isArray(pattern)) {
    return null;
  }
  const name = (pattern as Record<string, unknown>).name;
  return typeof name === "string" ? name : null;
}

export type PlayPhaseTag = "regular" | "set_piece" | "counter" | "other";

export const PLAY_PHASE_LABELS: Record<PlayPhaseTag, string> = {
  regular: "Regular play",
  set_piece: "Set pieces",
  counter: "Counters",
  other: "Other patterns",
};

function isSetPiecePattern(pattern: string | null): boolean {
  if (!pattern) {
    return false;
  }
  return SET_PIECE_MARKERS.some((marker) => pattern.includes(marker));
}

function isCounterPattern(pattern: string | null): boolean {
  return Boolean(pattern && pattern.includes("Counter"));
}

function isFinalThird(x: number | null): boolean {
  if (x == null) {
    return false;
  }
  return x >= 80 || x <= 40;
}

export function classifyPlayPhase(details: unknown): PlayPhaseTag {
  const pattern = playPatternFromDetails(details);
  if (isCounterPattern(pattern)) {
    return "counter";
  }
  if (isSetPiecePattern(pattern)) {
    return "set_piece";
  }
  if (!pattern || pattern === "Regular Play") {
    return "regular";
  }
  return "other";
}

export function matchesTacticalPreset(
  event: {
    event_type: string | null;
    x: number | null;
    details?: unknown;
  },
  preset: TacticalPreset,
): boolean {
  if (preset === "all") {
    return true;
  }
  if (preset === "shots") {
    return Boolean(event.event_type?.toLowerCase().includes("shot"));
  }

  const pattern = playPatternFromDetails(event.details);
  if (preset === "set_piece") {
    return isSetPiecePattern(pattern);
  }
  if (preset === "counter") {
    return isCounterPattern(pattern);
  }
  if (preset === "final_third") {
    return isFinalThird(event.x);
  }
  return true;
}