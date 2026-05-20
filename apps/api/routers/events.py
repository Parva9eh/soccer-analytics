from fastapi import APIRouter, Query
from core.supabase_client import supabase
from schemas.event import EventListResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/", response_model=EventListResponse)
def get_events(
    match_id: int = Query(..., description="Database match ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, le=500)
) -> EventListResponse:
    """Get paginated events for a specific match with x/y coordinates."""

    # Total count
    count_response = (
        supabase.table("events")
        .select("id", count="exact")
        .eq("match_id", match_id)
        .execute()
    )
    total = count_response.count or 0

    # Paginated data
    offset = (page - 1) * page_size
    response = (
        supabase.table("events")
        .select("*")
        .eq("match_id", match_id)
        .order("minute")
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