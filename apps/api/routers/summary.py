"""RLS-scoped dataset totals for dashboard and analytics headers."""

import logging
from typing import Any

from fastapi import APIRouter, Depends
from supabase import Client

from core.supabase_client import get_supabase_public_read
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summary", tags=["Summary"])

_MAX_MATCHES = 2000


def _normalize_rpc_row(data: Any) -> dict[str, Any]:
    if isinstance(data, list):
        row = data[0] if data else {}
    elif isinstance(data, dict):
        row = data
    else:
        row = {}
    return row if isinstance(row, dict) else {}


def _summary_from_data_snapshot(supabase: Client) -> dict[str, Any] | None:
    """Single join-based SQL count (migration 20250702190000); RLS-scoped for anon + signed-in."""
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

    response = (
        supabase.table("events")
        .select("id", count="exact")
        .in_("match_id", match_ids)
        .execute()
    )
    return response.count or 0


def _summary_from_match_chunks(supabase: Client) -> dict[str, Any]:
    """Last resort when data_summary_snapshot migration is not applied yet."""
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


def _build_summary(supabase: Client) -> dict[str, Any]:
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
):
    """Get high-level summary of loaded data visible to the caller (RLS-scoped)."""
    try:
        return _build_summary(supabase)
    except Exception:
        logger.exception("Failed to generate summary")
        raise_http_exception(
            status_code=500,
            detail="Failed to generate summary",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )