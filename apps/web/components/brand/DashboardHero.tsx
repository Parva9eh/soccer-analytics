"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/LogoMark";
import { LinkedDatasetChips } from "@/components/workspace/LinkedDatasetChips";
import type { LinkedDataset } from "@/lib/competition-filter";

interface DashboardHeroProps {
  isGuest: boolean;
  totalMatches?: number;
  totalEvents?: number;
  linkedDatasets?: LinkedDataset[];
  catalogSummary?: string;
  loading?: boolean;
}

function formatMetric(value: number | undefined, loading: boolean): string {
  if (loading || value === undefined) {
    return "—";
  }
  return value.toLocaleString();
}

export function DashboardHero({
  isGuest,
  totalMatches,
  totalEvents,
  linkedDatasets = [],
  catalogSummary = "",
  loading = false,
}: DashboardHeroProps) {
  const workspaceCopy =
    linkedDatasets.length > 1
      ? `Workspace totals across ${catalogSummary}. Use the dataset chips below or filters on Matches and Analytics to drill into one season.`
      : linkedDatasets.length === 1
        ? `Workspace scoped to ${catalogSummary}. Jump into matches, analytics, or saved reports.`
        : "Track matches, events, and players scoped to your linked datasets. Jump into analytics or save snapshots for your team.";
  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
      >
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <svg
          className="absolute inset-0 h-full w-full text-primary/10"
          viewBox="0 0 800 240"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="800" height="240" fill="url(#hero-grid)" />
          <ellipse cx="400" cy="300" rx="280" ry="120" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="120" y1="240" x2="680" y2="240" stroke="currentColor" strokeWidth="1" />
          <circle cx="400" cy="240" r="48" fill="none" stroke="currentColor" strokeWidth="1" />
          <path
            d="M 140 200 Q 280 120 400 160 T 660 100"
            fill="none"
            stroke="hsl(166 72% 48%)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      </div>

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl space-y-4">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <p className="text-eyebrow">Soccer Analytics</p>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {isGuest
                ? "Explore event-level soccer intelligence"
                : "Soccer analytics for your workspace"}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isGuest
                ? "Browse La Liga 2020/21 demo data — matches, xG, pass networks, and player profiles. Sign in to save reports and collaborate in workspaces."
                : workspaceCopy}
            </p>
            {!isGuest && linkedDatasets.length > 0 ? (
              <LinkedDatasetChips datasets={linkedDatasets} />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/matches">
                Browse matches
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/analytics">
                <BarChart3 className="mr-2 h-3.5 w-3.5" />
                Analytics
              </Link>
            </Button>
            {isGuest ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in for workspaces</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid min-w-[12rem] grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Matches
            </p>
            <p
              className={`metric-value mt-1 text-2xl text-foreground${loading ? " animate-pulse" : ""}`}
            >
              {formatMetric(totalMatches, loading)}
            </p>
          </div>
          <div className="rounded-xl border border-border/80 bg-background/60 px-4 py-3 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Events
            </p>
            <p
              className={`metric-value mt-1 text-2xl text-foreground${loading ? " animate-pulse" : ""}`}
            >
              {formatMetric(totalEvents, loading)}
            </p>
          </div>
          <div className="col-span-2 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-xs text-primary">
            <Radar className="h-3.5 w-3.5 shrink-0" />
            <span>Event-level data · Season dashboards · Tactical visualization</span>
          </div>
        </div>
      </div>
    </section>
  );
}