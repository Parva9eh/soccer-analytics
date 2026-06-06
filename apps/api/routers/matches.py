import logging

from fastapi import APIRouter, Query, Depends
from typing import List, Optional
from supabase import Client

from core.supabase_client import get_supabase_public_read
from schemas.match import MatchResponse
from schemas.params import MatchListParams
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.get(
    "/",
    response_model=List[MatchResponse],
    responses=COMMON_ERROR_RESPONSES,
)
def get_matches(
    supabase: Client = Depends(get_supabase_public_read),
    filters: MatchListParams = Depends()
) -> List[MatchResponse]:
    """Get list of matches with team names."""
    try:
        query = supabase.table("matches").select(
            "id, match_date, home_score, away_score, match_week, home_team_id, away_team_id, "
            "home_team:teams!home_team_id(name), "
            "away_team:teams!away_team_id(name)"
        )

        comp_name = None
        season_name = None

        if filters.competition:
            comp_result = supabase.table("competitions").select("id").eq("name", filters.competition).execute()
            if comp_result.data:
                comp_id = comp_result.data[0]["id"]
                comp_name = filters.competition
                query = query.eq("competition_id", comp_id)

        if filters.season:
            season_result = supabase.table("seasons").select("id").eq("year", filters.season).execute()
            if season_result.data:
                season_id = season_result.data[0]["id"]
                season_name = filters.season
                query = query.eq("season_id", season_id)

        response = query.limit(filters.limit).execute()
        matches_data = response.data or []

        result = []
        for m in matches_data:
            home_team = m.get("home_team") or {}
            away_team = m.get("away_team") or {}

            result.append(
                MatchResponse(
                    id=m["id"],
                    match_date=m["match_date"],
                    home_score=m.get("home_score"),
                    away_score=m.get("away_score"),
                    match_week=m.get("match_week"),
                    home_team=home_team.get("name"),
                    away_team=away_team.get("name"),
                    competition=comp_name,
                    season=season_name,
                )
            )
        return result

    except Exception:
        logger.exception("Error in get_matches")
        raise_http_exception(
            status_code=500,
            detail="Failed to fetch matches",
            code=ErrorCode.INTERNAL_SERVER_ERROR
        )


@router.get(
    "/{match_id}",
    response_model=MatchResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_match(
    match_id: int, supabase: Client = Depends(get_supabase_public_read)
) -> MatchResponse:
    """Get a single match by ID."""
    try:
        response = (
            supabase.table("matches")
            .select(
                "id, match_date, home_score, away_score, match_week, home_team_id, away_team_id, "
                "home_team:teams!home_team_id(name), "
                "away_team:teams!away_team_id(name)"
            )
            .eq("id", match_id)
            .single()
            .execute()
        )

        if not response.data:
            raise_http_exception(
                status_code=404,
                detail="Match not found",
                code=ErrorCode.NOT_FOUND
            )

        m = response.data
        home_team = m.get("home_team") or {}
        away_team = m.get("away_team") or {}

        return MatchResponse(
            id=m["id"],
            match_date=m["match_date"],
            home_score=m.get("home_score"),
            away_score=m.get("away_score"),
            match_week=m.get("match_week"),
            home_team=home_team.get("name"),
            away_team=away_team.get("name"),
            competition=None,
            season=None,
        )

    except Exception:
        logger.exception("Error in get_match")
        raise_http_exception(
            status_code=500,
            detail="Failed to fetch match",
            code=ErrorCode.INTERNAL_SERVER_ERROR
        )