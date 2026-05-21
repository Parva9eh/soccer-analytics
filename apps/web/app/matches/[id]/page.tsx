"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [selectedEventType, setSelectedEventType] = useState<string>("all");

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

  // Fetch events
  const { data: eventsData, isLoading: eventsLoading } =
    useQuery<EventsResponse>({
      queryKey: ["events", matchId],
      queryFn: async () => {
        const res = await fetch(
          `http://localhost:8000/events/?match_id=${matchId}&page=1&page_size=200`,
        );
        if (!res.ok) throw new Error("Failed to fetch events");
        return res.json();
      },
      enabled: !!matchId,
    });

  // Get unique event types for the filter
  const eventTypes = eventsData?.events
    ? (Array.from(
        new Set(eventsData.events.map((e) => e.event_type).filter(Boolean)),
      ) as string[])
    : [];

  // Filter events based on selected type
  const filteredEvents = eventsData?.events
    ? selectedEventType === "all"
      ? eventsData.events
      : eventsData.events.filter(
          (event) => event.event_type === selectedEventType,
        )
    : [];

  if (matchLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
        <div className="h-[200px] bg-slate-100 rounded-xl animate-pulse mb-8" />
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
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
            {eventsData && (
              <div className="text-sm text-muted-foreground">
                {filteredEvents.length} of {eventsData.total} events
              </div>
            )}

            {/* Event Type Filter */}
            {eventTypes.length > 0 && (
              <div className="w-52">
                <Select
                  value={selectedEventType}
                  onValueChange={setSelectedEventType}
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
          </div>
        </div>

        {eventsLoading ? (
          <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
        ) : filteredEvents.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Minute</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Location (x, y)</TableHead>
                  <TableHead>End Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
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
                      {event.x?.toFixed(1) ?? "-"}, {event.y?.toFixed(1) ?? "-"}
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
