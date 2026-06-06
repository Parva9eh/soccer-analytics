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

export function isFilterInCatalog(
  catalog: CompetitionCatalogItem[] | undefined,
  competition: string,
  season: string,
): boolean {
  const comp = catalog?.find((item) => item.name === competition);
  return Boolean(comp?.seasons.includes(season));
}

/** First competition/season from workspace catalog, or null when none linked. */
export function getFirstCatalogFilters(
  catalog: CompetitionCatalogItem[] | undefined,
): { competition: string; season: string } | null {
  const first = catalog?.[0];
  const season = first?.seasons[0];
  if (!first?.name || !season) {
    return null;
  }
  return { competition: first.name, season };
}