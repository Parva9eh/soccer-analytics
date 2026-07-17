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
from analytics.players import event_player_id, event_team_name
from analytics.possession import possession_id, possession_team_name
from analytics.tactical import (
    is_counter_pattern,
    is_final_third_location,
    is_set_piece_pattern,
    play_pattern_name,
)
from analytics.xg import is_goal_outcome, shot_outcome, shot_team_name, shot_xg_from_details
from core.supabase_client import get_supabase_public_read
from services.season_scope import list_season_match_rows, resolve_season_match_ids
from services.possession_chains import aggregate_team_possession, build_possession_chains
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception
from schemas.profiles import (
    CompareMatchesResponse,
    ComparePlayersResponse,
    CompareTeamsResponse,
    MatchAnalyticsProfile,
    PlayerSeasonProfile,
    TeamSeasonProfile,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/profiles", tags=["Analytics"])


def _events_for_matches(
    supabase: Client, match_ids: list[int], event_type: str
) -> list[dict[str, Any]]:
    from services.event_fetch import fetch_events_paginated

    return fetch_events_paginated(
        supabase,
        "match_id, x, end_x, event_type, details",
        match_ids=match_ids,
        event_type=event_type,
    )


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

    possession_stats = aggregate_team_possession(
        build_possession_chains(
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


def _fetch_match_row(supabase: Client, match_id: int) -> dict[str, Any]:
    result = (
        supabase.table("matches")
        .select(
            "id, match_date, match_week, home_score, away_score, "
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
    return result.data[0]


def _match_events(supabase: Client, match_id: int) -> list[dict[str, Any]]:
    from services.event_fetch import fetch_events_paginated

    return fetch_events_paginated(
        supabase,
        "id, x, end_x, event_type, details",
        match_id=match_id,
    )


def _build_match_profile(
    supabase: Client, match_id: int
) -> MatchAnalyticsProfile:
    row = _fetch_match_row(supabase, match_id)
    home = (row.get("home_team") or {}).get("name") or "Home"
    away = (row.get("away_team") or {}).get("name") or "Away"
    home_score = row.get("home_score")
    away_score = row.get("away_score")
    label = f"{home} {home_score if home_score is not None else '–'}–{away_score if away_score is not None else '–'} {away}"

    event_rows = _match_events(supabase, match_id)
    shots = 0
    passes = 0
    completed = 0
    progressive = 0
    set_piece_events = 0
    counter_events = 0
    final_third_events = 0
    home_xg = 0.0
    away_xg = 0.0

    team_pass_x: dict[str, list[float]] = {home: [], away: []}
    possession_keys: set[tuple[int, str]] = set()

    for event in event_rows:
        details = event.get("details")
        pattern = play_pattern_name(details)
        x = event.get("x")
        if is_set_piece_pattern(pattern):
            set_piece_events += 1
        if is_counter_pattern(pattern):
            counter_events += 1
        if is_final_third_location(x):
            final_third_events += 1

        pid = possession_id(details)
        pteam = possession_team_name(details)
        if pid is not None and pteam:
            possession_keys.add((pid, pteam))

        event_type = event.get("event_type")
        if event_type == "Shot":
            shots += 1
            shot_team = shot_team_name(details)
            xg_val = shot_xg_from_details(details)
            if xg_val is not None:
                if shot_team == home:
                    home_xg += xg_val
                elif shot_team == away:
                    away_xg += xg_val
        elif event_type == "Pass":
            passes += 1
            team = event_team_name(details)
            if team in team_pass_x and x is not None:
                team_pass_x[team].append(float(x))
            if is_completed_pass(details):
                completed += 1

    attack_direction = {
        team: infer_team_attacks_high_x(values)
        for team, values in team_pass_x.items()
    }
    for event in event_rows:
        if event.get("event_type") != "Pass":
            continue
        details = event.get("details")
        team = event_team_name(details)
        if not team or not is_completed_pass(details):
            continue
        if is_progressive_pass(
            event.get("x"),
            event.get("end_x"),
            attack_direction.get(team, True),
        ):
            progressive += 1

    return MatchAnalyticsProfile(
        match_id=match_id,
        label=label,
        home_team=home,
        away_team=away,
        home_score=home_score,
        away_score=away_score,
        match_week=row.get("match_week"),
        home_xg=round(home_xg, 2),
        away_xg=round(away_xg, 2),
        total_events=len(event_rows),
        shots=shots,
        passes=passes,
        completed_passes=completed,
        progressive_passes=progressive,
        possession_sequences=len(possession_keys),
        set_piece_events=set_piece_events,
        counter_events=counter_events,
        final_third_events=final_third_events,
    )


def _season_event_bundle(
    supabase: Client, competition: str, season: str
) -> tuple[list[int], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    from services.event_fetch import COLUMNS_SEASON_BUNDLE, fetch_events_paginated

    match_ids = resolve_season_match_ids(supabase, competition, season)
    all_rows: list[dict[str, Any]] = []
    if match_ids:
        all_rows = fetch_events_paginated(
            supabase,
            COLUMNS_SEASON_BUNDLE,
            match_ids=match_ids,
            order=True,
        )
    # Single full-season pull; derive pass/shot subsets in process.
    pass_rows = [r for r in all_rows if r.get("event_type") == "Pass"]
    shot_rows = [r for r in all_rows if r.get("event_type") == "Shot"]
    match_rows = list_season_match_rows(supabase, competition, season)
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


@router.get(
    "/matches/{match_id}",
    response_model=MatchAnalyticsProfile,
    responses=COMMON_ERROR_RESPONSES,
)
def get_match_analytics_profile(
    match_id: int,
    supabase: Client = Depends(get_supabase_public_read),
) -> MatchAnalyticsProfile:
    """Analytics summary for a single match."""
    try:
        return _build_match_profile(supabase, match_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to build match profile for %s", match_id)
        raise_http_exception(
            status_code=500,
            detail="Failed to build match analytics profile",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/compare/matches",
    response_model=CompareMatchesResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def compare_matches(
    match_a_id: int = Query(..., alias="match_a"),
    match_b_id: int = Query(..., alias="match_b"),
    supabase: Client = Depends(get_supabase_public_read),
) -> CompareMatchesResponse:
    """Side-by-side match analytics profiles."""
    try:
        if match_a_id == match_b_id:
            raise_http_exception(
                status_code=400,
                detail="Choose two different matches",
                code=ErrorCode.VALIDATION_ERROR,
            )
        return CompareMatchesResponse(
            match_a=_build_match_profile(supabase, match_a_id),
            match_b=_build_match_profile(supabase, match_b_id),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to compare matches %s and %s", match_a_id, match_b_id
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to compare matches",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )