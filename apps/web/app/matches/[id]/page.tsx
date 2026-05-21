"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const matchId = Number(params.id);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
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

  // Fetch events with pagination
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

  // Get unique event types (for filter dropdown)
  const { data: allEventsForTypes } = useQuery<EventsResponse>({
    queryKey: ["all-events-for-filter", matchId],
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:8000/events/?match_id=${matchId}&page=1&page_size=500`,
      );
      if (!res.ok) return { events: [] };
      return res.json();
    },
    enabled: !!matchId,
  });

  const eventTypes = allEventsForTypes?.events
    ? (Array.from(
        new Set(
          allEventsForTypes.events.map((e) => e.event_type).filter(Boolean),
        ),
      ) as string[])
    : [];

  const totalPages = eventsData ? Math.ceil(eventsData.total / pageSize) : 1;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Reset to page 1 when filter changes
  const handleFilterChange = (value: string) => {
    setSelectedEventType(value);
    setCurrentPage(1);
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
    <div className="p-8 max-w-6xl mx-auto">
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

      {/* Events Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Events</h2>

          <div className="flex items-center gap-4">
            {/* Event Type Filter */}
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

            {/* Pagination Info */}
            {eventsData && (
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                Page {currentPage} of {totalPages} • {eventsData.total} total
              </div>
            )}
          </div>
        </div>

        {/* Events Table */}
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
                    <TableRow key={event.id}>
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

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
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
                <ChevronRight className="h-4 w-4 ml-2" />
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
