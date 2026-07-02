import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import type { CompetitionCatalogItem } from "@/lib/competition-filter";
import { queryAwaitingData } from "@/lib/query-loading";
import { useDataScope } from "@/lib/use-data-scope";

export function useWorkspaceCatalog() {
  const { scopeReady, workspaceId } = useDataScope();
  const query = useQuery<CompetitionCatalogItem[]>({
    queryKey: ["competitions-catalog", workspaceId],
    queryFn: () => apiFetchJson<CompetitionCatalogItem[]>("/competitions/"),
    enabled: scopeReady,
    staleTime: 5 * 60 * 1000,
  });

  const catalogReady = scopeReady && !queryAwaitingData(scopeReady, query);
  const hasLinkedData = (query.data?.length ?? 0) > 0;

  return {
    catalog: query.data,
    catalogReady,
    hasLinkedData,
    isLoading: queryAwaitingData(scopeReady, query),
  };
}