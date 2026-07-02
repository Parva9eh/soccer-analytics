"""RLS-scoped dataset totals for dashboard and analytics headers."""

import logging
from typing import Any

from fastapi import APIRouter, Depends
from postgrest.exceptions import APIError as PostgrestAPIError
from supabase import Client

from core.supabase_client import get_supabase_public_read
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summary", tags=["Summary"])

_MISSING_RPC_CODE = "PGRST202"


def _normalize_rpc_row(data: Any) -> dict[str, Any]:
    if isinstance(data, list):
        row = data[0] if data else {}
    elif isinstance(data, dict):
        row = data
    else:
        row = {}
    return row if isinstance(row, dict) else {}


def _summary_from_data_snapshot(supabase: Client) -> dict[str, Any]:
    """Scoped SQL counts via data_summary_snapshot (migration 20250702200000)."""
    result = supabase.rpc("data_summary_snapshot").execute()
    row = _normalize_rpc_row(result.data)
    if not row:
        raise RuntimeError("data_summary_snapshot returned no data")
    return {
        "total_matches": int(row.get("total_matches") or 0),
        "total_events": int(row.get("total_events") or 0),
        "total_players": int(row.get("total_players") or 0),
        "status": row.get("status") or "healthy",
    }


def _is_missing_rpc_error(exc: BaseException) -> bool:
    if isinstance(exc, PostgrestAPIError) and getattr(exc, "code", None) == _MISSING_RPC_CODE:
        return True
    message = str(exc)
    return "data_summary_snapshot" in message and "does not exist" in message


@router.get(
    "/",
    responses=COMMON_ERROR_RESPONSES,
)
def get_summary(
    supabase: Client = Depends(get_supabase_public_read),
):
    """Get high-level summary of loaded data visible to the caller (RLS-scoped)."""
    try:
        return _summary_from_data_snapshot(supabase)
    except Exception as exc:
        if _is_missing_rpc_error(exc):
            logger.error("data_summary_snapshot RPC is not installed in Supabase")
            raise_http_exception(
                status_code=503,
                detail=(
                    "Summary service is not configured. "
                    "Apply supabase/migrations/20250702200000_data_summary_snapshot_scoped.sql "
                    "in the Supabase SQL Editor."
                ),
                code=ErrorCode.SERVICE_UNAVAILABLE,
            )
        logger.exception("Failed to generate summary")
        raise_http_exception(
            status_code=500,
            detail="Failed to generate summary",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )