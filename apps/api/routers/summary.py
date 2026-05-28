import logging

from fastapi import APIRouter, HTTPException, Depends
from supabase import Client

from core.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summary", tags=["Summary"])


@router.get("/")
def get_summary(supabase: Client = Depends(get_supabase)):
    """Get high-level summary of loaded data."""
    try:
        matches_count = supabase.table("matches").select("id", count="exact").execute().count or 0
        events_count = supabase.table("events").select("id", count="exact").execute().count or 0
        players_count = supabase.table("players").select("id", count="exact").execute().count or 0

        return {
            "total_matches": matches_count,
            "total_events": events_count,
            "total_players": players_count,
            "status": "healthy"
        }

    except Exception:
        logger.exception("Failed to generate summary")
        raise HTTPException(status_code=500, detail="Failed to generate summary")