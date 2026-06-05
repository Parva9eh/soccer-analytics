"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetchJson } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
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

interface AuthMe {
  active_workspace_id: string | null;
  active_workspace_name: string | null;
}

export function SidebarWorkspace() {
  const queryClient = useQueryClient();

  const { data: workspaces, isLoading: workspacesLoading } = useQuery<
    Workspace[]
  >({
    queryKey: ["workspaces"],
    queryFn: () => apiFetchJson<Workspace[]>("/workspaces/"),
    enabled: AUTH_ENABLED,
  });

  const { data: me, isLoading: meLoading } = useQuery<AuthMe>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetchJson<AuthMe>("/auth/me"),
    enabled: AUTH_ENABLED,
  });

  const setActive = useMutation({
    mutationFn: (workspaceId: string) =>
      apiFetchJson<AuthMe>("/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_workspace_id: workspaceId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-me"] });
    },
  });

  if (!AUTH_ENABLED || workspacesLoading || meLoading) {
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