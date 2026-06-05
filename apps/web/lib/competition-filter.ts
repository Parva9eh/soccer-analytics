/** Defaults aligned with loaded StatsBomb ETL data. */
export const DEFAULT_COMPETITION = "La Liga";
export const DEFAULT_SEASON = "2020/2021";

export interface CompetitionCatalogItem {
  name: string;
  seasons: string[];
}

export function buildMatchesQuery(
  competition: string,
  season: string,
  limit = 100,
): string {
  const params = new URLSearchParams({
    limit: String(limit),
    competition,
    season,
  });
  return `/matches/?${params.toString()}`;
}

export function formatSeasonLabel(season: string): string {
  return season.replace("/", "–");
}