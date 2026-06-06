export interface MatchAnalysisConfig {
  version: number;
  selected_event_type: string;
  visible_event_types: string[];
  use_3d_view: boolean;
  current_3d_view: "top" | "side" | "goal" | "iso";
}

export function buildMatchAnalysisConfig(input: {
  selectedEventType: string;
  visibleEventTypes: string[];
  use3DView: boolean;
  current3DView: "top" | "side" | "goal" | "iso";
}): MatchAnalysisConfig {
  return {
    version: 1,
    selected_event_type: input.selectedEventType,
    visible_event_types: input.visibleEventTypes,
    use_3d_view: input.use3DView,
    current_3d_view: input.current3DView,
  };
}

export function parseMatchAnalysisConfig(
  raw: Record<string, unknown> | null | undefined,
): MatchAnalysisConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const view = raw.current_3d_view;
  const validViews = ["top", "side", "goal", "iso"] as const;
  const current3DView = validViews.includes(view as (typeof validViews)[number])
    ? (view as MatchAnalysisConfig["current_3d_view"])
    : "iso";

  return {
    version: typeof raw.version === "number" ? raw.version : 1,
    selected_event_type:
      typeof raw.selected_event_type === "string"
        ? raw.selected_event_type
        : "all",
    visible_event_types: Array.isArray(raw.visible_event_types)
      ? raw.visible_event_types.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    use_3d_view: Boolean(raw.use_3d_view),
    current_3d_view: current3DView,
  };
}