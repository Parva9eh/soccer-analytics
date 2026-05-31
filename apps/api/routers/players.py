import logging

from fastapi import APIRouter, Depends, Query
from supabase import Client
from typing import Optional

from core.supabase_client import get_supabase
from schemas.params import LimitParams
from schemas.error import COMMON_ERROR_RESPONSES, raise_http_exception, ErrorCode

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/players", tags=["Players"])


@router.get(
    "/",
    responses=COMMON_ERROR_RESPONSES,
)
def get_players(
    supabase: Client = Depends(get_supabase),
    limit_params: LimitParams = Depends(),
    search: Optional[str] = Query(None, description="Search players by name"),
):
    """Get list of players with optional name search and limit."""
    try:
        query = supabase.table("players").select(
            "statsbomb_player_id, name, position, jersey_number, nationality"
        )

        if search:
            query = query.ilike("name", f"%{search}%")

        response = query.limit(limit_params.limit).execute()

        players = response.data or []

        # Normalize id for frontend convenience
        for p in players:
            p["id"] = p.pop("statsbomb_player_id", None)

        return players

    except Exception:
        logger.exception("Error fetching players")
        raise_http_exception(
            status_code=500,
            detail="Failed to fetch players",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )
