import logging

from fastapi import APIRouter, Depends
from supabase import Client

from core.supabase_client import get_supabase_public_read
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summary", tags=["Summary"])

_MATCH_PAGE_SIZE = 500
_MAX_MATCHES = 2000
_EVENT_COUNT_CHUNK = 100


def _accessible_match_ids(supabase: Client) -> list[int]:
    """RLS-scoped match ids (paginated for large seasons)."""
    ids: list[int] = []
    offset = 0

    while offset < _MAX_MATCHES:
        batch = (
            supabase.table("matches")
            .select("id")
            .range(offset, offset + _MATCH_PAGE_SIZE - 1)
            .execute()
        ).data or []
        if not batch:
            break

        ids.extend(row["id"] for row in batch if row.get("id") is not None)
        if len(batch) < _MATCH_PAGE_SIZE:
            break
        offset += _MATCH_PAGE_SIZE

    return ids


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


@router.get(
    "/",
    responses=COMMON_ERROR_RESPONSES,
)
def get_summary(supabase: Client = Depends(get_supabase_public_read)):
    """Get high-level summary of loaded data visible to the caller (RLS-scoped)."""
    try:
        match_ids = _accessible_match_ids(supabase)
        matches_count = len(match_ids)
        events_count = _count_events_for_matches(supabase, match_ids)

        players_response = (
            supabase.table("players").select("id", count="exact").limit(0).execute()
        )
        players_count = players_response.count or 0

        return {
            "total_matches": matches_count,
            "total_events": events_count,
            "total_players": players_count,
            "status": "healthy",
        }

    except Exception:
        logger.exception("Failed to generate summary")
        raise_http_exception(
            status_code=500,
            detail="Failed to generate summary",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )