import logging

from fastapi import APIRouter, Query, HTTPException, Depends
from typing import List, Optional
from supabase import Client

from core.supabase_client import get_supabase
from schemas.match import MatchResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matches", tags=["Matches"])


def _get_team_names(supabase: Client, team_ids: List[int]) -> dict:
    """Fetch team names safely."""
    if not team_ids:
        return {}
    try:
        response = supabase.table("teams").select("id, name").in_("id", team_ids).execute()
        return {team["id"]: team["name"] for team in (response.data or [])}
    except Exception:
        logger.exception("Error fetching team names")
        return {}


@router.get("/", response_model=List[MatchResponse])
def get_matches(
    supabase: Client = Depends(get_supabase),
    competition: Optional[str] = None,
    season: Optional[str] = None,
    limit: int = Query(50, le=200)
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

        if competition:
            comp_result = supabase.table("competitions").select("id").eq("name", competition).execute()
            if comp_result.data:
                comp_id = comp_result.data[0]["id"]
                comp_name = competition
                query = query.eq("competition_id", comp_id)

        if season:
            season_result = supabase.table("seasons").select("id").eq("year", season).execute()
            if season_result.data:
                season_id = season_result.data[0]["id"]
                season_name = season
                query = query.eq("season_id", season_id)

        response = query.limit(limit).execute()
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
        raise HTTPException(status_code=500, detail="Failed to fetch matches")


@router.get("/{match_id}", response_model=MatchResponse)
def get_match(match_id: int, supabase: Client = Depends(get_supabase)) -> MatchResponse:
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
            raise HTTPException(status_code=404, detail="Match not found")

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

    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in get_match")
        raise HTTPException(status_code=500, detail="Failed to fetch match")