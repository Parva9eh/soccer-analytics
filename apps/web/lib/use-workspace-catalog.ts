import { useQuery } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import type { CompetitionCatalogItem } from "@/lib/competition-filter";
import { useActiveWorkspaceId } from "@/lib/use-active-workspace";

export function useWorkspaceCatalog() {
  const workspaceId = useActiveWorkspaceId();
  const { data: catalog, isLoading, isFetching } = useQuery<
    CompetitionCatalogItem[]
  >({
    queryKey: ["competitions-catalog", workspaceId],
    queryFn: () => apiFetchJson<CompetitionCatalogItem[]>("/competitions/"),
    staleTime: 5 * 60 * 1000,
  });

  const catalogReady = !isLoading && !isFetching && catalog !== undefined;
  const hasLinkedData = (catalog?.length ?? 0) > 0;

  return { catalog, catalogReady, hasLinkedData, isLoading };
}