"use client";

import type { MatchXg } from "@/lib/xg-types";
import { formatXg } from "@/lib/xg-types";

interface MatchXgStripProps {
  data: MatchXg;
}

export function MatchXgStrip({ data }: MatchXgStripProps) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
      <div className="text-center sm:text-right">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          xG
        </p>
        <p className="metric-value text-2xl text-foreground">
          {formatXg(data.home.xg)}
        </p>
        <p className="text-caption text-muted-foreground">
          {data.home.shots} shots · {data.home.goals} goals
        </p>
      </div>
      <div className="text-center sm:text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          xG
        </p>
        <p className="metric-value text-2xl text-foreground">
          {formatXg(data.away.xg)}
        </p>
        <p className="text-caption text-muted-foreground">
          {data.away.shots} shots · {data.away.goals} goals
        </p>
      </div>
    </div>
  );
}