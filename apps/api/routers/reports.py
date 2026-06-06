import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from postgrest.exceptions import APIError
from supabase import Client
from uuid import UUID

from core.auth import AuthUser
from core.deps import get_current_user_required, get_user_supabase
from core.supabase_errors import raise_for_supabase_error
from core.workspace_context import resolve_active_workspace_id
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception
from schemas.report import (
    WorkspaceDashboardResponse,
    WorkspaceReportCreate,
    WorkspaceReportResponse,
    parse_dashboard_snapshot,
    snapshot_to_csv,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


def _fetch_snapshot(
    supabase: Client,
    competition: Optional[str],
    season: Optional[str],
) -> WorkspaceDashboardResponse:
    result = supabase.rpc(
        "workspace_report_snapshot",
        {
            "p_competition": competition,
            "p_season": season,
        },
    ).execute()
    raw = result.data
    if isinstance(raw, list):
        raw = raw[0] if raw else {}
    if not isinstance(raw, dict):
        raw = {}
    return parse_dashboard_snapshot(raw)


def _row_to_response(row: dict[str, Any]) -> WorkspaceReportResponse:
    snapshot_raw = row.get("snapshot") or {}
    return WorkspaceReportResponse(
        id=row["id"],
        workspace_id=row["workspace_id"],
        title=row["title"],
        notes=row.get("notes"),
        competition=row.get("competition"),
        season=row.get("season"),
        snapshot=parse_dashboard_snapshot(snapshot_raw),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get(
    "/dashboard",
    response_model=WorkspaceDashboardResponse,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def get_workspace_dashboard(
    competition: Optional[str] = Query(None),
    season: Optional[str] = Query(None),
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> WorkspaceDashboardResponse:
    """Live workspace dashboard metrics for the active workspace."""
    try:
        resolve_active_workspace_id(supabase, user.id)
        return _fetch_snapshot(supabase, competition, season)
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to load workspace dashboard",
            log_context="get_workspace_dashboard",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to load workspace dashboard",
            log_context="get_workspace_dashboard",
        )


@router.get(
    "/",
    response_model=List[WorkspaceReportResponse],
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def list_workspace_reports(
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> List[WorkspaceReportResponse]:
    """List saved reports for the current user in the active workspace."""
    try:
        workspace_id = resolve_active_workspace_id(supabase, user.id)
        result = (
            supabase.table("workspace_reports")
            .select(
                "id, workspace_id, title, notes, competition, season, snapshot, created_at, updated_at"
            )
            .eq("workspace_id", workspace_id)
            .eq("created_by", user.id)
            .order("updated_at", desc=True)
            .execute()
        )
        return [_row_to_response(row) for row in result.data or []]
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list reports",
            log_context="list_workspace_reports",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to list reports",
            log_context="list_workspace_reports",
        )


@router.post(
    "/",
    response_model=WorkspaceReportResponse,
    status_code=201,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def create_workspace_report(
    body: WorkspaceReportCreate,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> WorkspaceReportResponse:
    """Save a workspace report snapshot (private to the creator)."""
    try:
        workspace_id = resolve_active_workspace_id(supabase, user.id)
        snapshot = _fetch_snapshot(supabase, body.competition, body.season)

        inserted = (
            supabase.table("workspace_reports")
            .insert(
                {
                    "workspace_id": workspace_id,
                    "created_by": user.id,
                    "title": body.title,
                    "notes": body.notes,
                    "competition": body.competition,
                    "season": body.season,
                    "snapshot": snapshot.model_dump(mode="json"),
                }
            )
            .execute()
        )
        if not inserted.data:
            raise_http_exception(
                status_code=500,
                detail="Failed to save report",
                code=ErrorCode.INTERNAL_SERVER_ERROR,
            )
        return _row_to_response(inserted.data[0])
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to save report",
            log_context="create_workspace_report",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to save report",
            log_context="create_workspace_report",
        )


@router.get(
    "/{report_id}",
    response_model=WorkspaceReportResponse,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def get_workspace_report(
    report_id: UUID,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> WorkspaceReportResponse:
    """Get one saved report owned by the current user."""
    try:
        result = (
            supabase.table("workspace_reports")
            .select(
                "id, workspace_id, title, notes, competition, season, snapshot, created_at, updated_at"
            )
            .eq("id", str(report_id))
            .eq("created_by", user.id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise_http_exception(
                status_code=404,
                detail="Report not found",
                code=ErrorCode.NOT_FOUND,
            )
        return _row_to_response(result.data[0])
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to fetch report",
            log_context="get_workspace_report",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to fetch report",
            log_context="get_workspace_report",
        )


@router.get(
    "/{report_id}/export",
    response_class=PlainTextResponse,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def export_workspace_report_csv(
    report_id: UUID,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> PlainTextResponse:
    """Export a saved report as CSV."""
    report = get_workspace_report(report_id, user, supabase)
    csv_body = snapshot_to_csv(report.title, report.snapshot)
    filename = f"report-{report.id}.csv"
    return PlainTextResponse(
        content=csv_body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete(
    "/{report_id}",
    status_code=204,
    responses={401: COMMON_ERROR_RESPONSES[404], **COMMON_ERROR_RESPONSES},
)
def delete_workspace_report(
    report_id: UUID,
    user: AuthUser = Depends(get_current_user_required),
    supabase: Client = Depends(get_user_supabase),
) -> None:
    """Delete a saved report owned by the current user."""
    try:
        result = (
            supabase.table("workspace_reports")
            .delete()
            .eq("id", str(report_id))
            .eq("created_by", user.id)
            .execute()
        )
        if not result.data:
            raise_http_exception(
                status_code=404,
                detail="Report not found",
                code=ErrorCode.NOT_FOUND,
            )
    except HTTPException:
        raise
    except APIError as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to delete report",
            log_context="delete_workspace_report",
        )
    except Exception as exc:
        raise_for_supabase_error(
            exc,
            fallback_detail="Failed to delete report",
            log_context="delete_workspace_report",
        )