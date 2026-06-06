"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSeasonLabel } from "@/lib/competition-filter";
import type { WorkspaceDashboard } from "@/lib/report-types";

interface DashboardPanelsProps {
  dashboard: WorkspaceDashboard;
}

export function DashboardPanels({ dashboard }: DashboardPanelsProps) {
  const maxEventCount = Math.max(
    ...dashboard.event_types.map((item) => item.count),
    1,
  );
  const maxWeekCount = Math.max(
    ...dashboard.matches_by_week.map((item) => item.count),
    1,
  );

  const scopeLabel =
    dashboard.competition && dashboard.season
      ? `${dashboard.competition} · ${formatSeasonLabel(dashboard.season)}`
      : "All linked datasets";

  return (
    <div className="space-y-6">
      <p className="text-caption text-muted-foreground">Scope: {scopeLabel}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="surface-card border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top event types</CardTitle>
          </CardHeader>
          <CardContent>
            {!dashboard.event_types.length ? (
              <p className="text-caption text-muted-foreground">
                No events in this scope.
              </p>
            ) : (
              <ul className="space-y-3">
                {dashboard.event_types.map((item) => (
                  <li key={item.event_type}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{item.event_type}</span>
                      <span className="text-caption tabular-nums text-muted-foreground">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{
                          width: `${(item.count / maxEventCount) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="surface-card border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Fixtures by matchweek</CardTitle>
          </CardHeader>
          <CardContent>
            {!dashboard.matches_by_week.length ? (
              <p className="text-caption text-muted-foreground">
                No matchweek data in this scope.
              </p>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {dashboard.matches_by_week.map((item) => (
                  <li
                    key={item.match_week}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-10 shrink-0 tabular-nums text-muted-foreground">
                      GW {item.match_week}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{
                            width: `${(item.count / maxWeekCount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-8 shrink-0 text-right tabular-nums">
                      {item.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {dashboard.datasets.length > 0 && (
        <Card className="surface-card border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Linked datasets</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {dashboard.datasets.map((item) => (
                <li
                  key={`${item.competition}-${item.season}`}
                  className="rounded-md border border-border bg-muted/30 px-2.5 py-1 text-sm"
                >
                  {item.competition} · {formatSeasonLabel(item.season)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}