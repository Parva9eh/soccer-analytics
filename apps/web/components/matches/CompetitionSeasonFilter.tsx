"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatSeasonLabel,
  type CompetitionCatalogItem,
} from "@/lib/competition-filter";
import { cn } from "@/lib/utils";

interface CompetitionSeasonFilterProps {
  catalog: CompetitionCatalogItem[] | undefined;
  competition: string;
  season: string;
  onCompetitionChange: (name: string) => void;
  onSeasonChange: (year: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function CompetitionSeasonFilter({
  catalog,
  competition,
  season,
  onCompetitionChange,
  onSeasonChange,
  isLoading,
  className,
}: CompetitionSeasonFilterProps) {
  const items = catalog ?? [];
  const catalogReady = catalog !== undefined && !isLoading;
  const hasData = items.length > 0;

  if (catalogReady && !hasData) {
    return (
      <p className={cn("text-caption text-muted-foreground", className)}>
        No competitions linked to this workspace.
      </p>
    );
  }

  const activeComp =
    items.find((c) => c.name === competition) ?? items[0];
  const seasons = activeComp?.seasons ?? [];
  const activeSeason =
    seasons.length > 0 && seasons.includes(season) ? season : seasons[0];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end",
        className,
      )}
    >
      <div className="w-full min-w-0 sm:w-[11rem]">
        <label
          htmlFor="competition-filter"
          className="text-label mb-1.5 block"
        >
          Competition
        </label>
        <Select
          value={activeComp?.name}
          onValueChange={onCompetitionChange}
          disabled={isLoading || !hasData}
        >
          <SelectTrigger id="competition-filter" className="h-9 bg-card/80">
            <SelectValue placeholder="Competition" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.name} value={item.name}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full min-w-0 sm:w-[10rem]">
        <label htmlFor="season-filter" className="text-label mb-1.5 block">
          Season
        </label>
        <Select
          value={activeSeason}
          onValueChange={onSeasonChange}
          disabled={isLoading || seasons.length === 0}
        >
          <SelectTrigger id="season-filter" className="h-9 bg-card/80">
            <SelectValue placeholder="Season" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((year) => (
              <SelectItem key={year} value={year}>
                {formatSeasonLabel(year)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}