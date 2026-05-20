from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from core.supabase_client import supabase
from schemas.match import MatchResponse

router = APIRouter(prefix="/matches", tags=["Matches"])


def _safe_get(data: dict, key: str, subkey: str = None):
    """Safely get nested values from Supabase response."""
    if not data:
        return None
    value = data.get(key)
    if subkey and isinstance(value, dict):
        return value.get(subkey)
    return value


@router.get("/", response_model=List[MatchResponse])
def get_matches(
    competition: Optional[str] = None,
    season: Optional[str] = None,
    limit: int = Query(50, le=200)
) -> List[MatchResponse]:
    """
    Get list of matches with basic info.
    """
    try:
        query = supabase.table("matches").select(
            "id, match_date, home_score, away_score, match_week, "
            "home_team_id, away_team_id, competition_id, season_id"
        ).limit(limit)

        if competition:
            # We can filter later if needed. For now keep simple.
            pass
        if season:
            pass

        response = query.execute()

        matches = []
        for m in response.data or []:
            matches.append(
                MatchResponse(
                    id=m["id"],
                    match_date=m["match_date"],
                    home_score=m.get("home_score"),
                    away_score=m.get("away_score"),
                    match_week=m.get("match_week"),
                    home_team=None,      # We'll enrich later if needed
                    away_team=None,
                    competition=None,
                    season=None,
                )
            )

        return matches

    except Exception as e:
        print(f"Error in get_matches: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch matches")


@router.get("/{match_id}", response_model=MatchResponse)
def get_match(match_id: int) -> MatchResponse:
    """
    Get a single match by ID.
    """
    try:
        response = (
            supabase.table("matches")
            .select(
                "id, match_date, home_score, away_score, match_week, "
                "home_team_id, away_team_id, competition_id, season_id"
            )
            .eq("id", match_id)
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Match not found")

        m = response.data

        return MatchResponse(
            id=m["id"],
            match_date=m["match_date"],
            home_score=m.get("home_score"),
            away_score=m.get("away_score"),
            match_week=m.get("match_week"),
            home_team=None,
            away_team=None,
            competition=None,
            season=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_match: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch match")