"use client";

// IMPORTANT: Patch THREE.Clock BEFORE any import that pulls in @react-three/fiber.
// This must be the first import so that when fiber's internal store does
// `new THREE.Clock()` (in its events bundles), it gets our non-deprecated shim.
import "@/lib/three-patch";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Trophy, X } from "lucide-react";
import { apiFetchJson } from "@/lib/api";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { parseMatchAnalysisConfig } from "@/lib/analysis-config";
import { SaveAnalysisDialog } from "@/components/analysis/SaveAnalysisDialog";
import { MatchXgStrip } from "@/components/analytics/MatchXgStrip";
import { ShotMapLegend } from "@/components/analytics/ShotMapLegend";
import { ShotMapPitch } from "@/components/analytics/ShotMapPitch";
import { formatXg, type MatchXg } from "@/lib/xg-types";
import {
  formatShotOutcome,
  isShotEvent,
  parseShotMeta,
  shotMatchesTeamFilter,
  shotOutcomeColor,
  type ShotTeamFilter,
} from "@/lib/shot-utils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pitch } from "@/components/pitch/Pitch";
import { ThreeDPitch } from "@/components/pitch/ThreeDPitch";
import { getEventColor, getEventIcon, EVENT_TYPES } from "@/components/pitch/utils";
import { PitchLayersPopover } from "@/components/pitch/PitchLayersPopover";
import { TableEventFilterPopover } from "@/components/pitch/TableEventFilterPopover";
import { SectionHeader } from "@/components/ui/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { PageShell } from "@/components/ui/page-shell";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { TableContainer } from "@/components/ui/table-container";
import { MapPin } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

/** Match timeline scale (0'–90'+); inset keeps edge markers visible. */
const MATCH_DURATION_MIN = 95;
const TIMELINE_EDGE_INSET_PCT = 3;

function timelinePercentFromMinute(minute: number): number {
  const clamped = Math.min(Math.max(minute, 0), MATCH_DURATION_MIN);
  const t = clamped / MATCH_DURATION_MIN;
  return TIMELINE_EDGE_INSET_PCT + t * (100 - 2 * TIMELINE_EDGE_INSET_PCT);
}

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
  details?: unknown;
}

type PitchViewMode = "events" | "shots";

interface EventsResponse {
  total: number;
  page: number;
  page_size: number;
  events: Event[];
}

