"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bookmark,
  FileText,
  GitCompare,
  LogIn,
  Target,
  Users,
} from "lucide-react";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { useWorkspaceCatalog } from "@/lib/use-workspace-catalog";
import {
  countLinkedSeasons,
  flattenCatalogDatasets,
  formatCatalogSummary,
} from "@/lib/competition-filter";
import { DashboardHero } from "@/components/brand/DashboardHero";
import { WorkspaceDatasetsEmpty } from "@/components/workspace/WorkspaceDatasetsEmpty";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { StatCard } from "@/components/ui/stat-card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryData {
  total_matches: number;
  total_events: number;
  total_players: number;
  status: string;
}

const EXPLORE_LINKS = [
  {
    href: "/matches",
    title: "Matches",
    description: "Fixtures, timelines, and pitch-level event maps.",
    icon: Target,
  },
  {
    href: "/players",
    title: "Players",
    description: "Profiles, season stats, and side-by-side comparison.",
    icon: Users,
  },
  {
    href: "/analytics",
    title: "Analytics",
    description: "Season KPIs, xG trends, zones, and team heatmaps.",
    icon: BarChart3,
  },
] as const;

const GUEST_LINKS = [
  {
    href: "/analytics/compare",
    title: "Compare",
    description: "Side-by-side player and team season stats.",
    icon: GitCompare,
  },
  {
    href: "/login",
    title: "Sign in",
    description: "Save reports, match views, and collaborate in workspaces.",
    icon: LogIn,
  },
] as const;

const SIGNED_IN_LINKS = [
  {
    href: "/reports",
    title: "Reports",
    description: "Saved dashboard snapshots with CSV export.",
    icon: FileText,
  },
  {
    href: "/analyses",
    title: "Match views",
    description: "Stored filter and pitch setups from match pages.",
    icon: Bookmark,
  },
] as const;

export default function Dashboard() {
  const workspaceId = useActiveWorkspaceId();
  const { session } = useAuthSession();
  const isGuest = AUTH_ENABLED && !session;
  const { catalogReady, hasLinkedData, catalog } = useWorkspaceCatalog();
  const { data, isLoading, error, refetch, isFetching } = useQuery<SummaryData>({
    queryKey: ["summary", workspaceId],
    queryFn: () => apiFetchJson<SummaryData>("/summary/"),
  });

  const linkedDatasets = useMemo(
    () => (catalogReady ? flattenCatalogDatasets(catalog) : []),
    [catalogReady, catalog],
  );

  const derivedMetrics = useMemo(() => {
    const matches = data?.total_matches ?? 0;
    const events = data?.total_events ?? 0;

    return {
      eventsPerMatch:
        matches > 0 ? Math.round(events / matches).toLocaleString() : "—",
      seasonCount: catalogReady ? countLinkedSeasons(catalog) : null,
      competitionCount: catalogReady ? (catalog?.length ?? 0) : null,
      catalogSummary: catalogReady ? formatCatalogSummary(catalog) : "",
    };
  }, [data, catalogReady, catalog]);

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Dashboard" />
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load dashboard summary. Is the API running?"
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  const showNoData =
    !isGuest && !isLoading && !isFetching && data && data.total_matches === 0;

  const exploreLinks = isGuest
    ? [...EXPLORE_LINKS, ...GUEST_LINKS]
    : [...EXPLORE_LINKS, ...SIGNED_IN_LINKS];

  return (
    <PageShell>
      <DashboardHero
        isGuest={isGuest}
        totalMatches={data?.total_matches ?? 0}
        totalEvents={data?.total_events ?? 0}
        linkedDatasets={linkedDatasets}
        catalogSummary={derivedMetrics.catalogSummary}
      />

      <PageHeader
        title="Overview"
        description={
          isGuest
            ? "Player coverage and entry points — match and event totals are shown in the banner above."
            : showNoData
              ? "Link competition seasons to unlock workflows below."
              : "Derived coverage metrics and shortcuts — headline totals live in the banner above."
        }
      />

      {showNoData ? (
        <WorkspaceDatasetsEmpty workspaceId={workspaceId} className="mb-8" />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
        <StatCard
          label="Players tracked"
          value={data?.total_players ?? 0}
          hint="Profiles available across loaded competitions"
          icon={Users}
          loading={isLoading || isFetching}
        />
        <StatCard
          label="Events per match"
          value={derivedMetrics.eventsPerMatch}
          hint="Average event volume per fixture"
          icon={Activity}
          loading={isLoading || isFetching}
        />
        <StatCard
          label={isGuest ? "Seasons available" : "Linked seasons"}
          value={derivedMetrics.seasonCount ?? "—"}
          hint={
            isGuest
              ? "Competition seasons in the public demo catalog"
              : catalogReady && !hasLinkedData
                ? "No competition seasons linked yet"
                : derivedMetrics.competitionCount && derivedMetrics.competitionCount > 1
                  ? `${derivedMetrics.competitionCount} competitions · ${derivedMetrics.catalogSummary}`
                  : derivedMetrics.catalogSummary || "Competition seasons in your workspace"
          }
          icon={BarChart3}
          loading={!catalogReady}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-section-title mb-1">Explore</h2>
        <p className="text-caption mb-4 text-muted-foreground">
          {isGuest
            ? "Browse the demo dataset — sign in to unlock saved reports and workspaces."
            : "Jump into matches, players, analytics, and your saved work."}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {exploreLinks.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="group block h-full">
              <Card
                className={cn(
                  "surface-card card-interactive h-full border transition-colors",
                  "group-hover:border-primary/30",
                )}
              >
                <CardContent className="flex h-full flex-col gap-2 pt-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <p className="font-medium text-foreground">{title}</p>
                  </div>
                  <p className="text-caption text-muted-foreground">
                    {description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </PageShell>
  );
}