from fastapi import APIRouter, Query, HTTPException, Depends
from typing import List, Optional
from supabase import Client

from core.supabase_client import get_supabase
from schemas.match import MatchResponse

router = APIRouter(prefix="/matches", tags=["Matches"])


def _get_team_names(supabase: Client, team_ids: List[int]) -> dict:
    """Fetch team names safely."""
    if not team_ids:
        return {}
    try:
        response = supabase.table("teams").select("id, name").in_("id", team_ids).execute()
        return {team["id"]: team["name"] for team in (response.data or [])}
    except Exception as e:
        print(f"[Matches] Error fetching team names: {e}")
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
            "id, match_date, home_score, away_score, match_week, home_team_id, away_team_id"
        ).limit(limit)

        response = query.execute()
        matches_data = response.data or []

        team_ids = set()
        for m in matches_data:
            if m.get("home_team_id"):
                team_ids.add(m["home_team_id"])
            if m.get("away_team_id"):
                team_ids.add(m["away_team_id"])

        team_names = _get_team_names(supabase, list(team_ids))

        result = []
        for m in matches_data:
            result.append(
                MatchResponse(
                    id=m["id"],
                    match_date=m["match_date"],
                    home_score=m.get("home_score"),
                    away_score=m.get("away_score"),
                    match_week=m.get("match_week"),
                    home_team=team_names.get(m.get("home_team_id")),
                    away_team=team_names.get(m.get("away_team_id")),
                    competition=None,
                    season=None,
                )
            )
        return result

    except Exception as e:
        print(f"[Matches] Error in get_matches: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch matches")


@router.get("/{match_id}", response_model=MatchResponse)
def get_match(match_id: int, supabase: Client = Depends(get_supabase)) -> MatchResponse:
    """Get a single match by ID."""
    try:
        response = (
            supabase.table("matches")
            .select("id, match_date, home_score, away_score, match_week, home_team_id, away_team_id")
            .eq("id", match_id)
            .single()
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Match not found")

        m = response.data
        team_names = _get_team_names(supabase, [m.get("home_team_id"), m.get("away_team_id")])

        return MatchResponse(
            id=m["id"],
            match_date=m["match_date"],
            home_score=m.get("home_score"),
            away_score=m.get("away_score"),
            match_week=m.get("match_week"),
            home_team=team_names.get(m.get("home_team_id")),
            away_team=team_names.get(m.get("away_team_id")),
            competition=None,
            season=None,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Matches] Error in get_match: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch match")