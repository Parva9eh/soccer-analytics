"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { COLLABORATION_QUERY_OPTIONS } from "@/lib/collaboration-queries";
import { useAuthMeQuery } from "@/lib/use-auth-me-query";
import { useCollaborationQueriesEnabled } from "@/lib/use-collaboration-queries-enabled";
import { WORKSPACE_SCOPED_QUERY_PREFIXES } from "@/lib/workspace-data-queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Workspace {
  id: string;
  name: string;
  slug: string;
}

export function SidebarWorkspace() {
  const queryClient = useQueryClient();
  const queriesEnabled = useCollaborationQueriesEnabled();
  const authMe = useAuthMeQuery();

  const {
    data: workspaces,
    isLoading: workspacesLoading,
    isError: workspacesError,
  } = useQuery<Workspace[]>({
    queryKey: ["workspaces"],
    queryFn: () => apiFetchJson<Workspace[]>("/workspaces/"),
    enabled: queriesEnabled && authMe.isSuccess,
    ...COLLABORATION_QUERY_OPTIONS,
  });

  const me = authMe.data;
  const meLoading = authMe.isLoading;

  const setActive = useMutation({
    mutationFn: (workspaceId: string) =>
      apiFetchJson("/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_workspace_id: workspaceId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
      for (const prefix of WORKSPACE_SCOPED_QUERY_PREFIXES) {
        queryClient.invalidateQueries({ queryKey: [prefix] });
      }
    },
  });

  if (!AUTH_ENABLED || workspacesLoading || meLoading || workspacesError) {
    return null;
  }

  if (!workspaces?.length) {
    return (
      <Link
        href="/settings"
        className="text-caption block px-1 text-muted-foreground hover:text-primary hover:underline"
      >
        Create a workspace
      </Link>
    );
  }

  const activeId =
    me?.active_workspace_id &&
    workspaces.some((w) => w.id === me.active_workspace_id)
      ? me.active_workspace_id
      : workspaces[0].id;

  const activeName =
    workspaces.find((w) => w.id === activeId)?.name ??
    me?.active_workspace_name ??
    "Workspace";

  return (
    <Select
      value={activeId}
      onValueChange={(id) => setActive.mutate(id)}
      disabled={setActive.isPending}
    >
      <SelectTrigger
        className="h-8 border-border bg-background text-xs"
        aria-label="Active workspace"
      >
        <SelectValue placeholder="Workspace">{activeName}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {workspaces.map((ws) => (
          <SelectItem key={ws.id} value={ws.id}>
            {ws.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}