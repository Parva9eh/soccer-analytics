"use client";

// IMPORTANT: Patch THREE.Clock BEFORE any import that pulls in @react-three/fiber.
// This must be the first import so that when fiber's internal store does
// `new THREE.Clock()` (in its events bundles), it gets our non-deprecated shim.
import "@/lib/three-patch";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Trophy, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pitch } from "@/components/pitch/Pitch";
import { ThreeDPitch } from "@/components/pitch/ThreeDPitch";
import { getEventColor, getEventIcon, EVENT_TYPES } from "@/components/pitch/utils";
import { PitchLayersPopover } from "@/components/pitch/PitchLayersPopover";
import { TableEventFilterPopover } from "@/components/pitch/TableEventFilterPopover";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

/** Match timeline scale (0'–90'+); inset keeps edge markers visible. */
const MATCH_DURATION_MIN = 95;
const TIMELINE_EDGE_INSET_PCT = 3;

function timelinePercentFromMinute(minute: number): number {
  const clamped = Math.min(Math.max(minute, 0), MATCH_DURATION_MIN);
  const t = clamped / MATCH_DURATION_MIN;
  return TIMELINE_EDGE_INSET_PCT + t * (100 - 2 * TIMELINE_EDGE_INSET_PCT);
}

interface Match {
  id: number;
  match_date: string;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  match_week: number | null;
}

interface Event {
  id: number;
  minute: number | null;
  second: number | null;
  event_type: string | null;
  x: number | null;
  y: number | null;
  end_x: number | null;
  end_y: number | null;
}

interface EventsResponse {
  total: number;
  page: number;
  page_size: number;
  events: Event[];
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id ? Number(params.id) : null;

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [highlightedEventId, setHighlightedEventId] = useState<number | null>(
    null,
  );
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isTableFilterOpen, setIsTableFilterOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [use3DView, setUse3DView] = useState(false);
  const [current3DView, setCurrent3DView] = useState<'top' | 'side' | 'goal' | 'iso'>('iso');
  const [autoOrbit3D, setAutoOrbit3D] = useState(false); // advanced interactivity for 3D stadium tour feel

  const [visibleEventTypes, setVisibleEventTypes] = useState<string[]>([
    "Shot",
    "Pass",
    "Pressure",
    "Carry",
    "Duel",
  ]);

  const pageSize = 50;
  const eventsTableRef = useRef<HTMLDivElement>(null);

