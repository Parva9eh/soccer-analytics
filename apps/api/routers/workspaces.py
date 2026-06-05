import logging
import re
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError
from supabase import Client

from core.deps import get_current_user_required, get_user_supabase
from core.auth import AuthUser
from core.supabase_errors import raise_for_supabase_error
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception
from schemas.workspace import (
    WorkspaceCreate,
    WorkspaceDetailResponse,
    WorkspaceMemberResponse,
    WorkspaceResponse,
    WorkspaceRole,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:60] or "workspace"


def _list_user_workspaces(supabase: Client, user_id: str) -> list[WorkspaceResponse]:
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


@router.get(
    "/",
    response_model=List[WorkspaceResponse],
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def list_workspaces(
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> List[WorkspaceResponse]:
    """List workspaces the current user belongs to (empty list when none)."""
    try:
        return _list_user_workspaces(supabase, user.id)
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list workspaces",
            log_context="list_workspaces",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list workspaces",
            log_context="list_workspaces",
        )


@router.post(
    "/",
    response_model=WorkspaceResponse,
    status_code=201,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def create_workspace(
    body: WorkspaceCreate,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> WorkspaceResponse:
    """Create a workspace; creator becomes admin (via Supabase RPC)."""
    try:
        result = supabase.rpc(
            "create_workspace_for_user",
            {"p_name": body.name.strip()},
        ).execute()

        rows = result.data or []
        if not rows:
            raise_http_exception(
                status_code=500,
                detail="Failed to create workspace",
                code=ErrorCode.INTERNAL_SERVER_ERROR,
            )

        workspace = rows[0] if isinstance(rows, list) else rows
        ws_id = workspace["id"]

        return WorkspaceResponse(
            id=ws_id,
            name=workspace["name"],
            slug=workspace["slug"],
            role=WorkspaceRole.admin,
            member_count=1,
        )

    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to create workspace",
            log_context="create_workspace",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to create workspace",
            log_context="create_workspace",
        )


@router.get(
    "/{workspace_id}",
    response_model=WorkspaceDetailResponse,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def get_workspace(
    workspace_id: UUID,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> WorkspaceDetailResponse:
    """Workspace detail with members (must be a member)."""
    try:
        membership = (
            supabase.table("workspace_members")
            .select("role")
            .eq("workspace_id", str(workspace_id))
            .eq("user_id", user.id)
            .execute()
        )
        if not membership.data:
            raise_http_exception(
                status_code=404,
                detail="Workspace not found",
                code=ErrorCode.NOT_FOUND,
            )

        ws_resp = (
            supabase.table("workspaces")
            .select("id, name, slug")
            .eq("id", str(workspace_id))
            .single()
            .execute()
        )
        ws = ws_resp.data

        members_resp = (
            supabase.table("workspace_members")
            .select("user_id, role, profiles(display_name, email)")
            .eq("workspace_id", str(workspace_id))
            .execute()
        )

        members: list[WorkspaceMemberResponse] = []
        for m in members_resp.data or []:
            profile = m.get("profiles") or {}
            members.append(
                WorkspaceMemberResponse(
                    user_id=m["user_id"],
                    role=WorkspaceRole(m["role"]),
                    display_name=profile.get("display_name"),
                    email=profile.get("email"),
                )
            )

        return WorkspaceDetailResponse(
            id=ws["id"],
            name=ws["name"],
            slug=ws["slug"],
            role=WorkspaceRole(membership.data[0]["role"]),
            member_count=len(members),
            members=members,
        )

    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to fetch workspace",
            log_context="get_workspace",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to fetch workspace",
            log_context="get_workspace",
        )