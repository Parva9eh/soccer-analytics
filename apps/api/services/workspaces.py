"""Workspace listing helpers for auth + workspace routers."""

from __future__ import annotations

from supabase import Client

from schemas.workspace import WorkspaceResponse, WorkspaceRole


def list_user_workspaces(supabase: Client, user_id: str) -> list[WorkspaceResponse]:
    membership = (
        supabase.table("workspace_members")
        .select("workspace_id, role, workspaces(id, name, slug)")
        .eq("user_id", user_id)
        .execute()
    )
    rows = membership.data or []
    results: list[WorkspaceResponse] = []

    for row in rows:
        ws = row.get("workspaces") or {}
        ws_id = ws.get("id")
        if not ws_id:
            continue

        count_resp = (
            supabase.table("workspace_members")
            .select("user_id", count="exact")
            .eq("workspace_id", ws_id)
            .execute()
        )
        results.append(
            WorkspaceResponse(
                id=ws_id,
                name=ws["name"],
                slug=ws["slug"],
                role=WorkspaceRole(row["role"]),
                member_count=count_resp.count or 0,
            )
        )

    return results
