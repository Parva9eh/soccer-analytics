import logging

from fastapi import APIRouter, Query, Depends
from typing import Optional
from supabase import Client

from core.supabase_client import get_supabase_public_read
from services.event_fetch import COLUMNS_LIST
from schemas.event import EventListResponse
from schemas.params import PaginationParams
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Events"])


@router.get(
    "/",
    response_model=EventListResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_events(
    supabase: Client = Depends(get_supabase_public_read),
    match_id: int = Query(..., description="Database match ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type (e.g. Pass, Shot)"),
    pagination: PaginationParams = Depends()
) -> EventListResponse:
    """Get paginated events for a match (projected columns, not select *)."""
    try:
        query = (
            supabase.table("events")
            .select(COLUMNS_LIST, count="exact")
            .eq("match_id", match_id)
        )

        if event_type:
            query = query.eq("event_type", event_type)

        offset = pagination.offset
        response = (
            query.order("minute")
            .order("second")
            .range(offset, offset + pagination.page_size - 1)
            .execute()
        )

        return EventListResponse(
            total=response.count or 0,
            page=pagination.page,
            page_size=pagination.page_size,
            events=response.data or [],
        )

    except Exception:
        logger.exception("Error in get_events")
        raise_http_exception(
            status_code=500,
            detail="Failed to fetch events",
            code=ErrorCode.INTERNAL_SERVER_ERROR
        )
