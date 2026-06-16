"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Calendar,
  FileText,
  Goal,
  Target,
  GitBranch,
  Users,
  TrendingUp,
} from "lucide-react";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import {
  DEFAULT_COMPETITION,
  DEFAULT_SEASON,
  formatSeasonLabel,
  getFirstCatalogFilters,
  isFilterInCatalog,
  type CompetitionCatalogItem,
} from "@/lib/competition-filter";
import {
  buildDashboardQuery,
  reportScopeLabel,
  type ReportScope,
  type WorkspaceDashboard,
} from "@/lib/report-types";
import { XgLeaderboards } from "@/components/analytics/XgLeaderboards";
import {
  formatXg,
  type PlayerXgLeaderboard,
  type SeasonXg,
  type TeamXgLeaderboard,
} from "@/lib/xg-types";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { CompetitionSeasonFilter } from "@/components/matches/CompetitionSeasonFilter";
import { DashboardPanels } from "@/components/reports/DashboardPanels";
import { SaveReportDialog } from "@/components/reports/SaveReportDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { StatCard } from "@/components/ui/stat-card";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SummaryData {
  total_matches: number;
  total_events: number;
  total_players: number;
  status: string;
}

function readScope(searchParams: URLSearchParams): ReportScope {
  return searchParams.get("scope") === "all" ? "all" : "filtered";
}

function readFilter(
  searchParams: URLSearchParams,
  key: string,
  fallback: string,
): string {
  const value = searchParams.get(key)?.trim();
  return value || fallback;
}

