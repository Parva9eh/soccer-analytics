import logging
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from analytics.passes import (
    infer_team_attacks_high_x,
    is_completed_pass,
    is_progressive_pass,
    pass_player_id,
    pass_player_name,
    pass_recipient_name,
    pass_team_name,
)
from core.supabase_client import get_supabase_public_read
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception
from schemas.passes import (
    MatchPassNetworkResponse,
    PassNetworkEdge,
    PassNetworkNode,
    ProgressivePassLeaderboardResponse,
    TeamProgressivePassSummary,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/passes", tags=["Analytics"])


def _resolve_match_teams(
    supabase: Client, match_id: int
) -> tuple[str, str]:
    result = (
        supabase.table("matches")
        .select(
            "id, "
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
    return home, away


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


def _pass_events_for_matches(
    supabase: Client, match_ids: list[int]
) -> list[dict[str, Any]]:
    from services.event_fetch import fetch_events_paginated

    return fetch_events_paginated(
        supabase,
        "match_id, x, y, end_x, details",
        match_ids=match_ids,
        event_type="Pass",
    )


def _accumulate_team_pass_stats(
    pass_rows: list[dict[str, Any]],
) -> dict[str, TeamProgressivePassSummary]:
    team_x_values: dict[str, list[float]] = defaultdict(list)
    for row in pass_rows:
        team = pass_team_name(row.get("details"))
        x = row.get("x")
        if team and x is not None:
            team_x_values[team].append(float(x))

    attack_direction = {
        team: infer_team_attacks_high_x(values)
        for team, values in team_x_values.items()
    }

    summaries: dict[str, TeamProgressivePassSummary] = {}

    for row in pass_rows:
        details = row.get("details")
        team = pass_team_name(details)
        if not team:
            continue
        entry = summaries.get(team)
        if entry is None:
            entry = TeamProgressivePassSummary(team=team)
            summaries[team] = entry
        entry.total_passes += 1
        if not is_completed_pass(details):
            continue
        entry.completed_passes += 1
        if is_progressive_pass(
            row.get("x"),
            row.get("end_x"),
            attack_direction.get(team, True),
        ):
            entry.progressive_passes += 1

    return summaries


def _build_match_network(
    pass_rows: list[dict[str, Any]], team: str
) -> MatchPassNetworkResponse:
    team_rows = [
        row
        for row in pass_rows
        if pass_team_name(row.get("details")) == team
    ]
    x_values = [
        float(row["x"])
        for row in team_rows
        if row.get("x") is not None
    ]
    attacks_high_x = infer_team_attacks_high_x(x_values)

    node_positions: dict[str, list[tuple[float, float]]] = defaultdict(list)
    node_ids: dict[str, int | None] = {}
    passes_made: dict[str, int] = defaultdict(int)
    passes_received: dict[str, int] = defaultdict(int)
    edge_counts: dict[tuple[str, str], dict[str, int]] = defaultdict(
        lambda: {"count": 0, "progressive": 0}
    )

    total_passes = 0
    completed_passes = 0
    progressive_passes = 0

    for row in team_rows:
        details = row.get("details")
        total_passes += 1
        if not is_completed_pass(details):
            continue

        passer = pass_player_name(details)
        recipient = pass_recipient_name(details)
        if not passer or not recipient:
            continue

        completed_passes += 1
        x = row.get("x")
        y = row.get("y")
        if x is not None and y is not None:
            node_positions[passer].append((float(x), float(y)))
        node_ids[passer] = pass_player_id(details)

        passes_made[passer] += 1
        passes_received[recipient] += 1

        progressive = is_progressive_pass(
            row.get("x"), row.get("end_x"), attacks_high_x
        )
        if progressive:
            progressive_passes += 1

        edge_key = (passer, recipient)
        edge_counts[edge_key]["count"] += 1
        if progressive:
            edge_counts[edge_key]["progressive"] += 1

    nodes: list[PassNetworkNode] = []
    for player, positions in sorted(node_positions.items()):
        avg_x = sum(pos[0] for pos in positions) / len(positions)
        avg_y = sum(pos[1] for pos in positions) / len(positions)
        nodes.append(
            PassNetworkNode(
                player=player,
                player_id=node_ids.get(player),
                passes_made=passes_made.get(player, 0),
                passes_received=passes_received.get(player, 0),
                avg_x=round(avg_x, 2),
                avg_y=round(avg_y, 2),
            )
        )

    edges = [
        PassNetworkEdge(
            passer=passer,
            recipient=recipient,
            count=counts["count"],
            progressive_count=counts["progressive"],
        )
        for (passer, recipient), counts in sorted(
            edge_counts.items(), key=lambda item: item[1]["count"], reverse=True
        )
    ]

    return MatchPassNetworkResponse(
        match_id=0,
        team=team,
        home_team="",
        away_team="",
        total_passes=total_passes,
        completed_passes=completed_passes,
        progressive_passes=progressive_passes,
        nodes=nodes,
        edges=edges,
    )


@router.get(
    "/matches/{match_id}",
    response_model=MatchPassNetworkResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_match_pass_network(
    match_id: int,
    team: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> MatchPassNetworkResponse:
    """Completed-pass network for one team in a match."""
    try:
        home_team, away_team = _resolve_match_teams(supabase, match_id)
        if team not in (home_team, away_team):
            raise_http_exception(
                status_code=400,
                detail="Team must be one of the match participants",
                code=ErrorCode.VALIDATION_ERROR,
            )

        pass_rows = _pass_events_for_matches(supabase, [match_id])
        network = _build_match_network(pass_rows, team)
        return network.model_copy(
            update={
                "match_id": match_id,
                "home_team": home_team,
                "away_team": away_team,
            }
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to compute pass network for match %s", match_id)
        raise_http_exception(
            status_code=500,
            detail="Failed to compute pass network",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/progressive",
    response_model=ProgressivePassLeaderboardResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_progressive_pass_leaderboard(
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    supabase: Client = Depends(get_supabase_public_read),
) -> ProgressivePassLeaderboardResponse:
    """Teams ranked by progressive completed passes in a season."""
    try:
        match_ids = _season_match_ids(supabase, competition, season)
        if not match_ids:
            return ProgressivePassLeaderboardResponse(
                competition=competition,
                season=season,
                teams=[],
            )

        pass_rows = _pass_events_for_matches(supabase, match_ids)
        summaries = _accumulate_team_pass_stats(pass_rows)
        ranked = sorted(
            summaries.values(),
            key=lambda item: item.progressive_passes,
            reverse=True,
        )[:limit]

        return ProgressivePassLeaderboardResponse(
            competition=competition,
            season=season,
            teams=ranked,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to compute progressive pass leaderboard for %s %s",
            competition,
            season,
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to compute progressive pass leaderboard",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )