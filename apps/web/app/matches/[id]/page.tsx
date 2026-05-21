"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Trophy, X, ChevronDown } from "lucide-react";

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

  // Pitch visibility controls
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
      const res = await fetch(`http://localhost:8000/matches/${matchId}`);
      if (!res.ok) throw new Error("Match not found");
      return res.json();
    },
    enabled: !!matchId,
  });

  // Fetch events for the table (paginated + filtered)
  const { data: eventsData, isLoading: eventsLoading } =
    useQuery<EventsResponse>({
      queryKey: ["events", matchId, currentPage, selectedEventType],
      queryFn: async () => {
        const eventTypeParam =
          selectedEventType === "all" ? "" : `&event_type=${selectedEventType}`;
        const res = await fetch(
          `http://localhost:8000/events/?match_id=${matchId}&page=${currentPage}&page_size=${pageSize}${eventTypeParam}`,
        );
        if (!res.ok) throw new Error("Failed to fetch events");
        return res.json();
      },
      enabled: !!matchId,
    });

  // Fetch events for Pitch visualization
  const { data: pitchEventsData } = useQuery<EventsResponse>({
    queryKey: ["pitch-events", matchId],
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:8000/events/?match_id=${matchId}&page=1&page_size=500`,
      );
      if (!res.ok) return { events: [] };
      return res.json();
    },
    enabled: !!matchId,
  });

  // Filter events shown on the pitch
  const filteredPitchEvents =
    pitchEventsData?.events?.filter((event) => {
      if (!event.event_type) return false;
      return visibleEventTypes.some((type) =>
        event.event_type!.toLowerCase().includes(type.toLowerCase()),
      );
    }) || [];

  // Get unique event types for the filter dropdown
  const { data: allEventsForFilter } = useQuery<EventsResponse>({
    queryKey: ["all-events-filter", matchId],
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:8000/events/?match_id=${matchId}&page=1&page_size=500`,
      );
      if (!res.ok) return { events: [] };
      return res.json();
    },
    enabled: !!matchId,
  });

  const eventTypes = allEventsForFilter?.events
    ? (Array.from(
        new Set(
          allEventsForFilter.events.map((e) => e.event_type).filter(Boolean),
        ),
      ) as string[])
    : [];

  const totalPages = eventsData ? Math.ceil(eventsData.total / pageSize) : 1;

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setHighlightedEventId(null);
    }
  };

  // Handle event type filter change
  const handleFilterChange = (value: string) => {
    setSelectedEventType(value);
    setCurrentPage(1);
    setHighlightedEventId(null);
  };

  // Toggle event type visibility on pitch
  const toggleEventType = (type: string) => {
    setVisibleEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  // Handle click on a dot from the pitch
  const handlePitchEventClick = (event: any) => {
    setHighlightedEventId(event.id);

    // Find which page this event belongs to and switch to it
    if (pitchEventsData?.events) {
      const index = pitchEventsData.events.findIndex((e) => e.id === event.id);
      if (index !== -1) {
        const targetPage = Math.floor(index / pageSize) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }
    }

    // Scroll to the events table
    setTimeout(() => {
      document.getElementById("events-table")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const clearSelection = () => {
    setHighlightedEventId(null);
  };

  if (matchLoading) {
    return <div className="p-8">Loading match details...</div>;
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
    <div className="p-8 max-w-7xl mx-auto">
      {/* Back Button */}
      <Link
        href="/matches"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Matches
      </Link>

      {/* Match Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-semibold tracking-tight">
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
              <div className="text-sm text-muted-foreground mb-1">
                {match.home_team}
              </div>
              <div className="text-6xl font-bold tabular-nums">
                {match.home_score ?? "-"}
              </div>
            </div>
            <div className="text-2xl text-muted-foreground font-light">vs</div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Match Visualization</h2>

          {/* Pitch Controls Dropdown */}
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

      {/* Selected Event from Pitch */}
      {highlightedEventId && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="flex items-center justify-between py-3">
            <div className="text-sm">
              <span className="font-medium text-blue-900">
                Selected from Pitch:{" "}
              </span>
              {
                pitchEventsData?.events?.find(
                  (e) => e.id === highlightedEventId,
                )?.event_type
              }{" "}
              • Minute{" "}
              {
                pitchEventsData?.events?.find(
                  (e) => e.id === highlightedEventId,
                )?.minute
              }
            </div>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Events Table */}
      <div id="events-table">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Events</h2>

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
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                Page {currentPage} of {totalPages}
              </div>
            )}
          </div>
        </div>

        {eventsLoading ? (
          <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
        ) : eventsData && eventsData.events.length > 0 ? (
          <>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Minute</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Location (x, y)</TableHead>
                    <TableHead>End Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsData.events.map((event) => (
                    <TableRow
                      key={event.id}
                      className={
                        highlightedEventId === event.id
                          ? "bg-blue-100 border-l-4 border-blue-500"
                          : ""
                      }
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
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {event.x?.toFixed(1) ?? "-"},{" "}
                        {event.y?.toFixed(1) ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
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
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No events found for this match.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
