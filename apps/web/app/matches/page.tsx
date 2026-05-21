"use client";

import { useQuery } from "@tanstack/react-query";
import { MatchCard } from "@/components/matches/MatchCard";

interface Match {
  id: number;
  match_date: string;
  home_team: string | null;
  away_team: string | null;
  home_score: number | null;
  away_score: number | null;
  match_week: number | null;
}

export default function MatchesPage() {
  // Fetch all matches
  const {
    data: matches,
    isLoading: matchesLoading,
    error: matchesError,
  } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/matches/?limit=100");
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
  });

  // Fetch events to determine which matches have events
  const { data: eventsData } = useQuery({
    queryKey: ["events-for-matches"],
    queryFn: async () => {
      const res = await fetch(
        "http://localhost:8000/events/?match_id=1&page_size=5000",
      );
      // We only need to know which match_ids exist, so we fetch a large page
      // A better long-term solution is a dedicated backend endpoint
      if (!res.ok) return { events: [] };
      return res.json();
    },
    enabled: !!matches, // Only run after matches are loaded
  });

  // Create a Set of match IDs that have events
  const matchesWithEvents = new Set<number>();

  if (eventsData?.events) {
    eventsData.events.forEach((event: any) => {
      if (event.match_id) {
        matchesWithEvents.add(event.match_id);
      }
    });
  }

  if (matchesLoading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-semibold mb-2">Matches</h1>
        <p className="text-muted-foreground mb-8">Loading matches...</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[220px] rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (matchesError) {
    return (
      <div className="p-8 text-red-500">
        Failed to load matches. Please check if the backend is running.
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Matches</h1>
        <p className="text-muted-foreground mt-1">
          La Liga 2020/2021 • {matches?.length ?? 0} matches
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches?.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            hasEvents={matchesWithEvents.has(match.id)}
          />
        ))}
      </div>
    </div>
  );
}
