"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Trophy, X, ChevronDown } from "lucide-react";
import { apiFetch } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pitch } from "@/components/pitch/Pitch";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const [visibleEventTypes, setVisibleEventTypes] = useState<string[]>([
    "Shot",
    "Pass",
    "Pressure",
    "Carry",
    "Duel",
  ]);

  const pageSize = 50;

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
        className="inline-flex items-center gap-2 text-body-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Matches
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

      {/* Score Card */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center gap-12">
            <div className="text-center">
              <div className="text-label mb-1">
                {match.home_team}
              </div>
              <div className="text-6xl font-bold tabular-nums">
                {match.home_score ?? "-"}
              </div>
            </div>
            <div className="text-2xl text-muted-foreground font-light">vs</div>
            <div className="text-center">
              <div className="text-label mb-1">
                {match.away_team}
              </div>
              <div className="text-6xl font-bold tabular-nums">
                {match.away_score ?? "-"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pitch Visualization */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-xl font-semibold tracking-tight">Match Visualization</h2>

          <div className="relative">
            <Collapsible open={isControlsOpen} onOpenChange={setIsControlsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Pitch Controls
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${isControlsOpen ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="absolute right-0 top-11 z-50">
                <Card className="w-64 border-slate-700 bg-slate-800 shadow-xl">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {["Shot", "Pass", "Pressure", "Carry", "Duel"].map(
                        (type) => (
                          <label
                            key={type}
                            className="flex items-center gap-3 text-sm text-slate-200 cursor-pointer hover:bg-slate-700 p-1.5 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={visibleEventTypes.includes(type)}
                              onChange={() => toggleEventType(type)}
                              className="h-4 w-4 accent-teal-500"
                            />
                            <span>Show {type}s</span>
                          </label>
                        ),
                      )}
                      <div className="pt-3 border-t border-slate-700">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setVisibleEventTypes([
                              "Shot",
                              "Pass",
                              "Pressure",
                              "Carry",
                              "Duel",
                            ])
                          }
                          className="w-full justify-start text-xs text-slate-300 hover:text-white"
                        >
                          Reset All Filters
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <Pitch
          events={filteredPitchEvents}
          onEventClick={handlePitchEventClick}
          highlightedEventId={highlightedEventId}
        />
      </div>

      {/* Events Table */}
      <div id="events-table">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">Events</h2>

          <div className="flex items-center gap-4">
            {eventTypes.length > 0 && (
              <div className="w-56">
                <Select
                  value={selectedEventType}
                  onValueChange={handleFilterChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Event Types</SelectItem>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {eventsData && (
              <div className="text-body-sm text-muted-foreground whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </div>
            )}
          </div>
        </div>

        {eventsLoading ? (
          <div className="h-96 bg-slate-800 border border-slate-700 rounded-xl animate-pulse" />
        ) : eventsData && eventsData.events.length > 0 ? (
          <>
            <Card className="border-slate-700 bg-slate-800">
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
                      className={highlightedEventId === event.id ? "selected min-h-[52px]" : "min-h-[52px]"}
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
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, eventsData.total)} of{" "}
                {eventsData.total}
              </div>
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <Card className="border-slate-700 bg-slate-800">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No events found for this match.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ==================== PREMIUM SIDE PANEL ==================== */}
      <Sheet
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <SheetContent className="w-full max-w-[420px] sm:w-[420px] bg-slate-900 border-l border-slate-700 p-0 flex flex-col">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-xl text-white">
                  Event Details
                </SheetTitle>
                <SheetDescription className="text-slate-400 mt-1">
                  {selectedEvent?.event_type} • Minute {selectedEvent?.minute}
                  {selectedEvent?.second !== null &&
                    `:${selectedEvent?.second.toString().padStart(2, "0")}`}
                </SheetDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Event Type */}
            <div>
              <div className="text-label mb-1">
                Event Type
              </div>
              <div className="text-lg font-semibold text-white">
                {selectedEvent?.event_type}
              </div>
            </div>

            {/* Time */}
            <div>
              <div className="text-label mb-1">
                Time
              </div>
              <div className="text-white font-mono text-lg">
                {selectedEvent?.minute}:
                {selectedEvent?.second?.toString().padStart(2, "0")}
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-label mb-1">
                  Start Location
                </div>
                <div className="font-mono text-white">
                  ({selectedEvent?.x?.toFixed(1)},{" "}
                  {selectedEvent?.y?.toFixed(1)})
                </div>
              </div>

              {(selectedEvent?.end_x || selectedEvent?.end_y) && (
                <div>
                  <div className="text-label mb-1">
                    End Location
                  </div>
                  <div className="font-mono text-white">
                    ({selectedEvent?.end_x?.toFixed(1)},{" "}
                    {selectedEvent?.end_y?.toFixed(1)})
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => setSelectedEvent(null)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
