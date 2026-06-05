"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiFetchJson, ApiError } from "@/lib/api";
import { AUTH_ENABLED } from "@/lib/auth-config";
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
import { ArrowLeft, Copy, Mail } from "lucide-react";

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

const INVITE_ROLES = ["viewer", "analyst", "coach"] as const;

export default function WorkspaceManagePage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof INVITE_ROLES)[number]>("viewer");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: workspace, error: wsError, refetch } = useQuery<WorkspaceDetail>({
    queryKey: ["workspace", workspaceId],
    queryFn: () => apiFetchJson<WorkspaceDetail>(`/workspaces/${workspaceId}`),
    enabled: AUTH_ENABLED && Boolean(workspaceId),
  });

  const isAdmin = workspace?.role === "admin";

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
            Back
          </Link>
        </Button>
      </PageShell>
    );
  }

  if (!workspace) {
    return (
      <PageShell>
        <PageHeader title="Workspace" description="Loading…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Workspaces
          </Link>
        </Button>
      </div>

      <PageHeader
        title={workspace.name}
        description={`${workspace.slug} · your role: ${workspace.role}`}
      />

      <Card className="surface-card mb-8 border">
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {workspace.members.map((member) => (
              <li
                key={member.user_id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="text-foreground">
                  {member.display_name || member.email || member.user_id}
                </span>
                <Badge variant="secondary">{member.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {isAdmin ? (
        <>
          <Card className="surface-card mb-8 border">
            <CardHeader>
              <CardTitle className="text-base">Invite by email</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (email.trim()) inviteMutation.mutate();
                }}
              >
                <div className="min-w-0 flex-1">
                  <label htmlFor="invite-email" className="text-label mb-1.5 block">
                    Email
                  </label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@club.com"
                    required
                  />
                </div>
                <div className="w-full sm:w-36">
                  <label className="text-label mb-1.5 block">Role</label>
                  <Select
                    value={role}
                    onValueChange={(v) =>
                      setRole(v as (typeof INVITE_ROLES)[number])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVITE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={inviteMutation.isPending || !email.trim()}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {inviteMutation.isPending ? "Sending…" : "Create invite"}
                </Button>
              </form>
              {inviteMutation.error && (
                <p className="text-caption mt-2 text-destructive">
                  {inviteMutation.error instanceof ApiError
                    ? inviteMutation.error.message
                    : "Could not create invitation."}
                </p>
              )}
              <p className="text-caption mt-3 text-muted-foreground">
                Share the invite link with your colleague. They must sign in with
                the same email address.
              </p>
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
                    No pending invitations.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {invitations.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{inv.email}</p>
                          <p className="text-caption">{inv.role}</p>
                        </div>
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
                            className="text-destructive"
                            disabled={revokeMutation.isPending}
                            onClick={() => revokeMutation.mutate(inv.id)}
                          >
                            Revoke
                          </Button>
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
        <p className="text-caption text-muted-foreground">
          Only workspace admins can invite members.
        </p>
      )}
    </PageShell>
  );
}