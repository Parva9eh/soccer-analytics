import logging
from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from postgrest.exceptions import APIError
from supabase import Client

from core.auth import AuthUser
from core.deps import get_current_user_required, get_user_supabase
from core.supabase_errors import raise_for_supabase_error
from core.workspace_context import (
    resolve_active_workspace_id,
    try_resolve_active_workspace_id,
)
from schemas.analysis import (
    SavedAnalysisCreate,
    SavedAnalysisResponse,
    SavedAnalysisUpdate,
)
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analyses", tags=["Analyses"])


def _match_label(supabase: Client, match_id: int | None) -> str | None:
    if match_id is None:
        return None
    try:
        result = (
            supabase.table("matches")
            .select(
                "home_team:teams!home_team_id(name), "
                "away_team:teams!away_team_id(name)"
            )
            .eq("id", match_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        row = result.data[0]
        home = (row.get("home_team") or {}).get("name") or "Home"
        away = (row.get("away_team") or {}).get("name") or "Away"
        return f"{home} vs {away}"
    except Exception:
        logger.debug("Match label lookup failed for %s", match_id)
        return None


def _row_to_response(supabase: Client, row: dict[str, Any]) -> SavedAnalysisResponse:
    match_id = row.get("match_id")
    return SavedAnalysisResponse(
        id=row["id"],
        workspace_id=row["workspace_id"],
        match_id=match_id,
        title=row["title"],
        notes=row.get("notes"),
        config=row.get("config") or {},
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        match_label=_match_label(supabase, match_id),
    )


def _verify_match_access(supabase: Client, match_id: int) -> None:
    result = (
        supabase.table("matches")
        .select("id")
        .eq("id", match_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise_http_exception(
            status_code=404,
            detail="Match not found in the active workspace",
            code=ErrorCode.MATCH_NOT_FOUND,
        )


@router.get(
    "/",
    response_model=List[SavedAnalysisResponse],
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def list_saved_analyses(
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> List[SavedAnalysisResponse]:
    """List the current user's saved analyses in the active workspace."""
    try:
        workspace_id = try_resolve_active_workspace_id(supabase, user.id)
        if workspace_id is None:
            return []
        result = (
            supabase.table("saved_analyses")
            .select(
                "id, workspace_id, match_id, title, notes, config, created_at, updated_at"
            )
            .eq("workspace_id", workspace_id)
            .eq("created_by", user.id)
            .order("updated_at", desc=True)
            .execute()
        )
        return [_row_to_response(supabase, row) for row in result.data or []]
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list saved analyses",
            log_context="list_saved_analyses",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list saved analyses",
            log_context="list_saved_analyses",
        )


@router.post(
    "/",
    response_model=SavedAnalysisResponse,
    status_code=201,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def create_saved_analysis(
    body: SavedAnalysisCreate,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> SavedAnalysisResponse:
    """Save a private analysis view in the active workspace."""
    try:
        workspace_id = resolve_active_workspace_id(supabase, user.id)
        if body.match_id is not None:
            _verify_match_access(supabase, body.match_id)

        inserted = (
            supabase.table("saved_analyses")
            .insert(
                {
                    "workspace_id": workspace_id,
                    "created_by": user.id,
                    "match_id": body.match_id,
                    "title": body.title,
                    "notes": body.notes,
                    "config": body.config.model_dump(),
                }
            )
            .execute()
        )
        if not inserted.data:
            raise_http_exception(
                status_code=500,
                detail="Failed to save analysis",
                code=ErrorCode.INTERNAL_SERVER_ERROR,
            )
        return _row_to_response(supabase, inserted.data[0])
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to save analysis",
            log_context="create_saved_analysis",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to save analysis",
            log_context="create_saved_analysis",
        )


@router.get(
    "/{analysis_id}",
    response_model=SavedAnalysisResponse,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def get_saved_analysis(
    analysis_id: UUID,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> SavedAnalysisResponse:
    """Get one saved analysis owned by the current user."""
    try:
        result = (
            supabase.table("saved_analyses")
            .select(
                "id, workspace_id, match_id, title, notes, config, created_at, updated_at"
            )
            .eq("id", str(analysis_id))
            .eq("created_by", user.id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise_http_exception(
                status_code=404,
                detail="Saved analysis not found",
                code=ErrorCode.NOT_FOUND,
            )
        return _row_to_response(supabase, result.data[0])
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to fetch saved analysis",
            log_context="get_saved_analysis",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to fetch saved analysis",
            log_context="get_saved_analysis",
        )


@router.patch(
    "/{analysis_id}",
    response_model=SavedAnalysisResponse,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def update_saved_analysis(
    analysis_id: UUID,
    body: SavedAnalysisUpdate,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> SavedAnalysisResponse:
    """Update a saved analysis owned by the current user."""
    try:
        payload: dict[str, Any] = {}
        if body.title is not None:
            payload["title"] = body.title
        if "notes" in body.model_fields_set:
            payload["notes"] = body.notes
        if body.config is not None:
            payload["config"] = body.config.model_dump()

        if not payload:
            return get_saved_analysis(analysis_id, user, supabase)

        result = (
            supabase.table("saved_analyses")
            .update(payload)
            .eq("id", str(analysis_id))
            .eq("created_by", user.id)
            .execute()
        )
        if not result.data:
            raise_http_exception(
                status_code=404,
                detail="Saved analysis not found",
                code=ErrorCode.NOT_FOUND,
            )
        return _row_to_response(supabase, result.data[0])
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to update saved analysis",
            log_context="update_saved_analysis",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to update saved analysis",
            log_context="update_saved_analysis",
        )


@router.delete(
    "/{analysis_id}",
    status_code=204,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def delete_saved_analysis(
    analysis_id: UUID,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> None:
    """Delete a saved analysis owned by the current user."""
    try:
        result = (
            supabase.table("saved_analyses")
            .delete()
            .eq("id", str(analysis_id))
            .eq("created_by", user.id)
            .execute()
        )
        if not result.data:
            raise_http_exception(
                status_code=404,
                detail="Saved analysis not found",
                code=ErrorCode.NOT_FOUND,
            )
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to delete saved analysis",
            log_context="delete_saved_analysis",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to delete saved analysis",
            log_context="delete_saved_analysis",
        )