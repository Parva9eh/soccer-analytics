import { apiFetchJson } from "@/lib/api";

/** Shared event shape for match pitch, table, and 3D views. */
export interface PitchEvent {
  id: number;
  minute: number | null;
  second: number | null;
  event_type: string | null;
  x: number | null;
  y: number | null;
  end_x: number | null;
  end_y: number | null;
  details?: unknown;
}

export interface EventsPageResponse {
  total: number;
  page: number;
  page_size: number;
  events: PitchEvent[];
}

/** Load all match events for pitch views (paginated until complete). */
export async function fetchAllMatchEvents(
  matchId: number,
  pageSize = 500,
): Promise<EventsPageResponse> {
  const first = await apiFetchJson<EventsPageResponse>(
    `/events/?match_id=${matchId}&page=1&page_size=${pageSize}`,
  );
  const events = [...first.events];
  const total = first.total ?? events.length;
  let page = 1;
  while (events.length < total) {
    page += 1;
    const next = await apiFetchJson<EventsPageResponse>(
      `/events/?match_id=${matchId}&page=${page}&page_size=${pageSize}`,
    );
    if (!next.events.length) {
      break;
    }
    events.push(...next.events);
    if (next.events.length < pageSize) {
      break;
    }
  }
  return {
    total: events.length,
    page: 1,
    page_size: events.length,
    events,
  };
}
