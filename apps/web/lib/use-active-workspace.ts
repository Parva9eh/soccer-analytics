/** @deprecated Prefer `useDataScope().workspaceId` — kept for existing call sites. */
export { useDataScope as useActiveWorkspaceScope } from "@/lib/use-data-scope";

import { useDataScope } from "@/lib/use-data-scope";

/** Active workspace id for React Query keys (undefined while guest / loading). */
export function useActiveWorkspaceId(): string | undefined {
  return useDataScope().workspaceId;
}
