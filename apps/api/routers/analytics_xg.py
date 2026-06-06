import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from analytics.xg import (
    is_goal_outcome,
    shot_outcome,
    shot_team_name,
    shot_xg_from_details,
)
from core.supabase_client import get_supabase_public_read
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception
from schemas.xg import MatchXgResponse, SeasonXgResponse, TeamXgSummary

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/xg", tags=["Analytics"])


def _empty_team_summary(team: str) -> TeamXgSummary:
    return TeamXgSummary(team=team, shots=0, goals=0, xg=0.0)


def _accumulate_shot(
    summaries: dict[str, TeamXgSummary],
    team_name: str | None,
    xg: float | None,
    outcome: str | None,
) -> None:
    if not team_name:
        return
    entry = summaries.get(team_name)
    if entry is None:
        entry = _empty_team_summary(team_name)
        summaries[team_name] = entry
    entry.shots += 1
    if xg is not None:
        entry.xg = round(entry.xg + xg, 4)
    if is_goal_outcome(outcome):
        entry.goals += 1


def _resolve_match_teams(
    supabase: Client, match_id: int
) -> tuple[str, str, dict[str, Any] | None]:
    result = (
        supabase.table("matches")
        .select(
            "id, home_score, away_score, "
            "home_team:teams!home_team_id(name), "
            "away_team:teams!away_team_id(name)"
        )
        .eq("id", match_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise_http_exception(
            status_code=404,
            detail="Match not found",
            code=ErrorCode.MATCH_NOT_FOUND,
        )
    row = result.data[0]
    home = (row.get("home_team") or {}).get("name") or "Home"
    away = (row.get("away_team") or {}).get("name") or "Away"
    return home, away, row


def _match_ids_for_season(
    supabase: Client, competition: str, season: str
) -> list[int]:
    comp = (
        supabase.table("competitions")
        .select("id")
        .eq("name", competition)
        .limit(1)
        .execute()
    )
    if not comp.data:
        return []

    comp_id = comp.data[0]["id"]
    season_row = (
        supabase.table("seasons")
        .select("id")
        .eq("competition_id", comp_id)
        .eq("year", season)
        .limit(1)
        .execute()
    )
    if not season_row.data:
        return []

    season_id = season_row.data[0]["id"]
    matches = (
        supabase.table("matches")
        .select("id")
        .eq("competition_id", comp_id)
        .eq("season_id", season_id)
        .execute()
    )
    return [int(row["id"]) for row in matches.data or [] if row.get("id") is not None]


@router.get(
    "/matches/{match_id}",
    response_model=MatchXgResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_match_xg(
    match_id: int,
    supabase: Client = Depends(get_supabase_public_read),
) -> MatchXgResponse:
    """Expected goals summary for one match (StatsBomb shot xG from event details)."""
    try:
        home_team, away_team, _ = _resolve_match_teams(supabase, match_id)
        summaries = {
            home_team: _empty_team_summary(home_team),
            away_team: _empty_team_summary(away_team),
        }

        shots = (
            supabase.table("events")
            .select("details")
            .eq("match_id", match_id)
            .eq("event_type", "Shot")
            .execute()
        )

        for row in shots.data or []:
            details = row.get("details")
            _accumulate_shot(
                summaries,
                shot_team_name(details),
                shot_xg_from_details(details),
                shot_outcome(details),
            )

        return MatchXgResponse(
            match_id=match_id,
            home_team=home_team,
            away_team=away_team,
            home=summaries[home_team],
            away=summaries[away_team],
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to compute match xG for %s", match_id)
        raise_http_exception(
            status_code=500,
            detail="Failed to compute match expected goals",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/season",
    response_model=SeasonXgResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_season_xg(
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> SeasonXgResponse:
    """Aggregate expected goals for a competition season in the current data scope."""
    try:
        match_ids = _match_ids_for_season(supabase, competition, season)
        if not match_ids:
            return SeasonXgResponse(
                competition=competition,
                season=season,
                matches=0,
                total_shots=0,
                total_goals=0,
                total_xg=0.0,
                avg_xg_per_match=0.0,
            )

        shots = (
            supabase.table("events")
            .select("details")
            .eq("event_type", "Shot")
            .in_("match_id", match_ids)
            .execute()
        )

        total_shots = 0
        total_goals = 0
        total_xg = 0.0

        for row in shots.data or []:
            details = row.get("details")
            xg = shot_xg_from_details(details)
            outcome = shot_outcome(details)
            total_shots += 1
            if xg is not None:
                total_xg += xg
            if is_goal_outcome(outcome):
                total_goals += 1

        total_xg = round(total_xg, 2)
        avg = round(total_xg / len(match_ids), 2) if match_ids else 0.0

        return SeasonXgResponse(
            competition=competition,
            season=season,
            matches=len(match_ids),
            total_shots=total_shots,
            total_goals=total_goals,
            total_xg=total_xg,
            avg_xg_per_match=avg,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to compute season xG for %s %s", competition, season
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to compute season expected goals",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )