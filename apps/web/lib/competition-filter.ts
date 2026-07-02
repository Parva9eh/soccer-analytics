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

export interface LinkedDataset {
  competition: string;
  season: string;
}

/** Flatten workspace catalog into linked competition/season pairs. */
export function flattenCatalogDatasets(
  catalog: CompetitionCatalogItem[] | undefined,
): LinkedDataset[] {
  return (catalog ?? []).flatMap((item) =>
    item.seasons.map((season) => ({
      competition: item.name,
      season,
    })),
  );
}

/** Count linked seasons (not competitions). */
export function countLinkedSeasons(
  catalog: CompetitionCatalogItem[] | undefined,
): number {
  return flattenCatalogDatasets(catalog).length;
}

/** Human-readable summary for hero copy and labels. */
export function formatCatalogSummary(
  catalog: CompetitionCatalogItem[] | undefined,
): string {
  const datasets = flattenCatalogDatasets(catalog);
  if (datasets.length === 0) {
    return "";
  }
  return datasets
    .map(
      (item) => `${item.competition} ${formatSeasonLabel(item.season)}`,
    )
    .join(" · ");
}

export function buildMatchesListPath(
  competition: string,
  season: string,
): string {
  const params = new URLSearchParams({ competition, season });
  return `/matches?${params.toString()}`;
}

export function buildMatchDetailPath(
  matchId: number,
  competition?: string | null,
  season?: string | null,
): string {
  const base = `/matches/${matchId}`;
  if (!competition || !season) {
    return base;
  }
  const params = new URLSearchParams({ competition, season });
  return `${base}?${params.toString()}`;
}

export function readCompetitionSeasonFromSearchParams(
  searchParams: URLSearchParams,
): { competition: string | null; season: string | null } {
  const competition = searchParams.get("competition")?.trim() || null;
  const season = searchParams.get("season")?.trim() || null;
  return { competition, season };
}