export default function MatchDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const savedId = searchParams.get("saved");
  const matchId = params.id ? Number(params.id) : null;
  const workspaceId = useActiveWorkspaceId();
  const { session } = useAuthSession();
  const canSaveView =
    AUTH_ENABLED && Boolean(session?.access_token) && matchId != null;
  const appliedSavedRef = useRef<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEventType, setSelectedEventType] = useState<string>("all");
  const [highlightedEventId, setHighlightedEventId] = useState<number | null>(
    null,
  );
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isTableFilterOpen, setIsTableFilterOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [pitchViewMode, setPitchViewMode] = useState<PitchViewMode>("events");
  const [shotTeamFilter, setShotTeamFilter] = useState<ShotTeamFilter>("all");
  const [use3DView, setUse3DView] = useState(false);
  const [current3DView, setCurrent3DView] = useState<'top' | 'side' | 'goal' | 'iso'>('iso');
  const [autoOrbit3D, setAutoOrbit3D] = useState(false); // advanced interactivity for 3D stadium tour feel

  const [visibleEventTypes, setVisibleEventTypes] = useState<string[]>([
    "Shot",
    "Pass",
    "Pressure",
    "Carry",
    "Duel",
  ]);

  const pageSize = 50;
  const eventsTableRef = useRef<HTMLDivElement>(null);

  // Scroll to and highlight the selected event in the table when clicked from pitch
  useEffect(() => {
    if (highlightedEventId && eventsTableRef.current) {
      const row = eventsTableRef.current.querySelector(
        `[data-event-id="${highlightedEventId}"]`
      ) as HTMLElement | null;

      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });

        // Add temporary pulse animation
        row.classList.add("!bg-primary/15", "ring-1", "ring-primary/40");
        setTimeout(() => {
          row.classList.remove("!bg-primary/15", "ring-1", "ring-primary/40");
        }, 1400);
      }
    }
  }, [highlightedEventId]);

  const { data: savedAnalysis } = useQuery<{
    id: string;
    title: string;
    config: Record<string, unknown>;
  }>({
    queryKey: ["saved-analysis", savedId],
    queryFn: () =>
      apiFetchJson(`/analyses/${savedId}`),
    enabled: AUTH_ENABLED && Boolean(savedId),
  });

  useEffect(() => {
    if (!savedAnalysis || appliedSavedRef.current === savedAnalysis.id) {
      return;
    }
    const config = parseMatchAnalysisConfig(savedAnalysis.config);
    if (!config) {
      return;
    }
    appliedSavedRef.current = savedAnalysis.id;
    setSelectedEventType(config.selected_event_type);
    if (config.visible_event_types.length > 0) {
      setVisibleEventTypes(config.visible_event_types);
    }
    setUse3DView(config.use_3d_view);
    setCurrent3DView(config.current_3d_view);
    setCurrentPage(1);
    setHighlightedEventId(null);
  }, [savedAnalysis]);

  // Fetch match details
  const {
    data: match,
    isLoading: matchLoading,
    error: matchError,
    refetch: refetchMatch,
  } = useQuery<Match>({
    queryKey: ["match", workspaceId, matchId],
    queryFn: () => apiFetchJson<Match>(`/matches/${matchId}`),
    enabled: !!matchId,
  });

  const { data: matchXg } = useQuery<MatchXg>({
    queryKey: ["match-xg", workspaceId, matchId],
    queryFn: () => apiFetchJson<MatchXg>(`/analytics/xg/matches/${matchId}`),
    enabled: matchId != null,
  });

  // Fetch events for table
  const { data: eventsData, isLoading: eventsLoading } =
    useQuery<EventsResponse>({
      queryKey: ["events", workspaceId, matchId, currentPage, selectedEventType],
      queryFn: async () => {
        const eventTypeParam =
          selectedEventType === "all" ? "" : `&event_type=${selectedEventType}`;
        return apiFetchJson<EventsResponse>(
          `/events/?match_id=${matchId}&page=${currentPage}&page_size=${pageSize}${eventTypeParam}`,
        );
      },
      enabled: !!matchId,
    });

  // Fetch events for Pitch
  const { data: pitchEventsData } = useQuery<EventsResponse>({
    queryKey: ["pitch-events", workspaceId, matchId],
    queryFn: async () => {
      try {
        return await apiFetchJson<EventsResponse>(
          `/events/?match_id=${matchId}&page=1&page_size=500`,
        );
      } catch {
        return { events: [], total: 0, page: 1, page_size: 500 };
      }
    },
    enabled: !!matchId,
  });

  const allPitchEvents = pitchEventsData?.events ?? [];

  const shotMapEvents = allPitchEvents.filter((event) => {
    if (!isShotEvent(event.event_type) || event.x == null || event.y == null) {
      return false;
    }
    if (!match) {
      return true;
    }
    const meta = parseShotMeta(event.details);
    return shotMatchesTeamFilter(
      meta.team,
      shotTeamFilter,
      match.home_team ?? "",
      match.away_team ?? "",
    );
  });

  const shotMapSummary = shotMapEvents.reduce(
    (acc, event) => {
      const meta = parseShotMeta(event.details);
      acc.shots += 1;
      if (meta.xg != null) {
        acc.xg += meta.xg;
      }
      if (meta.outcome === "Goal") {
        acc.goals += 1;
      }
      return acc;
    },
    { shots: 0, goals: 0, xg: 0 },
  );

  // Filter events shown on pitch
  const filteredPitchEvents =
    pitchViewMode === "shots"
      ? shotMapEvents
      : allPitchEvents.filter((event) => {
          if (!event.event_type) return false;
          return visibleEventTypes.some((type) =>
            event.event_type!.toLowerCase().includes(type.toLowerCase()),
          );
        });

  const eventTypes = pitchEventsData?.events
    ? (Array.from(
        new Set(
          pitchEventsData.events.map((e) => e.event_type).filter(Boolean),
        ),
      ) as string[])
    : [];

  const totalPages = eventsData ? Math.ceil(eventsData.total / pageSize) : 1;
  const matchEventTotal = pitchEventsData?.total ?? null;
  const tableFilterCount = eventsData?.total ?? null;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setHighlightedEventId(null);
    }
  };

  const handleFilterChange = (value: string) => {
    setSelectedEventType(value);
    setCurrentPage(1);
    setHighlightedEventId(null);
  };

  const toggleEventType = (type: string) => {
    setVisibleEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  // Handle click on pitch (dot or arrow)
  // getEventColor and getEventIcon are now shared in @/components/pitch/utils
  // for consistency between 2D/3D and UI (legend, timeline, sheet, tooltips).

  const handlePitchEventClick = (event: any) => {
    setHighlightedEventId(event.id);
    setSelectedEvent(event);

    // Switch to correct page if needed
    if (pitchEventsData?.events) {
      const index = pitchEventsData.events.findIndex((e) => e.id === event.id);
      if (index !== -1) {
        const targetPage = Math.floor(index / pageSize) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }
    }
  };

  const clearSelection = () => {
    setHighlightedEventId(null);
    setSelectedEvent(null);
  };

  if (matchLoading) {
    return (
      <PageShell wide>
        <div className="mb-4 h-4 w-24 animate-pulse rounded bg-muted/50" />
        <div className="mb-6 h-10 w-full max-w-md animate-pulse rounded bg-muted/50" />
        <div className="surface-card mb-8 h-28 animate-pulse rounded-xl border" />
        <div className="surface-card min-h-[280px] animate-pulse rounded-xl border sm:min-h-[400px]" />
      </PageShell>
    );
  }

  if (matchError || !match) {
    return (
      <PageShell wide>
        <Link
          href="/matches"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to matches
        </Link>
        <QueryErrorState
          error={matchError ?? new Error("Match not found")}
          title="Match not found"
          onRetry={() => refetchMatch()}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link href="/matches">All matches</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  const formattedDate = new Date(match.match_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <PageShell wide>
      {/* Back Button */}
      <Link
        href="/matches"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      {/* Match Header */}
      <div className="mb-8">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <h1 className="text-page-title min-w-0 break-words">
            {match.home_team} vs {match.away_team}
          </h1>
          {match.match_week != null && (
            <Badge variant="secondary" className="w-fit shrink-0 gap-1">
              <Trophy className="h-3 w-3" /> Week {match.match_week}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-caption sm:text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{formattedDate}</span>
          </div>
          {canSaveView && (
            <SaveAnalysisDialog
              matchId={matchId}
              matchLabel={`${match.home_team} vs ${match.away_team}`}
              selectedEventType={selectedEventType}
              visibleEventTypes={visibleEventTypes}
              use3DView={use3DView}
              current3DView={current3DView}
            />
          )}
          {savedAnalysis && (
            <span className="text-caption text-primary">
              Loaded: {savedAnalysis.title}
            </span>
          )}
        </div>
      </div>

      {/* Compact Score Header - Advanced layout */}
      <Card className="surface-panel mb-8">
        <CardContent className="py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex w-full items-center justify-center gap-3 sm:gap-6 md:gap-8">
              <div className="min-w-0 flex-1 text-center sm:text-right">
                <div className="text-label truncate">{match.home_team}</div>
                <div className="metric-value text-4xl tracking-tighter text-foreground sm:text-5xl">
                  {match.home_score ?? "–"}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-center px-1 text-center">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  vs
                </div>
                {match.match_week != null && (
                  <div className="text-caption mt-0.5">W{match.match_week}</div>
                )}
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="text-label truncate">{match.away_team}</div>
                <div className="metric-value text-4xl tracking-tighter text-foreground sm:text-5xl">
                  {match.away_score ?? "–"}
                </div>
              </div>
            </div>

            <p className="text-center text-caption sm:hidden">{formattedDate}</p>
          </div>
          {matchXg && <MatchXgStrip data={matchXg} />}
        </CardContent>
      </Card>

      {/* Pitch Visualization - Elevated as primary view */}
      <div className="mb-8">
        <SectionHeader
          title={pitchViewMode === "shots" ? "Shot map" : "Pitch view"}
          description={
            pitchViewMode === "shots"
              ? `${shotMapSummary.shots} shots · ${formatXg(shotMapSummary.xg)} xG · ${shotMapSummary.goals} goals`
              : use3DView
                ? "Click events to inspect • Shift+drag to box-select"
                : "Click events on the pitch to inspect"
          }
          action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SegmentedControl
              aria-label="Pitch content mode"
              options={[
                { value: "events", label: "Events" },
                { value: "shots", label: "Shot map" },
              ]}
              value={pitchViewMode}
              onChange={(value) => {
                const mode = value as PitchViewMode;
                setPitchViewMode(mode);
                if (mode === "shots") {
                  setUse3DView(false);
                }
              }}
            />

            {pitchViewMode === "shots" && match && (
              <SegmentedControl
                aria-label="Shot map team filter"
                size="sm"
                options={[
                  { value: "all", label: "All" },
                  { value: "home", label: "Home" },
                  { value: "away", label: "Away" },
                ]}
                value={shotTeamFilter}
                onChange={(value) => setShotTeamFilter(value as ShotTeamFilter)}
              />
            )}

            {pitchViewMode === "events" && (
              <SegmentedControl
                aria-label="Pitch view mode"
                options={[
                  { value: "2d", label: "2D" },
                  { value: "3d", label: "3D" },
                ]}
                value={use3DView ? "3d" : "2d"}
                onChange={(v) => setUse3DView(v === "3d")}
              />
            )}

            {pitchViewMode === "events" && (
              <div className="hidden items-center gap-1.5 border-l border-border pl-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground sm:flex">
                {EVENT_TYPES.map((t) => (
                  <span key={t} className="inline-flex items-center gap-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: getEventColor(t) }} />
                    {t}
                  </span>
                ))}
              </div>
            )}

            {highlightedEventId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHighlightedEventId(null);
                  setSelectedEvent(null);
                }}
              >
                Clear selection
              </Button>
            )}

            {pitchViewMode === "events" && use3DView && (
              <>
                <SegmentedControl
                  aria-label="Camera view"
                  size="sm"
                  options={(
                    ["iso", "top", "side", "goal"] as const
                  ).map((m) => ({ value: m, label: m }))}
                  value={current3DView}
                  onChange={setCurrent3DView}
                />
                <Button
                  type="button"
                  variant={autoOrbit3D ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setAutoOrbit3D(!autoOrbit3D)}
                  title="Toggle auto-rotate"
                >
                  {autoOrbit3D ? "Stop orbit" : "Auto orbit"}
                </Button>
              </>
            )}

            {pitchViewMode === "events" && (
              <PitchLayersPopover
                open={isControlsOpen}
                onOpenChange={setIsControlsOpen}
                visibleTypes={visibleEventTypes}
                onToggleType={toggleEventType}
                onSelectAll={() => setVisibleEventTypes([...EVENT_TYPES])}
                onClearAll={() => setVisibleEventTypes([])}
              />
            )}
          </div>
          }
        />

        {pitchViewMode === "shots" ? (
          <div className="mb-3">
            <ShotMapLegend />
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:hidden">
            {EVENT_TYPES.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: getEventColor(t) }}
                />
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mb-3 mt-1">
          <div className="mb-1.5 flex items-center justify-between text-label">
            <span>Event timeline</span>
            <span className="normal-case tracking-normal text-muted-foreground">
              {filteredPitchEvents.length}{" "}
              {pitchViewMode === "shots" ? "shots" : "events"}
            </span>
          </div>
          <div className="relative h-8 w-full rounded-md border border-border/80 bg-background px-3">
            <div className="relative h-full">
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border/60" />
              {filteredPitchEvents
                .filter((e) => e.minute != null)
                .map((event, index) => {
                  const minute = event.minute ?? 0;
                  const leftPct = timelinePercentFromMinute(minute);
                  const shotMeta =
                    pitchViewMode === "shots"
                      ? parseShotMeta(event.details)
                      : null;
                  const color =
                    pitchViewMode === "shots"
                      ? shotOutcomeColor(shotMeta?.outcome ?? null)
                      : getEventColor(event.event_type);
                  const isActive = highlightedEventId === event.id;
                  const title =
                    pitchViewMode === "shots"
                      ? `${shotMeta?.player ?? "Shot"} · ${minute}'`
                      : `${event.event_type} — ${minute}'`;

                  return (
                    <button
                      key={`${event.id}-${index}`}
                      type="button"
                      onClick={() => handlePitchEventClick(event)}
                      aria-label={`${event.event_type} at ${minute} minutes`}
                      aria-pressed={isActive}
                      className={`absolute top-1/2 z-[1] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background transition-all duration-150 hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive
                          ? "scale-125 ring-2 ring-primary/50"
                          : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ left: `${leftPct}%`, backgroundColor: color }}
                      title={title}
                    />
                  );
                })}
            </div>
          </div>
        </div>

        {/* Advanced: Event Density Heatmap */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-label">
            <span>Event density (per minute)</span>
          </div>
          <div className="flex h-3 w-full gap-px overflow-hidden rounded border border-border/80 bg-background">
            {Array.from({ length: 95 }, (_, min) => {
              const count = filteredPitchEvents.filter(e => e.minute === min).length;
              const intensity = Math.min(count / 4, 1);
              const bg = intensity > 0 ? `rgba(163, 163, 172, ${0.2 + intensity * 0.7})` : 'rgba(15, 23, 42, 0.6)';
              return <div key={min} className="flex-1" style={{ backgroundColor: bg }} title={`Minute ${min}: ${count} events`} />;
            })}
          </div>
          <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
            <span>0'</span><span>45'</span><span>90'+</span>
          </div>
        </div>

        <div
          className={`relative transition-all ${use3DView ? "min-h-[min(420px,58vh)] sm:min-h-[560px] md:min-h-[720px] lg:min-h-[800px]" : "h-auto"}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (!filteredPitchEvents.length) return;
            const currentIndex = filteredPitchEvents.findIndex(e => e.id === highlightedEventId);
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % filteredPitchEvents.length : 0;
              const nextEvent = filteredPitchEvents[nextIndex];
              handlePitchEventClick(nextEvent);
            }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              const prevIndex = currentIndex >= 0 ? (currentIndex - 1 + filteredPitchEvents.length) % filteredPitchEvents.length : filteredPitchEvents.length - 1;
              const prevEvent = filteredPitchEvents[prevIndex];
              handlePitchEventClick(prevEvent);
            }
            if (e.key === 'Escape') {
              setHighlightedEventId(null);
              setSelectedEvent(null);
            }
          }}
        >
          {pitchViewMode === "shots" ? (
            shotMapEvents.length > 0 ? (
              <ShotMapPitch
                events={shotMapEvents}
                onEventClick={handlePitchEventClick}
                highlightedEventId={highlightedEventId}
              />
            ) : (
              <EmptyState
                icon={MapPin}
                title="No shots in this filter"
                description="Try showing all teams or switch back to the full event view."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShotTeamFilter("all")}
                  >
                    Show all teams
                  </Button>
                }
              />
            )
          ) : use3DView ? (
            <ThreeDPitch
              events={filteredPitchEvents}
              onEventClick={handlePitchEventClick}
              highlightedEventId={highlightedEventId}
              selectedEventIds={highlightedEventId ? [highlightedEventId] : []}
              viewMode={current3DView}
              onViewModeChange={(mode) => setCurrent3DView(mode)}
              autoRotate={autoOrbit3D}
              onSelectionChange={(selectedIds) => {
                if (selectedIds.length > 0) {
                  setHighlightedEventId(selectedIds[0]);
                  const first = filteredPitchEvents.find(e => e.id === selectedIds[0]);
                  if (first) setSelectedEvent(first);
                }
              }}
            />
          ) : (
            <Pitch
              events={filteredPitchEvents}
              onEventClick={handlePitchEventClick}
              highlightedEventId={highlightedEventId}
              selectedEventIds={highlightedEventId ? [highlightedEventId] : []}
              onSelectionChange={(selectedIds) => {
                if (selectedIds.length > 0) {
                  setHighlightedEventId(selectedIds[0]);
                  const first = filteredPitchEvents.find(e => e.id === selectedIds[0]);
                  if (first) setSelectedEvent(first);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Events Table - Tightly integrated with Pitch */}
      <div id="events-table" className="mt-8">
        <SectionHeader
          title="Event timeline"
          description="Synced with pitch selection"
          className="mb-4"
          action={
            <div className="flex items-center gap-2">
              {eventTypes.length > 0 && (
                <TableEventFilterPopover
                  open={isTableFilterOpen}
                  onOpenChange={setIsTableFilterOpen}
                  selectedType={selectedEventType}
                  eventTypes={eventTypes}
                  onSelect={handleFilterChange}
                  filteredCount={tableFilterCount}
                  totalCount={matchEventTotal}
                />
              )}
            </div>
          }
        />

        {eventsLoading ? (
          <div className="surface-card h-96 rounded-xl border p-6">
            <div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted/50" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mb-3 flex items-center gap-4">
                <div className="h-4 w-12 animate-pulse rounded bg-muted/50" />
                <div className="h-4 flex-1 animate-pulse rounded bg-muted/50" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted/50" />
              </div>
            ))}
          </div>
        ) : eventsData && eventsData.events.length > 0 ? (
          <>
            <Card className="surface-card elevation-2">
              <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[110px]">Minute</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Location (x, y)</TableHead>
                    <TableHead className="hidden sm:table-cell">End Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsData.events.map((event) => (
                    <TableRow
                      key={event.id}
                      data-event-id={event.id}
                      tabIndex={0}
                      role="button"
                      className={highlightedEventId === event.id ? "selected min-h-[52px]" : "min-h-[52px]"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handlePitchEventClick(event);
                        }
                      }}
                    >
                      <TableCell className="font-mono">
                        {event.minute ?? "-"}:
                        {event.second?.toString().padStart(2, "0") ?? "00"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {event.event_type || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono-data text-sm text-muted-foreground">
                        {event.x?.toFixed(1) ?? "-"},{" "}
                        {event.y?.toFixed(1) ?? "-"}
                      </TableCell>
                      <TableCell className="font-mono-data hidden text-sm text-muted-foreground sm:table-cell">
                        {event.end_x?.toFixed(1) ?? "-"},{" "}
                        {event.end_y?.toFixed(1) ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </TableContainer>
            </Card>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Prev
              </Button>
              <div className="text-caption tabular-nums">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next →
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No events for this match"
            description="This fixture may not have event data loaded yet, or your filter excludes all types."
            action={
              selectedEventType !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange("all")}
                >
                  Show all types
                </Button>
              ) : undefined
            }
          />
        )}
      </div>

      {/* ==================== PREMIUM SIDE PANEL ==================== */}
      <Sheet
        open={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(null);
            setHighlightedEventId(null);
          }
        }}
      >
        <SheetContent
          showCloseButton={false}
          className="flex w-full max-w-[420px] flex-col border-border bg-card p-0 elevation-4 sm:w-[420px]"
        >
          <SheetHeader className="border-b border-border bg-background/60 px-6 pb-4 pt-5 text-left">
            <div className="flex items-start justify-between gap-3 pr-1">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <div className="shrink-0 text-primary">
                    {getEventIcon(selectedEvent?.event_type)}
                  </div>
                  <SheetTitle className="text-lg tracking-tight">
                    {selectedEvent?.event_type || "Event"}
                  </SheetTitle>
                </div>
                <SheetDescription className="mt-0.5 text-xs">
                  Minute {selectedEvent?.minute}:
                  {(selectedEvent?.second ?? 0).toString().padStart(2, "0")}
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  aria-label="Close event details"
                >
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-7">
            {/* Event Type */}
            <div>
              <div className="text-label mb-1">Event Type</div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold text-foreground">
                  {selectedEvent?.event_type}
                </span>
                <span className="rounded bg-secondary px-2 py-px text-[10px] font-medium tracking-wider text-muted-foreground">
                  {selectedEvent?.event_type?.slice(0, 4).toUpperCase()}
                </span>
              </div>
            </div>

            {/* Time */}
            <div>
              <div className="text-label mb-1">Time</div>
              <div className="font-mono-data text-3xl font-semibold tabular-nums text-foreground">
                {selectedEvent?.minute}:
                {(selectedEvent?.second ?? 0).toString().padStart(2, "0")}
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-label mb-1">Start Location</div>
                <div className="font-mono-data flex items-center gap-2 text-xl text-foreground">
                  ({selectedEvent?.x?.toFixed(1)}, {selectedEvent?.y?.toFixed(1)})
                  <span className="text-caption">(on pitch)</span>
                </div>
              </div>

              {(selectedEvent?.end_x || selectedEvent?.end_y) && (
                <div>
                  <div className="text-label mb-1">End Location</div>
                  <div className="font-mono-data text-xl text-foreground">
                    ({selectedEvent?.end_x?.toFixed(1)}, {selectedEvent?.end_y?.toFixed(1)})
                  </div>
                </div>
              )}
            </div>

            <p className="text-caption">
              Synced with the pitch view and event table. Press Escape to dismiss.
            </p>

            {selectedEvent && (
              <div className="border-t border-border/80 pt-2 text-[10px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Distance</span>
                  <span className="font-mono-data text-foreground">
                    {selectedEvent.end_x && selectedEvent.end_y 
                      ? Math.hypot((selectedEvent.end_x - (selectedEvent.x || 0)), (selectedEvent.end_y - (selectedEvent.y || 0))).toFixed(1) 
                      : '—'} units
                  </span>
                </div>
              </div>
            )}

            {/* Mini pitch visual for context (advanced) */}
            {selectedEvent && (
              <div>
                <div className="text-label mb-1">Location on Pitch</div>
                <div className="relative h-20 w-32 overflow-hidden rounded border border-border bg-background">
                  <svg viewBox="0 0 120 80" className="h-full w-full">
                    <rect
                      x="5"
                      y="5"
                      width="110"
                      height="70"
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth="1"
                    />
                    <line
                      x1="60"
                      y1="5"
                      x2="60"
                      y2="75"
                      stroke="hsl(var(--border))"
                      strokeWidth="0.8"
                    />
                    {/* Event dot */}
                    <circle 
                      cx={selectedEvent.x ?? 60} 
                      cy={selectedEvent.y ?? 40} 
                      r="2.5" 
                      fill={getEventColor(selectedEvent.event_type)} 
                    />
                  </svg>
                </div>
              </div>
            )}

            {selectedEvent && isShotEvent(selectedEvent.event_type) && (
              <div className="border-t border-border/80 pt-4">
                <div className="text-label mb-2">Shot details</div>
                {(() => {
                  const meta = parseShotMeta(selectedEvent.details);
                  return (
                    <div className="space-y-3">
                      {meta.player && (
                        <div>
                          <div className="text-caption mb-0.5">Player</div>
                          <div className="font-medium text-foreground">{meta.player}</div>
                        </div>
                      )}
                      {meta.team && (
                        <div>
                          <div className="text-caption mb-0.5">Team</div>
                          <div className="font-medium text-foreground">{meta.team}</div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-caption mb-0.5">xG</div>
                          <div className="font-mono-data text-2xl font-semibold tabular-nums text-foreground">
                            {meta.xg != null ? formatXg(meta.xg) : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-caption mb-0.5">Outcome</div>
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: shotOutcomeColor(meta.outcome),
                              }}
                            />
                            {formatShotOutcome(meta.outcome)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
}
