import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from analytics.xg import (
    is_goal_outcome,
    shot_outcome,
    shot_player_name,
    shot_team_name,
    shot_xg_from_details,
)
from core.supabase_client import get_supabase_public_read
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception
from schemas.xg import (
    MatchXgFormPoint,
    MatchXgResponse,
    PlayerXgLeaderboardResponse,
    PlayerXgSummary,
    SeasonXgResponse,
    TeamXgFormResponse,
    TeamXgLeaderboardResponse,
    TeamXgSummary,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/xg", tags=["Analytics"])


def _empty_team_summary(team: str) -> TeamXgSummary:
    return TeamXgSummary(team=team, shots=0, goals=0, xg=0.0)


def _empty_player_summary(player: str) -> PlayerXgSummary:
    return PlayerXgSummary(player=player, shots=0, goals=0, xg=0.0)


def _accumulate_team_shot(
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


def _accumulate_player_shot(
    summaries: dict[str, PlayerXgSummary],
    player_name: str | None,
    team_name: str | None,
    xg: float | None,
    outcome: str | None,
) -> None:
    if not player_name:
        return
    entry = summaries.get(player_name)
    if entry is None:
        entry = _empty_player_summary(player_name)
        summaries[player_name] = entry
    if team_name:
        entry.team = team_name
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


def _rolling_means(values: list[float], window: int) -> list[float]:
    rolling: list[float] = []
    for index in range(len(values)):
        start = max(0, index - window + 1)
        chunk = values[start : index + 1]
        rolling.append(round(sum(chunk) / len(chunk), 2) if chunk else 0.0)
    return rolling


def _team_xg_from_shot_rows(
    shot_rows: list[dict[str, Any]],
) -> dict[int, dict[str, float]]:
    """Map match_id -> team name -> total xG from shot event rows."""
    by_match: dict[int, dict[str, float]] = {}
    for row in shot_rows:
        match_id = row.get("match_id")
        if match_id is None:
            continue
        details = row.get("details")
        team_name = shot_team_name(details)
        xg = shot_xg_from_details(details)
        if not team_name or xg is None:
            continue
        match_totals = by_match.setdefault(int(match_id), {})
        match_totals[team_name] = round(match_totals.get(team_name, 0.0) + xg, 4)
    return by_match


def _matches_for_season(
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
            "id, match_date, match_week, home_score, away_score, "
            "home_team:teams!home_team_id(name), "
            "away_team:teams!away_team_id(name)"
        )
        .eq("competition_id", comp_id)
        .eq("season_id", season_id)
        .order("match_week")
        .order("match_date")
        .order("id")
        .execute()
    )
    return matches.data or []


def _shots_for_season(
    supabase: Client, competition: str, season: str
) -> tuple[list[int], list[dict[str, Any]]]:
    from services.event_fetch import fetch_events_paginated

    match_ids = _match_ids_for_season(supabase, competition, season)
    if not match_ids:
        return [], []

    shots = fetch_events_paginated(
        supabase,
        "match_id, details",
        match_ids=match_ids,
        event_type="Shot",
    )
    return match_ids, shots


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
            _accumulate_team_shot(
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
        match_ids, shot_rows = _shots_for_season(supabase, competition, season)
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

        total_shots = 0
        total_goals = 0
        total_xg = 0.0

        for row in shot_rows:
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


@router.get(
    "/players",
    response_model=PlayerXgLeaderboardResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_player_xg_leaderboard(
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    supabase: Client = Depends(get_supabase_public_read),
) -> PlayerXgLeaderboardResponse:
    """Top players by total expected goals in a competition season."""
    try:
        _, shot_rows = _shots_for_season(supabase, competition, season)
        players: dict[str, PlayerXgSummary] = {}

        for row in shot_rows:
            details = row.get("details")
            _accumulate_player_shot(
                players,
                shot_player_name(details),
                shot_team_name(details),
                shot_xg_from_details(details),
                shot_outcome(details),
            )

        ranked = sorted(players.values(), key=lambda item: item.xg, reverse=True)[
            :limit
        ]

        return PlayerXgLeaderboardResponse(
            competition=competition,
            season=season,
            players=ranked,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to compute player xG leaderboard for %s %s",
            competition,
            season,
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to compute player expected goals leaderboard",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/teams",
    response_model=TeamXgLeaderboardResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_team_xg_leaderboard(
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> TeamXgLeaderboardResponse:
    """Teams ranked by total expected goals in a competition season."""
    try:
        _, shot_rows = _shots_for_season(supabase, competition, season)
        teams: dict[str, TeamXgSummary] = {}

        for row in shot_rows:
            details = row.get("details")
            _accumulate_team_shot(
                teams,
                shot_team_name(details),
                shot_xg_from_details(details),
                shot_outcome(details),
            )

        ranked = sorted(teams.values(), key=lambda item: item.xg, reverse=True)

        return TeamXgLeaderboardResponse(
            competition=competition,
            season=season,
            teams=ranked,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to compute team xG leaderboard for %s %s", competition, season
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to compute team expected goals leaderboard",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/form",
    response_model=TeamXgFormResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_team_xg_form(
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    team: str = Query(..., min_length=1),
    window: int = Query(5, ge=1, le=15),
    supabase: Client = Depends(get_supabase_public_read),
) -> TeamXgFormResponse:
    """Per-match xG for/against with rolling averages for one team in a season."""
    try:
        match_rows = _matches_for_season(supabase, competition, season)
        if not match_rows:
            return TeamXgFormResponse(
                competition=competition,
                season=season,
                team=team,
                window=window,
                points=[],
            )

        match_ids = [
            int(row["id"]) for row in match_rows if row.get("id") is not None
        ]
        shots = (
            supabase.table("events")
            .select("match_id, details")
            .eq("event_type", "Shot")
            .in_("match_id", match_ids)
            .execute()
        )
        xg_by_match = _team_xg_from_shot_rows(shots.data or [])

        team_matches: list[dict[str, Any]] = []
        for row in match_rows:
            home = (row.get("home_team") or {}).get("name") or "Home"
            away = (row.get("away_team") or {}).get("name") or "Away"
            if team not in (home, away):
                continue
            team_matches.append({**row, "home_name": home, "away_name": away})

        if not team_matches:
            return TeamXgFormResponse(
                competition=competition,
                season=season,
                team=team,
                window=window,
                points=[],
            )

        xg_for_values: list[float] = []
        xg_against_values: list[float] = []
        raw_points: list[MatchXgFormPoint] = []

        for row in team_matches:
            match_id = int(row["id"])
            home = row["home_name"]
            away = row["away_name"]
            match_xg = xg_by_match.get(match_id, {})
            is_home = team == home

            if is_home:
                xg_for = round(match_xg.get(home, 0.0), 2)
                xg_against = round(match_xg.get(away, 0.0), 2)
                opponent = away
                goals_for = row.get("home_score")
                goals_against = row.get("away_score")
            else:
                xg_for = round(match_xg.get(away, 0.0), 2)
                xg_against = round(match_xg.get(home, 0.0), 2)
                opponent = home
                goals_for = row.get("away_score")
                goals_against = row.get("home_score")

            xg_for_values.append(xg_for)
            xg_against_values.append(xg_against)

            match_date = row.get("match_date")
            raw_points.append(
                MatchXgFormPoint(
                    match_id=match_id,
                    match_week=row.get("match_week"),
                    match_date=str(match_date) if match_date is not None else None,
                    opponent=opponent,
                    is_home=is_home,
                    xg_for=xg_for,
                    xg_against=xg_against,
                    goals_for=goals_for,
                    goals_against=goals_against,
                    rolling_xg_for=0.0,
                    rolling_xg_against=0.0,
                )
            )

        rolling_for = _rolling_means(xg_for_values, window)
        rolling_against = _rolling_means(xg_against_values, window)
        points = [
            point.model_copy(
                update={
                    "rolling_xg_for": rolling_for[index],
                    "rolling_xg_against": rolling_against[index],
                }
            )
            for index, point in enumerate(raw_points)
        ]

        return TeamXgFormResponse(
            competition=competition,
            season=season,
            team=team,
            window=window,
            points=points,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to compute team xG form for %s in %s %s",
            team,
            competition,
            season,
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to compute team expected goals form",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )