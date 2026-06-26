"use client";

import { useMemo } from "react";
import {
  classifyPlayPhase,
  PLAY_PHASE_LABELS,
  type PlayPhaseTag,
} from "@/lib/tactical-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PhaseEvent {
  details?: unknown;
}

interface MatchPhaseBreakdownProps {
  events: PhaseEvent[];
}

const PHASE_ORDER: PlayPhaseTag[] = [
  "regular",
  "set_piece",
  "counter",
  "other",
];

export function MatchPhaseBreakdown({ events }: MatchPhaseBreakdownProps) {
  const phases = useMemo(() => {
    const counts: Record<PlayPhaseTag, number> = {
      regular: 0,
      set_piece: 0,
      counter: 0,
      other: 0,
    };

    for (const event of events) {
      const tag = classifyPlayPhase(event.details);
      counts[tag] += 1;
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return PHASE_ORDER.map((tag) => ({
      tag,
      label: PLAY_PHASE_LABELS[tag],
      count: counts[tag],
      share: total > 0 ? counts[tag] / total : 0,
    })).filter((phase) => phase.count > 0);
  }, [events]);

  if (phases.length === 0) {
    return null;
  }

  const maxCount = Math.max(...phases.map((phase) => phase.count), 1);

  return (
    <Card className="surface-card border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Phase breakdown</CardTitle>
        <p className="text-caption text-muted-foreground">
          Events grouped by StatsBomb play pattern
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {phases.map((phase) => (
            <li key={phase.tag}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>{phase.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {phase.count.toLocaleString()} · {(phase.share * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-primary/75"
                  style={{ width: `${(phase.count / maxCount) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}