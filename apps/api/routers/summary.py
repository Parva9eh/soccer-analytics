"""RLS-scoped dataset totals for dashboard and analytics headers."""

import logging
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, Header
from supabase import Client

from core.auth import _extract_bearer
from core.supabase_client import get_supabase_public_read
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summary", tags=["Summary"])

_MAX_MATCHES = 2000
_EVENT_COUNT_CHUNK = 50


def _normalize_rpc_row(data: Any) -> dict[str, Any]:
    if isinstance(data, list):
        row = data[0] if data else {}
    elif isinstance(data, dict):
        row = data
    else:
        row = {}
    return row if isinstance(row, dict) else {}


def _summary_from_workspace_snapshot(supabase: Client) -> dict[str, Any] | None:
    """Signed-in: one RPC scoped to active workspace datasets."""
    result = supabase.rpc(
        "workspace_report_snapshot",
        {"p_competition": None, "p_season": None},
    ).execute()
    row = _normalize_rpc_row(result.data)
    if not row:
        return None
    summary = {
        "total_matches": int(row.get("total_matches") or 0),
        "total_events": int(row.get("total_events") or 0),
        "total_players": 0,
        "status": "healthy",
    }
    try:
        summary["total_players"] = (
            supabase.table("players")
            .select("id", count="exact")
            .limit(0)
            .execute()
            .count
            or 0
        )
    except Exception:
        logger.debug("players count skipped after workspace snapshot", exc_info=True)
    return summary


def _summary_from_data_snapshot(supabase: Client) -> dict[str, Any] | None:
    """Guest or fallback: single SQL join count (migration 20250702190000)."""
    result = supabase.rpc("data_summary_snapshot").execute()
    row = _normalize_rpc_row(result.data)
    if not row:
        return None
    return {
        "total_matches": int(row.get("total_matches") or 0),
        "total_events": int(row.get("total_events") or 0),
        "total_players": int(row.get("total_players") or 0),
        "status": row.get("status") or "healthy",
    }


def _accessible_match_ids(supabase: Client) -> list[int]:
    rows = (
        supabase.table("matches")
        .select("id")
        .limit(_MAX_MATCHES)
        .execute()
    ).data or []
    return [row["id"] for row in rows if row.get("id") is not None]


def _count_events_for_matches(supabase: Client, match_ids: list[int]) -> int:
    if not match_ids:
        return 0

    total = 0
    for start in range(0, len(match_ids), _EVENT_COUNT_CHUNK):
        chunk = match_ids[start : start + _EVENT_COUNT_CHUNK]
        response = (
            supabase.table("events")
            .select("id", count="exact")
            .in_("match_id", chunk)
            .execute()
        )
        total += response.count or 0
    return total


def _summary_from_match_chunks(supabase: Client) -> dict[str, Any]:
    """Last resort when RPC migrations are not applied yet."""
    match_ids = _accessible_match_ids(supabase)
    players_count = 0
    try:
        players_count = (
            supabase.table("players")
            .select("id", count="exact")
            .limit(0)
            .execute()
            .count
            or 0
        )
    except Exception:
        logger.debug("players summary count skipped", exc_info=True)

    return {
        "total_matches": len(match_ids),
        "total_events": _count_events_for_matches(supabase, match_ids),
        "total_players": players_count,
        "status": "healthy",
    }


def _build_summary(supabase: Client, *, has_user_token: bool) -> dict[str, Any]:
    if has_user_token:
        try:
            workspace_summary = _summary_from_workspace_snapshot(supabase)
            if workspace_summary is not None:
                return workspace_summary
        except Exception:
            logger.warning(
                "workspace_report_snapshot failed; trying fallbacks",
                exc_info=True,
            )

    try:
        data_summary = _summary_from_data_snapshot(supabase)
        if data_summary is not None:
            return data_summary
    except Exception:
        logger.debug("data_summary_snapshot unavailable", exc_info=True)

    return _summary_from_match_chunks(supabase)


@router.get(
    "/",
    responses=COMMON_ERROR_RESPONSES,
)
def get_summary(
    supabase: Client = Depends(get_supabase_public_read),
    authorization: Annotated[Optional[str], Header()] = None,
):
    """Get high-level summary of loaded data visible to the caller (RLS-scoped)."""
    try:
        has_user_token = _extract_bearer(authorization) is not None
        return _build_summary(supabase, has_user_token=has_user_token)
    except Exception:
        logger.exception("Failed to generate summary")
        raise_http_exception(
            status_code=500,
            detail="Failed to generate summary",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )