"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trophy } from "lucide-react";
import Link from "next/link";

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
        <h1 className="text-3xl font-semibold mb-2">Matches</h1>
        <p className="text-muted-foreground mb-8">La Liga 2020/2021 season</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-slate-200 rounded w-20" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-3/4" />
                  <div className="h-5 bg-slate-200 rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-500">
              Failed to load matches. Please check if the backend is running.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Matches</h1>
        <p className="text-muted-foreground mt-1">
          La Liga 2020/2021 season • {matches?.length ?? 0} matches
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches?.map((match) => (
          <Link href={`/matches/${match.id}`} key={match.id}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(match.match_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  {match.match_week && (
                    <div className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-0.5 rounded">
                      <Trophy className="h-3 w-3" />
                      Week {match.match_week}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {/* Teams */}
                  <div className="flex justify-between items-center">
                    <div className="font-medium text-lg">
                      {match.home_team || "Home Team"}
                    </div>
                    <div className="text-sm text-muted-foreground">vs</div>
                    <div className="font-medium text-lg text-right">
                      {match.away_team || "Away Team"}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex justify-center items-center gap-4 pt-2 border-t">
                    <div className="text-3xl font-bold tabular-nums">
                      {match.home_score ?? "-"}
                    </div>
                    <div className="text-muted-foreground text-sm">—</div>
                    <div className="text-3xl font-bold tabular-nums">
                      {match.away_score ?? "-"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {matches && matches.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No matches found.
        </div>
      )}
    </div>
  );
}
