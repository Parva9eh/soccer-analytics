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
  const {
    data: matches,
    isLoading,
    error,
  } = useQuery<Match[]>({
    queryKey: ["matches"],
    queryFn: async () => {
      const res = await fetch("http://localhost:8000/matches/?limit=100");
      if (!res.ok) throw new Error("Failed to fetch matches");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Matches
          </h1>
          <p className="text-slate-400 mt-1">Loading matches...</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[220px] rounded-xl border border-slate-700 bg-slate-800 p-6 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-24 bg-slate-700 rounded" />
                <div className="h-5 w-16 bg-slate-700 rounded-full" />
              </div>

              <div className="flex justify-between items-center gap-4 mb-4">
                <div className="h-5 w-28 bg-slate-700 rounded" />
                <div className="h-4 w-6 bg-slate-700 rounded" />
                <div className="h-5 w-28 bg-slate-700 rounded" />
              </div>

              <div className="flex items-center justify-center gap-6 py-4 border-y border-slate-700 mb-4">
                <div className="h-9 w-12 bg-slate-700 rounded" />
                <div className="h-4 w-4 bg-slate-700 rounded" />
                <div className="h-9 w-12 bg-slate-700 rounded" />
              </div>

              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-slate-700 rounded" />
                <div className="h-4 w-20 bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-400">
        Failed to load matches. Please check the backend.
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Matches
        </h1>
        <p className="text-slate-400 mt-1">
          La Liga 2020/2021 • {matches?.length ?? 0} matches
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches?.map((match) => (
          <MatchCard key={match.id} match={match} hasEvents={false} />
        ))}
      </div>
    </div>
  );
}
