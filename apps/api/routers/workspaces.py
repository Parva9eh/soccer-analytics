import logging
import re
from datetime import datetime
from typing import List, Tuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError
from supabase import Client

from core.deps import get_current_user_required, get_user_supabase
from core.auth import AuthUser
from core.workspace_access import require_workspace_admin, require_workspace_member
from services.workspaces import list_user_workspaces
from core.supabase_client import get_supabase_service_client
from core.supabase_errors import raise_for_supabase_error
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception
from schemas.workspace import (
    WorkspaceCreate,
    WorkspaceDatasetCreate,
    WorkspaceDatasetResponse,
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


def _resolve_competition_season(
    competition_name: str,
    season_year: str,
) -> Tuple[int, int, str, str]:
    """Resolve names via service role — competitions are global reference data."""
    supabase = get_supabase_service_client()
    comp_resp = (
        supabase.table("competitions")
        .select("id, name")
        .eq("name", competition_name.strip())
        .limit(1)
        .execute()
    )
    if not comp_resp.data:
        raise_http_exception(
            status_code=404,
            detail=f"Competition '{competition_name}' not found",
            code=ErrorCode.NOT_FOUND,
        )

    comp = comp_resp.data[0]
    comp_id = comp["id"]

    season_resp = (
        supabase.table("seasons")
        .select("id, year")
        .eq("competition_id", comp_id)
        .eq("year", season_year.strip())
        .limit(1)
        .execute()
    )
    if not season_resp.data:
        raise_http_exception(
            status_code=404,
            detail=f"Season '{season_year}' not found for {competition_name}",
            code=ErrorCode.NOT_FOUND,
        )

    season = season_resp.data[0]
    return comp_id, season["id"], comp["name"], season["year"]


def _dataset_rows_to_response(rows: list[dict]) -> list[WorkspaceDatasetResponse]:
    if not rows:
        return []

    lookup = get_supabase_service_client()
    comp_ids = {row["competition_id"] for row in rows}
    season_ids = {row["season_id"] for row in rows}

    comp_map: dict[int, str] = {}
    if comp_ids:
        comp_resp = (
            lookup.table("competitions")
            .select("id, name")
            .in_("id", list(comp_ids))
            .execute()
        )
        comp_map = {row["id"]: row["name"] for row in comp_resp.data or []}

    season_map: dict[int, str] = {}
    if season_ids:
        season_resp = (
            lookup.table("seasons")
            .select("id, year")
            .in_("id", list(season_ids))
            .execute()
        )
        season_map = {row["id"]: row["year"] for row in season_resp.data or []}

    results: list[WorkspaceDatasetResponse] = []
    for row in rows:
        comp_id = row["competition_id"]
        season_id = row["season_id"]
        results.append(
            WorkspaceDatasetResponse(
                competition_id=comp_id,
                season_id=season_id,
                competition=comp_map.get(comp_id, "Unknown"),
                season=season_map.get(season_id, "Unknown"),
                added_at=row.get("added_at") or datetime.min,
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
        return list_user_workspaces(supabase, user.id)
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


@router.get(
    "/{workspace_id}/datasets",
    response_model=List[WorkspaceDatasetResponse],
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def list_workspace_datasets(
    workspace_id: UUID,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> List[WorkspaceDatasetResponse]:
    """List competition/season datasets linked to a workspace."""
    ws_id = str(workspace_id)
    try:
        require_workspace_member(supabase, user.id, ws_id)
        result = (
            supabase.table("workspace_datasets")
            .select("competition_id, season_id, added_at")
            .eq("workspace_id", ws_id)
            .order("added_at")
            .execute()
        )
        return _dataset_rows_to_response(result.data or [])

    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list workspace datasets",
            log_context="list_workspace_datasets",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list workspace datasets",
            log_context="list_workspace_datasets",
        )


@router.post(
    "/{workspace_id}/datasets",
    response_model=WorkspaceDatasetResponse,
    status_code=201,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def add_workspace_dataset(
    workspace_id: UUID,
    body: WorkspaceDatasetCreate,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> WorkspaceDatasetResponse:
    """Link a competition season to a workspace (admins only)."""
    ws_id = str(workspace_id)
    try:
        require_workspace_admin(supabase, user.id, ws_id)
        comp_id, season_id, comp_name, season_year = _resolve_competition_season(
            body.competition,
            body.season,
        )

        inserted = (
            supabase.table("workspace_datasets")
            .insert(
                {
                    "workspace_id": ws_id,
                    "competition_id": comp_id,
                    "season_id": season_id,
                    "added_by": user.id,
                }
            )
            .execute()
        )
        if not inserted.data:
            raise_http_exception(
                status_code=500,
                detail="Failed to add dataset",
                code=ErrorCode.INTERNAL_SERVER_ERROR,
            )

        row = inserted.data[0]
        return WorkspaceDatasetResponse(
            competition_id=comp_id,
            season_id=season_id,
            competition=comp_name,
            season=season_year,
            added_at=row.get("added_at") or datetime.utcnow(),
        )

    except HTTPException:
        raise
    except APIError as exc:
        if exc.code == "23505":
            raise_http_exception(
                status_code=409,
                detail="This competition and season is already linked to the workspace",
                code=ErrorCode.CONFLICT,
            )
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to add workspace dataset",
            log_context="add_workspace_dataset",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to add workspace dataset",
            log_context="add_workspace_dataset",
        )


@router.delete(
    "/{workspace_id}/datasets/{competition_id}/{season_id}",
    status_code=204,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def remove_workspace_dataset(
    workspace_id: UUID,
    competition_id: int,
    season_id: int,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> None:
    """Remove a competition/season link from a workspace (admins only)."""
    ws_id = str(workspace_id)
    try:
        require_workspace_admin(supabase, user.id, ws_id)
        result = (
            supabase.table("workspace_datasets")
            .delete()
            .eq("workspace_id", ws_id)
            .eq("competition_id", competition_id)
            .eq("season_id", season_id)
            .execute()
        )
        if not result.data:
            raise_http_exception(
                status_code=404,
                detail="Dataset not found in this workspace",
                code=ErrorCode.NOT_FOUND,
            )

    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to remove workspace dataset",
            log_context="remove_workspace_dataset",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to remove workspace dataset",
            log_context="remove_workspace_dataset",
        )