function AnalyticsRoadmap() {
  const roadmap = [
    {
      title: "Expected Goals (xG)",
      icon: Target,
      body: "StatsBomb shot xG on match pages; season totals in the dashboard KPIs.",
      live: true,
    },
    {
      title: "Passing networks",
      icon: GitBranch,
      body: "Interactive passing networks and progressive passes.",
      live: false,
    },
    {
      title: "Possession & build-up",
      icon: BarChart3,
      body: "Possession chains, build-up patterns, and territory.",
      live: false,
    },
    {
      title: "Player insights",
      icon: Users,
      body: "Advanced profiles, radar charts, and comparisons.",
      live: false,
    },
    {
      title: "Trends & form",
      icon: TrendingUp,
      body: "Rolling form, momentum metrics, and trend analysis.",
      live: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roadmap.map(({ title, icon: Icon, body, live }) => (
        <Card key={title} className="surface-card card-compact">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
              <p className="text-body-sm text-muted-foreground">
                {live ? (
                  <span className="text-primary">Live — {body}</span>
                ) : (
                  <>Coming soon — {body}</>
                )}
              </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AuthAnalyticsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = useActiveWorkspaceId();

  const scope = readScope(searchParams);
  const competition = readFilter(searchParams, "competition", DEFAULT_COMPETITION);
  const season = readFilter(searchParams, "season", DEFAULT_SEASON);

  const updateUrl = useCallback(
    (next: { scope?: ReportScope; competition?: string; season?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextScope = next.scope ?? scope;
      params.set("scope", nextScope);
      if (nextScope === "filtered") {
        params.set("competition", next.competition ?? competition);
        params.set("season", next.season ?? season);
      } else {
        params.delete("competition");
        params.delete("season");
      }
      router.replace(`/analytics?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, scope, competition, season],
  );

  const { data: catalog, isLoading: catalogLoading } = useQuery<
    CompetitionCatalogItem[]
  >({
    queryKey: ["competitions-catalog", workspaceId],
    queryFn: () => apiFetchJson<CompetitionCatalogItem[]>("/competitions/"),
    staleTime: 5 * 60 * 1000,
  });

  const catalogReady = !catalogLoading && catalog !== undefined;
  const hasLinkedData = (catalog?.length ?? 0) > 0;
  const firstCatalog = getFirstCatalogFilters(catalog);
  const filterInCatalog =
    scope === "all" || isFilterInCatalog(catalog, competition, season);

  useEffect(() => {
    if (scope !== "filtered" || !catalogReady || !hasLinkedData || !firstCatalog) {
      return;
    }
    if (!filterInCatalog) {
      updateUrl({
        scope: "filtered",
        competition: firstCatalog.competition,
        season: firstCatalog.season,
      });
    }
  }, [
    scope,
    catalogReady,
    hasLinkedData,
    filterInCatalog,
    firstCatalog,
    updateUrl,
  ]);

  const dashboardPath = buildDashboardQuery(
    scope,
    scope === "filtered" ? competition : undefined,
    scope === "filtered" ? season : undefined,
  );

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<WorkspaceDashboard>({
    queryKey: ["reports-dashboard", workspaceId, scope, competition, season],
    queryFn: () => apiFetchJson<WorkspaceDashboard>(dashboardPath),
    enabled: catalogReady && (scope === "all" || filterInCatalog),
  });

  const seasonXgParams = new URLSearchParams({
    competition,
    season,
  });
  const xgScopeEnabled =
    catalogReady && scope === "filtered" && filterInCatalog && hasLinkedData;

  const { data: seasonXg, isLoading: seasonXgLoading } = useQuery<SeasonXg>({
    queryKey: ["season-xg", workspaceId, competition, season],
    queryFn: () =>
      apiFetchJson<SeasonXg>(`/analytics/xg/season?${seasonXgParams}`),
    enabled: xgScopeEnabled,
  });

  const { data: playerXg, isLoading: playerXgLoading } =
    useQuery<PlayerXgLeaderboard>({
      queryKey: ["player-xg", workspaceId, competition, season],
      queryFn: () =>
        apiFetchJson<PlayerXgLeaderboard>(
          `/analytics/xg/players?${seasonXgParams}&limit=8`,
        ),
      enabled: xgScopeEnabled,
    });

  const { data: teamXg, isLoading: teamXgLoading } =
    useQuery<TeamXgLeaderboard>({
      queryKey: ["team-xg", workspaceId, competition, season],
      queryFn: () =>
        apiFetchJson<TeamXgLeaderboard>(
          `/analytics/xg/teams?${seasonXgParams}`,
        ),
      enabled: xgScopeEnabled,
    });

  const scopeLabel = reportScopeLabel(
    scope === "filtered" ? competition : null,
    scope === "filtered" ? season : null,
  );

  const description = useMemo(() => {
    if (catalogReady && !hasLinkedData) {
      return "No match data for the active workspace. Link datasets in workspace settings.";
    }
    if (scope === "all") {
      return "Aggregated metrics across all competition seasons linked to the workspace.";
    }
    return `Season overview for ${competition} · ${formatSeasonLabel(season)}.`;
  }, [catalogReady, hasLinkedData, scope, competition, season]);

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Analytics" eyebrow="Workspace dashboard" />
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load workspace dashboard."
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  const showNoLinkedData = catalogReady && !hasLinkedData;
  const loading = isLoading || isFetching;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Workspace dashboard"
        title="Analytics"
        description={description}
        action={
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-full min-w-0 sm:w-[11rem]">
                <label htmlFor="scope-filter" className="text-label mb-1.5 block">
                  Scope
                </label>
                <Select
                  value={scope}
                  onValueChange={(value: ReportScope) =>
                    updateUrl({ scope: value })
                  }
                >
                  <SelectTrigger id="scope-filter" className="h-9 bg-card/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filtered">Single season</SelectItem>
                    <SelectItem value="all">All linked datasets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scope === "filtered" && (
                <CompetitionSeasonFilter
                  catalog={catalog}
                  competition={competition}
                  season={season}
                  onCompetitionChange={(name) => {
                    const comp = catalog?.find((item) => item.name === name);
                    updateUrl({
                      scope: "filtered",
                      competition: name,
                      season: comp?.seasons[0] ?? DEFAULT_SEASON,
                    });
                  }}
                  onSeasonChange={(year) =>
                    updateUrl({ scope: "filtered", season: year })
                  }
                  isLoading={catalogLoading}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/reports">
                  <FileText className="mr-2 h-4 w-4" />
                  Saved reports
                </Link>
              </Button>
              {hasLinkedData && (
                <SaveReportDialog
                  competition={scope === "filtered" ? competition : undefined}
                  season={scope === "filtered" ? season : undefined}
                  scopeLabel={scopeLabel}
                />
              )}
            </div>
          </div>
        }
      />

      {showNoLinkedData ? (
        <EmptyState
          icon={BarChart3}
          title="No data linked to this workspace"
          description="Link competition seasons under Settings → Manage → Data access to build dashboards and reports."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/settings">Open workspaces</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard
              label="Matches"
              value={dashboard?.total_matches ?? "—"}
              icon={Calendar}
              loading={loading}
            />
            <StatCard
              label="Events"
              value={dashboard?.total_events?.toLocaleString() ?? "—"}
              icon={Activity}
              loading={loading}
            />
            <StatCard
              label="Goals"
              value={dashboard?.total_goals ?? "—"}
              icon={Goal}
              loading={loading}
            />
            <StatCard
              label="Avg goals / match"
              value={dashboard?.avg_goals_per_match ?? "—"}
              icon={BarChart3}
              loading={loading}
            />
            {scope === "filtered" && (
              <StatCard
                label="Total xG"
                value={
                  seasonXg ? formatXg(seasonXg.total_xg) : "—"
                }
                hint={
                  seasonXg
                    ? `${seasonXg.total_shots} shots · ${formatSeasonLabel(season)}`
                    : undefined
                }
                icon={Target}
                loading={loading || seasonXgLoading}
                className="col-span-2 lg:col-span-1"
              />
            )}
          </div>

          {scope === "filtered" && (
            <XgLeaderboards
              competition={competition}
              season={season}
              players={playerXg}
              teams={teamXg}
              loading={playerXgLoading || teamXgLoading}
            />
          )}

          {dashboard && (
            <DashboardPanels dashboard={dashboard} />
          )}
        </>
      )}
    </PageShell>
  );
}

function LegacyAnalyticsPage({ guestMode = false }: { guestMode?: boolean }) {
  const workspaceId = useActiveWorkspaceId();
  const {
    data: summary,
    isLoading: summaryLoading,
    error,
    refetch,
  } = useQuery<SummaryData>({
    queryKey: ["summary", workspaceId],
    queryFn: () => apiFetchJson<SummaryData>("/summary/"),
  });

  const legacyXgParams = new URLSearchParams({
    competition: DEFAULT_COMPETITION,
    season: DEFAULT_SEASON,
  });
  const { data: seasonXg, isLoading: seasonXgLoading } = useQuery<SeasonXg>({
    queryKey: ["season-xg", workspaceId, DEFAULT_COMPETITION, DEFAULT_SEASON],
    queryFn: () =>
      apiFetchJson<SeasonXg>(`/analytics/xg/season?${legacyXgParams}`),
  });

  const { data: playerXg, isLoading: playerXgLoading } =
    useQuery<PlayerXgLeaderboard>({
      queryKey: [
        "player-xg",
        workspaceId,
        DEFAULT_COMPETITION,
        DEFAULT_SEASON,
      ],
      queryFn: () =>
        apiFetchJson<PlayerXgLeaderboard>(
          `/analytics/xg/players?${legacyXgParams}&limit=8`,
        ),
    });

  const { data: teamXg, isLoading: teamXgLoading } =
    useQuery<TeamXgLeaderboard>({
      queryKey: ["team-xg", workspaceId, DEFAULT_COMPETITION, DEFAULT_SEASON],
      queryFn: () =>
        apiFetchJson<TeamXgLeaderboard>(
          `/analytics/xg/teams?${legacyXgParams}`,
        ),
    });

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Analytics" eyebrow="Tactical analysis" />
        <QueryErrorState
          error={error}
          fallbackMessage="Could not load analytics summary."
          onRetry={() => refetch()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Tactical analysis"
        title="Analytics"
        description={
          guestMode
            ? "Guest overview for the public La Liga 2020/21 demo dataset. Sign in for workspace dashboards and reports."
            : summary && summary.total_matches === 0
              ? "No match data for the active workspace. Link datasets in workspace settings to analyze fixtures."
              : "Metrics for the active workspace. Match and event counts follow linked competition seasons."
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          label="Matches analyzed"
          value={summary?.total_matches ?? "—"}
          icon={Calendar}
          loading={summaryLoading}
        />
        <StatCard
          label="Total events"
          value={summary?.total_events?.toLocaleString() ?? "—"}
          icon={Activity}
          loading={summaryLoading}
        />
        <StatCard
          label="Players tracked"
          value={summary?.total_players ?? "—"}
          hint="All loaded players (not yet filtered by workspace)"
          icon={Users}
          loading={summaryLoading}
        />
        <StatCard
          label="Total xG"
          value={seasonXg ? formatXg(seasonXg.total_xg) : "—"}
          hint={
            seasonXg
              ? `${seasonXg.total_shots} shots · ${formatSeasonLabel(DEFAULT_SEASON)}`
              : "StatsBomb shot xG"
          }
          icon={Target}
          className="col-span-2 lg:col-span-1"
          loading={summaryLoading || seasonXgLoading}
        />
      </div>

      <XgLeaderboards
        competition={DEFAULT_COMPETITION}
        season={DEFAULT_SEASON}
        players={playerXg}
        teams={teamXg}
        loading={playerXgLoading || teamXgLoading}
      />

      <AnalyticsRoadmap />

      {guestMode ? (
        <p className="text-caption mt-8">
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to unlock workspace dashboards, saved reports, and CSV export.
        </p>
      ) : (
        <p className="text-caption mt-8">
          Enable authentication to unlock workspace dashboards, saved reports, and CSV export.
        </p>
      )}
    </PageShell>
  );
}

export default function AnalyticsPage() {
  const { session, isLoading } = useAuthSession();

  if (AUTH_ENABLED && !isLoading && session) {
    return <AuthAnalyticsDashboard />;
  }

  return <LegacyAnalyticsPage guestMode={AUTH_ENABLED && !session} />;
}