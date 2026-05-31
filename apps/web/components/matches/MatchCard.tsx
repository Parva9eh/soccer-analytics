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
      <Card
        className="group h-full border-slate-700 bg-slate-800 transition-all duration-300 ease-out 
                   hover:border-slate-600 hover:bg-slate-700 hover:shadow-2xl 
                   hover:-translate-y-1 hover:scale-[1.01] hover:ring-1 hover:ring-accent/30"
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between text-sm">
            {/* Date */}
            <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition-colors">
              <Calendar className="h-4 w-4" />
              {formattedDate}
            </div>

            {/* Match Week */}
            {match.match_week && (
              <div className="flex items-center gap-1.5 rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-300 group-hover:bg-slate-600 transition-colors">
                <Trophy className="h-3 w-3" />
                Week {match.match_week}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {/* Teams */}
            <div className="flex justify-between items-center gap-4">
              <div className="font-semibold text-lg text-white truncate pr-2 group-hover:text-accent transition-colors">
                {match.home_team || "Home Team"}
              </div>
              <div className="text-xs text-slate-400 shrink-0">vs</div>
              <div className="font-semibold text-lg text-white text-right truncate pl-2 group-hover:text-accent transition-colors">
                {match.away_team || "Away Team"}
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center justify-center gap-6 py-3 border-y border-slate-700 group-hover:border-slate-600 transition-colors">
              <div className="text-4xl font-bold tabular-nums tracking-tighter text-white">
                {match.home_score ?? "-"}
              </div>
              <div className="text-slate-400 text-sm font-medium">—</div>
              <div className="text-4xl font-bold tabular-nums tracking-tighter text-white">
                {match.away_score ?? "-"}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-sm">
              <div>
                {hasEvents ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400 group-hover:bg-emerald-900/80 transition-colors">
                    Events Available
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    No events loaded
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-accent transition-all">
                View details
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
