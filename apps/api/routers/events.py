import logging

from fastapi import APIRouter, Query, Depends
from typing import Optional
from supabase import Client

from core.supabase_client import get_supabase
from schemas.event import EventListResponse
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Events"])


@router.get(
    "/",
    response_model=EventListResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_events(
    supabase: Client = Depends(get_supabase),
    match_id: int = Query(..., description="Database match ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type (e.g. Pass, Shot)"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(100, ge=1, le=500, description="Number of events per page")
) -> EventListResponse:
    """Get paginated events for a match, optionally filtered by event_type."""
    try:
        query = (
            supabase.table("events")
            .select("*", count="exact")
            .eq("match_id", match_id)
        )

        if event_type:
            query = query.eq("event_type", event_type)

        # Get total count
        count_response = query.execute()
        total = count_response.count or 0

        # Get paginated results
        offset = (page - 1) * page_size
        response = (
            query.order("minute")
            .order("second")
            .range(offset, offset + page_size - 1)
            .execute()
        )

        return EventListResponse(
            total=total,
            page=page,
            page_size=page_size,
            events=response.data or []
        )

    except Exception:
        logger.exception("Error in get_events")
        raise_http_exception(
            status_code=500,
            detail="Failed to fetch events",
            code=ErrorCode.INTERNAL_SERVER_ERROR
        )