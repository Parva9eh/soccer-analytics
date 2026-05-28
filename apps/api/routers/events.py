from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from supabase import Client

from core.supabase_client import get_supabase
from schemas.event import EventListResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/", response_model=EventListResponse)
def get_events(
    supabase: Client = Depends(get_supabase),
    match_id: int = Query(..., description="Database match ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type (e.g. Pass, Shot)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, le=500)
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

    except Exception as e:
        print(f"[Events] Error in get_events: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch events")