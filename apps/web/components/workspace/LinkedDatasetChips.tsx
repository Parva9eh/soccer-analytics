"use client";

import Link from "next/link";
import {
  buildMatchesListPath,
  formatSeasonLabel,
  type LinkedDataset,
} from "@/lib/competition-filter";
import { cn } from "@/lib/utils";

interface LinkedDatasetChipsProps {
  datasets: LinkedDataset[];
  className?: string;
}

export function LinkedDatasetChips({
  datasets,
  className,
}: LinkedDatasetChipsProps) {
  if (datasets.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {datasets.map((item) => (
        <Link
          key={`${item.competition}-${item.season}`}
          href={buildMatchesListPath(item.competition, item.season)}
          className="inline-flex items-center rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-primary/10"
        >
          {item.competition}
          <span className="mx-1.5 text-muted-foreground">·</span>
          {formatSeasonLabel(item.season)}
        </Link>
      ))}
    </div>
  );
}