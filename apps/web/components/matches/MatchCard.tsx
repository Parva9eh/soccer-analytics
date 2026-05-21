"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar, Trophy, ArrowRight } from "lucide-react";

interface MatchCardProps {
  match: {
    id: number;
    match_date: string;
    home_team: string | null;
    away_team: string | null;
    home_score: number | null;
    away_score: number | null;
    match_week: number | null;
  };
  hasEvents?: boolean;
}

export function MatchCard({ match, hasEvents = false }: MatchCardProps) {
  const formattedDate = new Date(match.match_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link href={`/matches/${match.id}`}>
      <Card className="group h-full border-slate-700 bg-slate-800 transition-all duration-200 hover:border-slate-600 hover:bg-slate-700 hover:shadow-xl hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between text-sm">
            {/* Date */}
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </div>

            {/* Match Week */}
            {match.match_week && (
              <div className="flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-300">
                <Trophy className="h-3 w-3" />
                Week {match.match_week}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Teams */}
            <div className="flex justify-between items-center gap-4">
              <div className="font-semibold text-lg text-white truncate pr-2">
                {match.home_team || "Home Team"}
              </div>
              <div className="text-xs text-slate-500 shrink-0">vs</div>
              <div className="font-semibold text-lg text-white text-right truncate pl-2">
                {match.away_team || "Away Team"}
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center justify-center gap-6 py-3 border-y border-slate-700">
              <div className="text-4xl font-bold tabular-nums tracking-tighter text-white">
                {match.home_score ?? "-"}
              </div>
              <div className="text-slate-500 text-sm font-medium">—</div>
              <div className="text-4xl font-bold tabular-nums tracking-tighter text-white">
                {match.away_score ?? "-"}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-sm">
              <div>
                {hasEvents ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    Events Available
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    No events loaded
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-slate-400 group-hover:text-teal-400 transition-colors">
                View details
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
