"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchJson, ApiError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
import { formatWorkspaceRole } from "@/lib/workspace-ui";
import {
  DEFAULT_COMPETITION,
  DEFAULT_SEASON,
} from "@/lib/competition-filter";
import { WORKSPACE_SCOPED_QUERY_PREFIXES } from "@/lib/workspace-data-queries";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkspaceManageSkeleton } from "@/components/settings/WorkspaceManageSkeleton";
import { ArrowLeft, Copy, Database, Info, Mail, Users } from "lucide-react";

interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  role: string;
  members: {
    user_id: string;
    role: string;
    display_name: string | null;
    email: string | null;
  }[];
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  invite_url: string | null;
}

interface WorkspaceDataset {
  competition_id: number;
  season_id: number;
  competition: string;
  season: string;
  added_at: string;
}

const INVITE_ROLES = [
  { value: "viewer", label: "Viewer", hint: "Read-only access" },
  { value: "analyst", label: "Analyst", hint: "Analysis workflows" },
  { value: "coach", label: "Coach", hint: "Coaching staff access" },
] as const;

export default function WorkspaceManagePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const queryClient = useQueryClient();
  const { session } = useAuthSession();
  const [email, setEmail] = useState("");
  const [datasetCompetition, setDatasetCompetition] = useState(
    DEFAULT_COMPETITION,
  );
  const [datasetSeason, setDatasetSeason] = useState(DEFAULT_SEASON);
  const [role, setRole] = useState<(typeof INVITE_ROLES)[number]["value"]>(
    "viewer",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function invalidateWorkspaceData() {
    for (const prefix of WORKSPACE_SCOPED_QUERY_PREFIXES) {
      queryClient.invalidateQueries({ queryKey: [prefix] });
    }
  }

  const signedInEmail = session?.user.email?.toLowerCase() ?? null;

  const { data: workspace, error: wsError, refetch } = useQuery<WorkspaceDetail>(
    {
      queryKey: ["workspace", workspaceId],
      queryFn: () => apiFetchJson<WorkspaceDetail>(`/workspaces/${workspaceId}`),
      enabled: AUTH_ENABLED && Boolean(workspaceId),
    },
  );

  const isAdmin = workspace?.role === "admin";

  const {
    data: datasets,
    error: datasetsError,
    refetch: refetchDatasets,
  } = useQuery<WorkspaceDataset[]>({
    queryKey: ["workspace-datasets", workspaceId],
    queryFn: () =>
      apiFetchJson<WorkspaceDataset[]>(`/workspaces/${workspaceId}/datasets`),
    enabled: AUTH_ENABLED && Boolean(workspaceId) && isAdmin,
  });

  const datasetMutation = useMutation({
    mutationFn: () =>
      apiFetchJson<WorkspaceDataset>(`/workspaces/${workspaceId}/datasets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competition: datasetCompetition.trim(),
          season: datasetSeason.trim(),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-datasets", workspaceId],
      });
      invalidateWorkspaceData();
    },
  });

  const removeDatasetMutation = useMutation({
    mutationFn: (dataset: WorkspaceDataset) =>
      apiFetch(
        `/workspaces/${workspaceId}/datasets/${dataset.competition_id}/${dataset.season_id}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-datasets", workspaceId],
      });
      invalidateWorkspaceData();
    },
  });

  const {
    data: invitations,
    error: invError,
    refetch: refetchInvitations,
  } = useQuery<Invitation[]>({
    queryKey: ["workspace-invitations", workspaceId],
    queryFn: () =>
      apiFetchJson<Invitation[]>(`/workspaces/${workspaceId}/invitations`),
    enabled: AUTH_ENABLED && Boolean(workspaceId) && isAdmin,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiFetchJson<Invitation>(`/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      }),
    onSuccess: () => {
      setEmail("");
      queryClient.invalidateQueries({
        queryKey: ["workspace-invitations", workspaceId],
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      apiFetch(`/workspaces/${workspaceId}/invitations/${invitationId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["workspace-invitations", workspaceId],
      });
    },
  });

  async function copyInviteLink(invitation: Invitation) {
    if (!invitation.invite_url) return;
    await navigator.clipboard.writeText(invitation.invite_url);
    setCopiedId(invitation.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (!AUTH_ENABLED) {
    return null;
  }

  if (wsError) {
    return (
      <PageShell>
        <PageHeader title="Workspace" />
        <QueryErrorState error={wsError} onRetry={() => refetch()} />
        <Button asChild variant="ghost" className="mt-4">
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to workspaces
          </Link>
        </Button>
      </PageShell>
    );
  }

  if (!workspace) {
    return <WorkspaceManageSkeleton />;
  }

  const selectedRoleMeta = INVITE_ROLES.find((r) => r.value === role);

  return (
    <PageShell>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All workspaces
          </Link>
        </Button>
      </div>

      <PageHeader title={workspace.name} />

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <code className="rounded-md border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {workspace.slug}
        </code>
        <Badge variant="secondary">{formatWorkspaceRole(workspace.role)}</Badge>
        <span className="text-caption text-muted-foreground">
          {workspace.members.length} member
          {workspace.members.length === 1 ? "" : "s"}
        </span>
      </div>

      <Card className="surface-card mb-6 border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {workspace.members.map((member) => (
              <li
                key={member.user_id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {member.display_name || "Member"}
                  </p>
                  {member.email && (
                    <p className="text-caption truncate">{member.email}</p>
                  )}
                </div>
                <Badge variant="outline">{formatWorkspaceRole(member.role)}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isAdmin ? (
        <>
          <Card className="surface-card mb-6 border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4 text-primary" />
                Data access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-caption text-muted-foreground">
                Members see matches and events for the competition seasons linked
                here. New workspaces start with La Liga 2020/21 when that data
                is loaded.
              </p>
              {datasetsError ? (
                <QueryErrorState
                  error={datasetsError}
                  title="Could not load datasets"
                  onRetry={() => refetchDatasets()}
                  compact
                />
              ) : !datasets?.length ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No datasets linked yet
                  </p>
                  <p className="text-caption mx-auto mt-1 max-w-md text-muted-foreground">
                    Add La Liga 2020/21 (or another loaded season) below. Until
                    then, matches and analytics stay empty for this workspace.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {datasets.map((dataset) => (
                    <li
                      key={`${dataset.competition_id}-${dataset.season_id}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {dataset.competition} · {dataset.season}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={removeDatasetMutation.isPending}
                        onClick={() => removeDatasetMutation.mutate(dataset)}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <form
                className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (datasetCompetition.trim() && datasetSeason.trim()) {
                    datasetMutation.mutate();
                  }
                }}
              >
                <div>
                  <label
                    htmlFor="dataset-competition"
                    className="text-label mb-1.5 block"
                  >
                    Competition
                  </label>
                  <Input
                    id="dataset-competition"
                    value={datasetCompetition}
                    onChange={(e) => setDatasetCompetition(e.target.value)}
                    placeholder="La Liga"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="dataset-season"
                    className="text-label mb-1.5 block"
                  >
                    Season
                  </label>
                  <Input
                    id="dataset-season"
                    value={datasetSeason}
                    onChange={(e) => setDatasetSeason(e.target.value)}
                    placeholder="2020/2021"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={
                    datasetMutation.isPending ||
                    !datasetCompetition.trim() ||
                    !datasetSeason.trim()
                  }
                >
                  {datasetMutation.isPending ? "Adding…" : "Add dataset"}
                </Button>
              </form>
              {datasetMutation.error && (
                <p className="text-caption text-destructive">
                  {datasetMutation.error instanceof ApiError
                    ? datasetMutation.error.message
                    : "Could not add dataset."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="surface-card mb-6 border border-primary/20 bg-primary/5">
            <CardContent className="flex gap-3 py-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-caption space-y-1.5 text-muted-foreground">
                <p>
                  Invite <strong className="text-foreground">any colleague&apos;s email</strong>{" "}
                  as Viewer, Analyst, or Coach. They must sign in with that
                  exact address to accept.
                </p>
                <p>
                  Admin access cannot be granted via invite (only you as creator).
                  Emails already in the member list—including yours—cannot be
                  invited again.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-card mb-6 border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Invite by email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) inviteMutation.mutate();
                }}
              >
                <div className="grid gap-4 sm:grid-cols-[1fr_11rem_auto] sm:items-end">
                  <div className="min-w-0">
                    <label htmlFor="invite-email" className="text-label mb-1.5 block">
                      Colleague&apos;s email
                    </label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@club.com"
                      autoComplete="email"
                      required
                    />
                    {signedInEmail &&
                      email.trim().toLowerCase() === signedInEmail && (
                        <p className="text-caption mt-1.5 text-amber-600 dark:text-amber-500">
                          You&apos;re already an admin in this workspace.
                        </p>
                      )}
                  </div>
                  <div>
                    <label htmlFor="invite-role" className="text-label mb-1.5 block">
                      Role
                    </label>
                    <Select
                      value={role}
                      onValueChange={(v) =>
                        setRole(v as (typeof INVITE_ROLES)[number]["value"])
                      }
                    >
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVITE_ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    className="sm:mb-0.5"
                    disabled={inviteMutation.isPending || !email.trim()}
                  >
                    {inviteMutation.isPending ? "Creating…" : "Create invite"}
                  </Button>
                </div>
                {selectedRoleMeta && (
                  <p className="text-caption text-muted-foreground">
                    {selectedRoleMeta.label}: {selectedRoleMeta.hint}
                  </p>
                )}
              </form>
              {inviteMutation.error && (
                <p className="text-caption mt-3 text-destructive">
                  {inviteMutation.error instanceof ApiError
                    ? inviteMutation.error.message
                    : "Could not create invitation."}
                </p>
              )}
              {inviteMutation.isSuccess && (
                <p className="text-caption mt-3 text-primary">
                  Invitation created — copy the link below and send it to your
                  colleague.
                </p>
              )}
            </CardContent>
          </Card>

          {invError ? (
            <QueryErrorState
              className="mb-6"
              error={invError}
              title="Could not load invitations"
              onRetry={() => refetchInvitations()}
              compact
            />
          ) : (
            <Card className="surface-card border">
              <CardHeader>
                <CardTitle className="text-base">Pending invitations</CardTitle>
              </CardHeader>
              <CardContent>
                {!invitations?.length ? (
                  <p className="text-caption text-muted-foreground">
                    No pending invitations. Create one above to get a shareable
                    link.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {invitations.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {inv.email}
                          </p>
                          <p className="text-caption text-muted-foreground">
                            {formatWorkspaceRole(inv.role)} · expires in 7 days
                          </p>
                        </div>
                        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:items-end">
                          {inv.invite_url && (
                            <Input
                              readOnly
                              value={inv.invite_url}
                              className="h-8 font-mono text-[11px]"
                              aria-label={`Invite link for ${inv.email}`}
                              onFocus={(e) => e.target.select()}
                            />
                          )}
                          <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => copyInviteLink(inv)}
                            disabled={!inv.invite_url}
                          >
                            <Copy className="mr-1.5 h-3.5 w-3.5" />
                            {copiedId === inv.id ? "Copied" : "Copy link"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(inv.id)}
                          >
                            Revoke
                          </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="surface-card border">
          <CardContent className="space-y-3 py-6">
            <p className="text-caption text-muted-foreground">
              You joined as{" "}
              <strong className="text-foreground">
                {formatWorkspaceRole(workspace.role)}
              </strong>
              . Use the sidebar to work in this workspace — match data and
              analysis use whichever workspace is active there.
            </p>
            <p className="text-caption text-muted-foreground">
              Only workspace admins can invite or remove members. Ask an admin
              if you need teammates added or your role changed.
            </p>
            <p className="text-caption text-muted-foreground">
              Need your own separate team space? Go to{" "}
              <Link href="/settings" className="text-primary hover:underline">
                Workspaces
              </Link>{" "}
              and use <strong className="text-foreground">Create workspace</strong>{" "}
              — you&apos;ll be admin of that new workspace.
            </p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}