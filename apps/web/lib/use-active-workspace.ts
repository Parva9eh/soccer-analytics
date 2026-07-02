"use client";

import { useDataScope } from "@/lib/use-data-scope";

/** Active workspace id for signed-in users (undefined for guests or when auth is off). */
export function useActiveWorkspaceId(): string | undefined {
  const { workspaceId } = useDataScope();
  return workspaceId;
}