  // Scroll to and highlight the selected event in the table when clicked from pitch
  useEffect(() => {
    if (highlightedEventId && eventsTableRef.current) {
      const row = eventsTableRef.current.querySelector(
        `[data-event-id="${highlightedEventId}"]`
      ) as HTMLElement | null;

      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });

        // Add temporary pulse animation
        row.classList.add("!bg-accent/20", "ring-1", "ring-accent/50");
        setTimeout(() => {
          row.classList.remove("!bg-accent/20", "ring-1", "ring-accent/50");
        }, 1400);
      }
    }
  }, [highlightedEventId]);

  // Fetch match details
  const { data: match, isLoading: matchLoading } = useQuery<Match>({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const res = await apiFetch(`/matches/${matchId}`);
      if (!res.ok) throw new Error("Match not found");
      return res.json();
    },
    enabled: !!matchId,
  });

  // Fetch events for table
  const { data: eventsData, isLoading: eventsLoading } =
    useQuery<EventsResponse>({
      queryKey: ["events", matchId, currentPage, selectedEventType],
      queryFn: async () => {
        const eventTypeParam =
          selectedEventType === "all" ? "" : `&event_type=${selectedEventType}`;
        const res = await apiFetch(
          `/events/?match_id=${matchId}&page=${currentPage}&page_size=${pageSize}${eventTypeParam}`,
        );
        if (!res.ok) throw new Error("Failed to fetch events");
        return res.json();
      },
      enabled: !!matchId,
    });

  // Fetch events for Pitch
  const { data: pitchEventsData } = useQuery<EventsResponse>({
    queryKey: ["pitch-events", matchId],
    queryFn: async () => {
      const res = await apiFetch(
        `/events/?match_id=${matchId}&page=1&page_size=500`,
      );
      if (!res.ok) return { events: [] };
      return res.json();
    },
    enabled: !!matchId,
  });

  // Filter events shown on pitch
  const filteredPitchEvents =
    pitchEventsData?.events?.filter((event) => {
      if (!event.event_type) return false;
      return visibleEventTypes.some((type) =>
        event.event_type!.toLowerCase().includes(type.toLowerCase()),
      );
    }) || [];

  const eventTypes = pitchEventsData?.events
    ? (Array.from(
        new Set(
          pitchEventsData.events.map((e) => e.event_type).filter(Boolean),
        ),
      ) as string[])
    : [];

  const totalPages = eventsData ? Math.ceil(eventsData.total / pageSize) : 1;
  const matchEventTotal = pitchEventsData?.total ?? null;
  const tableFilterCount = eventsData?.total ?? null;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setHighlightedEventId(null);
    }
  };

  const handleFilterChange = (value: string) => {
    setSelectedEventType(value);
    setCurrentPage(1);
    setHighlightedEventId(null);
  };

  const toggleEventType = (type: string) => {
    setVisibleEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  // Handle click on pitch (dot or arrow)
  // getEventColor and getEventIcon are now shared in @/components/pitch/utils
  // for consistency between 2D/3D and UI (legend, timeline, sheet, tooltips).

  const handlePitchEventClick = (event: any) => {
    setHighlightedEventId(event.id);
    setSelectedEvent(event);

    // Switch to correct page if needed
    if (pitchEventsData?.events) {
      const index = pitchEventsData.events.findIndex((e) => e.id === event.id);
      if (index !== -1) {
        const targetPage = Math.floor(index / pageSize) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }
    }
  };

  const clearSelection = () => {
    setHighlightedEventId(null);
    setSelectedEvent(null);
  };

  if (matchLoading) {
    return <div className="p-8">Loading match...</div>;
  }

  if (!match) {
    return (
      <div className="p-8">
        <p className="text-red-500">Match not found.</p>
        <Link href="/matches">
          <Button variant="outline" className="mt-4">
            Back to Matches
          </Button>
        </Link>
      </div>
    );
  }

  const formattedDate = new Date(match.match_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="content max-w-7xl mx-auto">
      {/* Back Button */}
      <Link
        href="/matches"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Match Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-page-title">
            {match.home_team} vs {match.away_team}
          </h1>
          {match.match_week && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Week {match.match_week}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {formattedDate}
        </div>
      </div>

      {/* Compact Score Header - Advanced layout */}
      <Card className="mb-8 border-slate-700 bg-slate-900/60">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs uppercase tracking-[0.5px] text-slate-400">{match.home_team}</div>
                <div className="text-5xl font-semibold tabular-nums tracking-tighter text-white">
                  {match.home_score ?? "-"}
                </div>
              </div>

              <div className="flex flex-col items-center text-center px-2">
                <div className="text-[10px] uppercase tracking-[1px] text-slate-500 font-medium">vs</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{match.match_week ? `W${match.match_week}` : ''}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-[0.5px] text-slate-400">{match.away_team}</div>
                <div className="text-5xl font-semibold tabular-nums tracking-tighter text-white">
                  {match.away_score ?? "-"}
                </div>
              </div>
            </div>

            <div className="hidden sm:block text-right text-xs text-slate-400">
              <div className="font-medium text-slate-300">{formattedDate}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pitch Visualization - Elevated as primary view */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Pitch View</h2>
            <p className="text-xs text-slate-400">
              Click events on the pitch to inspect
              {use3DView && <span className="ml-2 text-[10px] text-accent/80">• Shift+drag to box-select</span>}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Broadcast stadium view • FIFA 105×68m • Tiered stands, floodlights, LED boards
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* 2D / 3D View Toggle + Clear selection */}
            <div className="flex rounded-md border border-slate-700 overflow-hidden text-xs">
              <button
                onClick={() => setUse3DView(false)}
                className={`px-3 py-1 transition-colors ${!use3DView ? "bg-slate-700 text-white" : "hover:bg-slate-800 text-slate-300"}`}
              >
                2D
              </button>
              <button
                onClick={() => setUse3DView(true)}
                className={`px-3 py-1 transition-colors ${use3DView ? "bg-slate-700 text-white" : "hover:bg-slate-800 text-slate-300"}`}
              >
                3D
              </button>
            </div>

            {/* Advanced compact legend for event types (shared colors for 2D/3D consistency) */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2 text-[9px] uppercase tracking-[0.5px] text-slate-400 border-l border-slate-700 pl-2">
              {EVENT_TYPES.map((t) => (
                <span key={t} className="inline-flex items-center gap-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getEventColor(t) }} />
                  {t}
                </span>
              ))}
            </div>

            {highlightedEventId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHighlightedEventId(null);
                  setSelectedEvent(null);
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Clear selection
              </Button>
            )}

            {/* 3D Camera Presets - Advanced feature */}
            {use3DView && (
              <div className="flex items-center gap-1 ml-1 text-[10px]">
                <span className="text-slate-400 mr-1">View:</span>
                <div className="flex rounded-md border border-slate-700 overflow-hidden">
                  {(['iso', 'top', 'side', 'goal'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setCurrent3DView(mode)}
                      className={`px-2 py-0.5 transition-colors capitalize ${current3DView === mode ? "bg-slate-700 text-white" : "hover:bg-slate-800 text-slate-300"}`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                {/* Advanced auto-orbit for stadium tour interactivity */}
                <button
                  onClick={() => setAutoOrbit3D(!autoOrbit3D)}
                  className={`ml-1 px-2 py-0.5 rounded border text-[9px] ${autoOrbit3D ? "bg-accent text-black border-accent" : "border-slate-700 hover:bg-slate-800 text-slate-300"}`}
                  title="Toggle auto-rotate for immersive stadium view"
                >
                  {autoOrbit3D ? "Stop Orbit" : "Auto Orbit"}
                </button>
              </div>
            )}

            <PitchLayersPopover
              open={isControlsOpen}
              onOpenChange={setIsControlsOpen}
              visibleTypes={visibleEventTypes}
              onToggleType={toggleEventType}
              onSelectAll={() => setVisibleEventTypes([...EVENT_TYPES])}
              onClearAll={() => setVisibleEventTypes([])}
            />
          </div>
        </div>

        {/* Mini Event Timeline + Density Heatmap (advanced) */}
        <div className="mb-3 mt-1">
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.5px] text-slate-400">
            <span>Event Timeline (click to select)</span>
            <span className="text-slate-500">{filteredPitchEvents.length} events</span>
          </div>
          <div className="relative h-8 w-full rounded-md border border-slate-700/60 bg-slate-950 px-3">
            <div className="relative h-full">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-700/50" />
              {filteredPitchEvents
                .filter((e) => e.minute != null)
                .map((event, index) => {
                  const minute = event.minute ?? 0;
                  const leftPct = timelinePercentFromMinute(minute);
                  const color = getEventColor(event.event_type);
                  const isActive = highlightedEventId === event.id;

                  return (
                    <button
                      key={`${event.id}-${index}`}
                      type="button"
                      onClick={() => handlePitchEventClick(event)}
                      aria-label={`${event.event_type} at ${minute} minutes`}
                      aria-pressed={isActive}
                      className={`absolute top-1/2 z-[1] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-950 transition-all duration-150 hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/80 ${
                        isActive
                          ? "scale-125 ring-2 ring-accent/60"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ left: `${leftPct}%`, backgroundColor: color }}
                      title={`${event.event_type} — ${minute}'`}
                    />
                  );
                })}
            </div>
          </div>
        </div>

        {/* Advanced: Event Density Heatmap */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.5px] text-slate-400">
            <span>Event Density (per minute)</span>
          </div>
          <div className="flex h-3 w-full gap-px overflow-hidden rounded bg-slate-950 border border-slate-700/60">
            {Array.from({ length: 95 }, (_, min) => {
              const count = filteredPitchEvents.filter(e => e.minute === min).length;
              const intensity = Math.min(count / 4, 1);
              const bg = intensity > 0 ? `rgba(163, 163, 172, ${0.2 + intensity * 0.7})` : 'rgba(15, 23, 42, 0.6)';
              return <div key={min} className="flex-1" style={{ backgroundColor: bg }} title={`Minute ${min}: ${count} events`} />;
            })}
          </div>
          <div className="mt-0.5 flex justify-between text-[9px] text-slate-500">
            <span>0'</span><span>45'</span><span>90'+</span>
          </div>
        </div>

        <div
          className={`relative transition-all ${use3DView ? "min-h-[740px] md:min-h-[800px] lg:min-h-[860px]" : "h-auto"}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (!filteredPitchEvents.length) return;
            const currentIndex = filteredPitchEvents.findIndex(e => e.id === highlightedEventId);
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % filteredPitchEvents.length : 0;
              const nextEvent = filteredPitchEvents[nextIndex];
              handlePitchEventClick(nextEvent);
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              const prevIndex = currentIndex >= 0 ? (currentIndex - 1 + filteredPitchEvents.length) % filteredPitchEvents.length : filteredPitchEvents.length - 1;
              const prevEvent = filteredPitchEvents[prevIndex];
              handlePitchEventClick(prevEvent);
            }
            if (e.key === 'Escape') {
              setHighlightedEventId(null);
              setSelectedEvent(null);
            }
          }}
        >
          {use3DView ? (
            <ThreeDPitch
              events={filteredPitchEvents}
              onEventClick={handlePitchEventClick}
              highlightedEventId={highlightedEventId}
              selectedEventIds={highlightedEventId ? [highlightedEventId] : []}
              viewMode={current3DView}
              onViewModeChange={(mode) => setCurrent3DView(mode)}
              autoRotate={autoOrbit3D}
              onSelectionChange={(selectedIds) => {
                if (selectedIds.length > 0) {
                  setHighlightedEventId(selectedIds[0]);
                  const first = filteredPitchEvents.find(e => e.id === selectedIds[0]);
                  if (first) setSelectedEvent(first);
                }
              }}
            />
          ) : (
            <Pitch
              events={filteredPitchEvents}
              onEventClick={handlePitchEventClick}
              highlightedEventId={highlightedEventId}
              selectedEventIds={highlightedEventId ? [highlightedEventId] : []}
              onSelectionChange={(selectedIds) => {
                if (selectedIds.length > 0) {
                  setHighlightedEventId(selectedIds[0]);
                  const first = filteredPitchEvents.find(e => e.id === selectedIds[0]);
                  if (first) setSelectedEvent(first);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Events Table - Tightly integrated with Pitch */}
      <div id="events-table" className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Event Timeline</h2>
            <p className="text-xs text-slate-400">Synced with pitch selection</p>
          </div>



          <div className="flex items-center gap-2">
            {eventTypes.length > 0 && (
              <TableEventFilterPopover
                open={isTableFilterOpen}
                onOpenChange={setIsTableFilterOpen}
                selectedType={selectedEventType}
                eventTypes={eventTypes}
                onSelect={handleFilterChange}
                filteredCount={tableFilterCount}
                totalCount={matchEventTotal}
              />
            )}
          </div>
        </div>

        {eventsLoading ? (
          <div className="h-96 rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 h-5 w-32 animate-pulse rounded bg-slate-700" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mb-3 flex items-center gap-4">
                <div className="h-4 w-12 animate-pulse rounded bg-slate-700" />
                <div className="h-4 flex-1 animate-pulse rounded bg-slate-700" />
                <div className="h-4 w-28 animate-pulse rounded bg-slate-700" />
              </div>
            ))}
          </div>
        ) : eventsData && eventsData.events.length > 0 ? (
          <>
            <Card className="border-slate-700/70 bg-slate-900 elevation-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Minute</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Location (x, y)</TableHead>
                    <TableHead className="hidden sm:table-cell">End Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsData.events.map((event) => (
                    <TableRow
                      key={event.id}
                      data-event-id={event.id}
                      tabIndex={0}
                      role="button"
                      className={highlightedEventId === event.id ? "selected min-h-[52px]" : "min-h-[52px]"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handlePitchEventClick(event);
                        }
                      }}
                    >
                      <TableCell className="font-mono">
                        {event.minute ?? "-"}:
                        {event.second?.toString().padStart(2, "0") ?? "00"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {event.event_type || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-300">
                        {event.x?.toFixed(1) ?? "-"},{" "}
                        {event.y?.toFixed(1) ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-300 hidden sm:table-cell">
                        {event.end_x?.toFixed(1) ?? "-"},{" "}
                        {event.end_y?.toFixed(1) ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-3 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Prev
              </Button>
              <div className="text-xs text-slate-400 tabular-nums">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next →
              </Button>
            </div>
          </>
        ) : (
          <Card className="border-slate-700 bg-slate-800">
            <CardContent className="py-14 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-700/50">
                <span className="text-xl">📍</span>
              </div>
              <p className="text-sm font-medium text-slate-300">
                No events recorded for this match
              </p>
              <p className="mt-1 text-xs text-slate-500">
                This match may not have event data available yet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ==================== PREMIUM SIDE PANEL ==================== */}
      <Sheet
        open={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
            setHighlightedEventId(null);
          }
        }}
      >
        <SheetContent
          showCloseButton={false}
          className="w-full max-w-[420px] sm:w-[420px] bg-slate-900 border-l border-slate-700/70 p-0 flex flex-col elevation-4"
        >
          <SheetHeader className="px-6 pt-5 pb-4 border-b border-slate-700 bg-slate-950/40 text-left">
            <div className="flex items-start justify-between gap-3 pr-1">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <div className="text-accent shrink-0">
                    {getEventIcon(selectedEvent?.event_type)}
                  </div>
                  <SheetTitle className="text-lg font-semibold tracking-tight text-white">
                    {selectedEvent?.event_type || "Event"}
                  </SheetTitle>
                </div>
                <SheetDescription className="text-xs text-slate-400 mt-0.5">
                  Minute {selectedEvent?.minute}:
                  {(selectedEvent?.second ?? 0).toString().padStart(2, "0")}
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-slate-400 hover:text-white"
                  aria-label="Close event details"
                >
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-7">
            {/* Event Type */}
            <div>
              <div className="text-label mb-1">Event Type</div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-white">
                  {selectedEvent?.event_type}
                </span>
                <span className="rounded bg-slate-800 px-2 py-px text-[10px] font-medium tracking-wider text-slate-400">
                  {selectedEvent?.event_type?.slice(0, 4).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Time */}
            <div>
              <div className="text-label mb-1">Time</div>
              <div className="font-mono text-3xl font-semibold text-white tabular-nums">
                {selectedEvent?.minute}:
                {(selectedEvent?.second ?? 0).toString().padStart(2, "0")}
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-label mb-1">Start Location</div>
                <div className="font-mono text-xl text-white flex items-center gap-2">
                  ({selectedEvent?.x?.toFixed(1)}, {selectedEvent?.y?.toFixed(1)})
                  <span className="text-[10px] text-slate-500">(on pitch)</span>
                </div>
              </div>

              {(selectedEvent?.end_x || selectedEvent?.end_y) && (
                <div>
                  <div className="text-label mb-1">End Location</div>
                  <div className="font-mono text-xl text-white">
                    ({selectedEvent?.end_x?.toFixed(1)}, {selectedEvent?.end_y?.toFixed(1)})
                  </div>
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-500">
              Synced with the pitch view and event table. Press Escape to dismiss.
            </div>

            {/* Richer data presentation */}
            {selectedEvent && (
              <div className="pt-2 border-t border-slate-700/50 text-[10px]">
                <div className="flex justify-between text-slate-400">
                  <span>Distance</span>
                  <span className="text-white font-mono">
                    {selectedEvent.end_x && selectedEvent.end_y 
                      ? Math.hypot((selectedEvent.end_x - (selectedEvent.x || 0)), (selectedEvent.end_y - (selectedEvent.y || 0))).toFixed(1) 
                      : '—'} units
                  </span>
                </div>
              </div>
            )}

            {/* Mini pitch visual for context (advanced) */}
            {selectedEvent && (
              <div>
                <div className="text-label mb-1">Location on Pitch</div>
                <div className="relative w-32 h-20 border border-slate-600 bg-slate-950 rounded overflow-hidden">
                  <svg viewBox="0 0 120 80" className="w-full h-full">
                    {/* Very simplified pitch outline */}
                    <rect x="5" y="5" width="110" height="70" fill="none" stroke="#475569" strokeWidth="1"/>
                    <line x1="60" y1="5" x2="60" y2="75" stroke="#475569" strokeWidth="0.8"/>
                    {/* Event dot */}
                    <circle 
                      cx={selectedEvent.x ?? 60} 
                      cy={selectedEvent.y ?? 40} 
                      r="2.5" 
                      fill={getEventColor(selectedEvent.event_type)} 
                    />
                  </svg>
                </div>
              </div>
            )}

            {/* Richer context placeholder */}
            <div className="border-t border-slate-700/60 pt-2 text-[10px] text-slate-400">
              Player context and advanced metrics would appear here with richer event data.
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
