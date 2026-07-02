"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar, Trophy, ArrowRight } from "lucide-react";
import { buildMatchDetailPath } from "@/lib/competition-filter";

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
  competition?: string;
  season?: string;
}

export function MatchCard({
  match,
  hasEvents = false,
  competition,
  season,
}: MatchCardProps) {
  const formattedDate = new Date(match.match_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={buildMatchDetailPath(match.id, competition, season)}
      className="group block h-full"
    >
      <Card className="card-interactive surface-card h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              {formattedDate}
            </div>

            {match.match_week != null && (
              <div className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                <Trophy className="h-3 w-3" />
                Week {match.match_week}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="truncate pr-2 text-lg font-semibold text-foreground">
                {match.home_team || "Home"}
              </div>
              <span className="shrink-0 text-caption">vs</span>
              <div className="truncate pl-2 text-right text-lg font-semibold text-foreground">
                {match.away_team || "Away"}
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 border-y border-border py-3">
              <div className="metric-value text-4xl text-foreground">
                {match.home_score ?? "–"}
              </div>
              <span className="text-caption font-medium">—</span>
              <div className="metric-value text-4xl text-foreground">
                {match.away_score ?? "–"}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              {hasEvents ? (
                <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Events available
                </span>
              ) : (
                <span className="text-caption">Explore match detail</span>
              )}

              <span className="flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-primary">
                View
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}