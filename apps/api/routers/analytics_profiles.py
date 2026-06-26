import logging
from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from analytics.passes import (
    infer_team_attacks_high_x,
    is_completed_pass,
    is_progressive_pass,
)
from analytics.players import event_player_id, event_player_name, event_team_name
from analytics.xg import is_goal_outcome, shot_outcome, shot_team_name, shot_xg_from_details
from core.supabase_client import get_supabase_public_read
from routers.analytics_possession import _aggregate_team_possession, _build_chains
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception
from schemas.profiles import (
    ComparePlayersResponse,
    CompareTeamsResponse,
    PlayerSeasonProfile,
    TeamSeasonProfile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/profiles", tags=["Analytics"])


def _season_match_ids(
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


def _season_match_rows(
    supabase: Client, competition: str, season: str
) -> list[dict[str, Any]]:
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
        .select(
            "id, home_score, away_score, "
            "home_team:teams!home_team_id(name), "
            "away_team:teams!away_team_id(name)"
        )
        .eq("competition_id", comp_id)
        .eq("season_id", season_id)
        .execute()
    )
    return matches.data or []


def _events_for_matches(
    supabase: Client, match_ids: list[int], event_type: str
) -> list[dict[str, Any]]:
    if not match_ids:
        return []
    result = (
        supabase.table("events")
        .select("match_id, x, end_x, event_type, details")
        .eq("event_type", event_type)
        .in_("match_id", match_ids)
        .execute()
    )
    return result.data or []


def _lookup_player(supabase: Client, player_id: int) -> dict[str, Any]:
    response = (
        supabase.table("players")
        .select("statsbomb_player_id, name")
        .eq("statsbomb_player_id", player_id)
        .limit(1)
        .execute()
    )
    if not response.data:
        raise_http_exception(
            status_code=404,
            detail="Player not found",
            code=ErrorCode.NOT_FOUND,
        )
    return response.data[0]


def _build_player_profile(
    player_id: int,
    player_name: str,
    competition: str,
    season: str,
    pass_rows: list[dict[str, Any]],
    shot_rows: list[dict[str, Any]],
) -> PlayerSeasonProfile:
    team_counts: Counter[str] = Counter()
    matches_seen: set[int] = set()
    shots = 0
    goals = 0
    xg = 0.0
    passes = 0
    completed = 0
    progressive = 0

    team_x_cache: dict[str, bool] = {}

    def attacks_high_x(team: str) -> bool:
        if team not in team_x_cache:
            xs = [
                float(row["x"])
                for row in pass_rows
                if event_team_name(row.get("details")) == team
                and row.get("x") is not None
            ]
            team_x_cache[team] = infer_team_attacks_high_x(xs)
        return team_x_cache[team]

    for row in pass_rows:
        details = row.get("details")
        if event_player_id(details) != player_id:
            continue
        match_id = row.get("match_id")
        if match_id is not None:
            matches_seen.add(int(match_id))
        team = event_team_name(details)
        if team:
            team_counts[team] += 1
        passes += 1
        if is_completed_pass(details):
            completed += 1
            if team and is_progressive_pass(
                row.get("x"), row.get("end_x"), attacks_high_x(team)
            ):
                progressive += 1

    for row in shot_rows:
        details = row.get("details")
        if event_player_id(details) != player_id:
            continue
        match_id = row.get("match_id")
        if match_id is not None:
            matches_seen.add(int(match_id))
        team = event_team_name(details)
        if team:
            team_counts[team] += 1
        shots += 1
        shot_xg = shot_xg_from_details(details)
        if shot_xg is not None:
            xg += shot_xg
        if is_goal_outcome(shot_outcome(details)):
            goals += 1

    primary_team = team_counts.most_common(1)[0][0] if team_counts else None

    return PlayerSeasonProfile(
        player_id=player_id,
        player_name=player_name,
        competition=competition,
        season=season,
        team=primary_team,
        matches_with_events=len(matches_seen),
        shots=shots,
        goals=goals,
        xg=round(xg, 2),
        passes=passes,
        completed_passes=completed,
        progressive_passes=progressive,
    )


def _build_team_profile(
    team: str,
    competition: str,
    season: str,
    match_rows: list[dict[str, Any]],
    pass_rows: list[dict[str, Any]],
    shot_rows: list[dict[str, Any]],
    all_event_rows: list[dict[str, Any]],
) -> TeamSeasonProfile:
    match_ids = set()
    goals_for = 0
    goals_against = 0

    for row in match_rows:
        home = (row.get("home_team") or {}).get("name") or "Home"
        away = (row.get("away_team") or {}).get("name") or "Away"
        if team not in (home, away):
            continue
        match_ids.add(int(row["id"]))
        is_home = team == home
        home_score = row.get("home_score")
        away_score = row.get("away_score")
        if home_score is not None and away_score is not None:
            goals_for += home_score if is_home else away_score
            goals_against += away_score if is_home else home_score

    xg_for = 0.0
    xg_against = 0.0
    for row in shot_rows:
        details = row.get("details")
        shot_team = shot_team_name(details)
        if row.get("match_id") not in match_ids:
            continue
        xg_val = shot_xg_from_details(details)
        if xg_val is None:
            continue
        if shot_team == team:
            xg_for += xg_val
        else:
            xg_against += xg_val

    passes = 0
    completed = 0
    progressive = 0
    team_pass_x: list[float] = []
    for row in pass_rows:
        details = row.get("details")
        if event_team_name(details) != team:
            continue
        if row.get("match_id") not in match_ids:
            continue
        passes += 1
        if row.get("x") is not None:
            team_pass_x.append(float(row["x"]))
        if is_completed_pass(details):
            completed += 1

    attacks_high_x = infer_team_attacks_high_x(team_pass_x)
    for row in pass_rows:
        details = row.get("details")
        if event_team_name(details) != team:
            continue
        if row.get("match_id") not in match_ids:
            continue
        if is_completed_pass(details) and is_progressive_pass(
            row.get("x"), row.get("end_x"), attacks_high_x
        ):
            progressive += 1

    possession_stats = _aggregate_team_possession(
        _build_chains(
            [
                event
                for event in all_event_rows
                if event.get("match_id") in match_ids
            ]
        )
    ).get(team)

    return TeamSeasonProfile(
        team=team,
        competition=competition,
        season=season,
        matches=len(match_ids),
        goals_for=goals_for,
        goals_against=goals_against,
        xg_for=round(xg_for, 2),
        xg_against=round(xg_against, 2),
        passes=passes,
        completed_passes=completed,
        progressive_passes=progressive,
        avg_passes_per_possession=(
            possession_stats.avg_passes_per_possession if possession_stats else 0
        ),
        shot_possession_rate=(
            possession_stats.shot_possession_rate if possession_stats else 0
        ),
    )


def _season_event_bundle(
    supabase: Client, competition: str, season: str
) -> tuple[list[int], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    match_ids = _season_match_ids(supabase, competition, season)
    pass_rows = _events_for_matches(supabase, match_ids, "Pass")
    shot_rows = _events_for_matches(supabase, match_ids, "Shot")
    all_rows: list[dict[str, Any]] = []
    if match_ids:
        all_rows = (
            supabase.table("events")
            .select("match_id, minute, second, event_type, details")
            .in_("match_id", match_ids)
            .order("minute")
            .order("second")
            .order("id")
            .execute()
        ).data or []
    match_rows = _season_match_rows(supabase, competition, season)
    return match_ids, pass_rows, shot_rows, all_rows, match_rows


@router.get(
    "/players/{player_id}",
    response_model=PlayerSeasonProfile,
    responses=COMMON_ERROR_RESPONSES,
)
def get_player_season_profile(
    player_id: int,
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> PlayerSeasonProfile:
    """Season attacking and passing profile for one player."""
    try:
        player = _lookup_player(supabase, player_id)
        _, pass_rows, shot_rows, _, _ = _season_event_bundle(
            supabase, competition, season
        )
        return _build_player_profile(
            player_id,
            player.get("name") or f"Player {player_id}",
            competition,
            season,
            pass_rows,
            shot_rows,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to build player profile for %s in %s %s",
            player_id,
            competition,
            season,
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to build player season profile",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/teams",
    response_model=TeamSeasonProfile,
    responses=COMMON_ERROR_RESPONSES,
)
def get_team_season_profile(
    team: str = Query(..., min_length=1),
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> TeamSeasonProfile:
    """Season profile for one team."""
    try:
        _, pass_rows, shot_rows, all_rows, match_rows = _season_event_bundle(
            supabase, competition, season
        )
        return _build_team_profile(
            team, competition, season, match_rows, pass_rows, shot_rows, all_rows
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to build team profile for %s in %s %s",
            team,
            competition,
            season,
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to build team season profile",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/compare/players",
    response_model=ComparePlayersResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def compare_players(
    player_a_id: int = Query(..., alias="player_a"),
    player_b_id: int = Query(..., alias="player_b"),
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> ComparePlayersResponse:
    """Side-by-side player season profiles."""
    try:
        if player_a_id == player_b_id:
            raise_http_exception(
                status_code=400,
                detail="Choose two different players",
                code=ErrorCode.VALIDATION_ERROR,
            )
        player_a = _lookup_player(supabase, player_a_id)
        player_b = _lookup_player(supabase, player_b_id)
        _, pass_rows, shot_rows, _, _ = _season_event_bundle(
            supabase, competition, season
        )
        return ComparePlayersResponse(
            competition=competition,
            season=season,
            player_a=_build_player_profile(
                player_a_id,
                player_a.get("name") or f"Player {player_a_id}",
                competition,
                season,
                pass_rows,
                shot_rows,
            ),
            player_b=_build_player_profile(
                player_b_id,
                player_b.get("name") or f"Player {player_b_id}",
                competition,
                season,
                pass_rows,
                shot_rows,
            ),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to compare players in %s %s", competition, season)
        raise_http_exception(
            status_code=500,
            detail="Failed to compare players",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/compare/teams",
    response_model=CompareTeamsResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def compare_teams(
    team_a: str = Query(..., min_length=1),
    team_b: str = Query(..., min_length=1),
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> CompareTeamsResponse:
    """Side-by-side team season profiles."""
    try:
        if team_a == team_b:
            raise_http_exception(
                status_code=400,
                detail="Choose two different teams",
                code=ErrorCode.VALIDATION_ERROR,
            )
        _, pass_rows, shot_rows, all_rows, match_rows = _season_event_bundle(
            supabase, competition, season
        )
        return CompareTeamsResponse(
            competition=competition,
            season=season,
            team_a=_build_team_profile(
                team_a, competition, season, match_rows, pass_rows, shot_rows, all_rows
            ),
            team_b=_build_team_profile(
                team_b, competition, season, match_rows, pass_rows, shot_rows, all_rows
            ),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to compare teams in %s %s", competition, season)
        raise_http_exception(
            status_code=500,
            detail="Failed to compare teams",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )