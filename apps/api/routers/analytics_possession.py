import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from analytics.possession import (
    event_timestamp,
    is_pass_event,
    is_shot_event,
    play_pattern_name,
    possession_id,
    possession_team_name,
    shot_was_goal,
)
from core.supabase_client import get_supabase_public_read
from services.season_scope import resolve_season_match_ids
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception
from schemas.possession import (
    MatchPossessionResponse,
    PossessionChainSummary,
    SeasonPossessionResponse,
    TeamPossessionSummary,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/possession", tags=["Analytics"])


@dataclass
class _ChainAccumulator:
    possession_id: int
    team: str
    event_count: int = 0
    pass_count: int = 0
    start_ts: int = 0
    end_ts: int = 0
    start_minute: int | None = None
    end_minute: int | None = None
    play_pattern: str | None = None
    ended_with_shot: bool = False
    ended_with_goal: bool = False
    event_ids: list[int] = field(default_factory=list)


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


def _events_for_match(supabase: Client, match_id: int) -> list[dict[str, Any]]:
    from services.event_fetch import fetch_events_paginated

    return fetch_events_paginated(
        supabase,
        "id, match_id, minute, second, event_type, details",
        match_id=match_id,
        order=True,
    )


def _events_for_matches(
    supabase: Client, match_ids: list[int]
) -> list[dict[str, Any]]:
    from services.event_fetch import fetch_events_paginated

    return fetch_events_paginated(
        supabase,
        "id, match_id, minute, second, event_type, details",
        match_ids=match_ids,
        order=True,
    )


def _build_chains(
    event_rows: list[dict[str, Any]], team_filter: str | None = None
) -> list[PossessionChainSummary]:
    grouped: dict[tuple[int, str], _ChainAccumulator] = {}

    for row in event_rows:
        details = row.get("details")
        pid = possession_id(details)
        team = possession_team_name(details)
        if pid is None or not team:
            continue
        if team_filter and team != team_filter:
            continue

        key = (pid, team)
        chain = grouped.get(key)
        ts = event_timestamp(row.get("minute"), row.get("second"))
        minute = row.get("minute")

        if chain is None:
            chain = _ChainAccumulator(
                possession_id=pid,
                team=team,
                start_ts=ts,
                end_ts=ts,
                start_minute=minute,
                end_minute=minute,
                play_pattern=play_pattern_name(details),
            )
            grouped[key] = chain

        chain.event_count += 1
        if is_pass_event(row.get("event_type")):
            chain.pass_count += 1
        chain.end_ts = max(chain.end_ts, ts)
        chain.end_minute = minute
        if chain.play_pattern is None:
            chain.play_pattern = play_pattern_name(details)

        event_id = row.get("id")
        if event_id is not None:
            chain.event_ids.append(int(event_id))

        if is_shot_event(row.get("event_type")):
            chain.ended_with_shot = True
            if shot_was_goal(details):
                chain.ended_with_goal = True

    summaries: list[PossessionChainSummary] = []
    for chain in grouped.values():
        duration = max(chain.end_ts - chain.start_ts, 0)
        summaries.append(
            PossessionChainSummary(
                possession_id=chain.possession_id,
                team=chain.team,
                event_count=chain.event_count,
                pass_count=chain.pass_count,
                duration_seconds=duration,
                start_minute=chain.start_minute,
                end_minute=chain.end_minute,
                play_pattern=chain.play_pattern,
                ended_with_shot=chain.ended_with_shot,
                ended_with_goal=chain.ended_with_goal,
                event_ids=chain.event_ids,
            )
        )

    summaries.sort(
        key=lambda item: (item.pass_count, item.duration_seconds),
        reverse=True,
    )
    return summaries


def _aggregate_team_possession(
    chains: list[PossessionChainSummary],
) -> dict[str, TeamPossessionSummary]:
    buckets: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {
            "possessions": 0,
            "duration_total": 0,
            "pass_total": 0,
            "shot_endings": 0,
        }
    )

    for chain in chains:
        bucket = buckets[chain.team]
        bucket["possessions"] = int(bucket["possessions"]) + 1
        bucket["duration_total"] = int(bucket["duration_total"]) + chain.duration_seconds
        bucket["pass_total"] = int(bucket["pass_total"]) + chain.pass_count
        if chain.ended_with_shot:
            bucket["shot_endings"] = int(bucket["shot_endings"]) + 1

    summaries: dict[str, TeamPossessionSummary] = {}
    for team, bucket in buckets.items():
        possessions = int(bucket["possessions"])
        if possessions == 0:
            continue
        summaries[team] = TeamPossessionSummary(
            team=team,
            possessions=possessions,
            avg_duration_seconds=round(
                int(bucket["duration_total"]) / possessions, 1
            ),
            avg_passes_per_possession=round(
                int(bucket["pass_total"]) / possessions, 1
            ),
            shot_possession_rate=round(
                int(bucket["shot_endings"]) / possessions, 3
            ),
        )
    return summaries


@router.get(
    "/matches/{match_id}",
    response_model=MatchPossessionResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_match_possession_chains(
    match_id: int,
    team: str | None = Query(None, min_length=1),
    limit: int = Query(25, ge=1, le=100),
    supabase: Client = Depends(get_supabase_public_read),
) -> MatchPossessionResponse:
    """Possession chains for a match, ranked by pass count."""
    try:
        home_team, away_team = _resolve_match_teams(supabase, match_id)
        if team and team not in (home_team, away_team):
            raise_http_exception(
                status_code=400,
                detail="Team must be one of the match participants",
                code=ErrorCode.VALIDATION_ERROR,
            )

        event_rows = _events_for_match(supabase, match_id)
        chains = _build_chains(event_rows, team_filter=team)[:limit]

        return MatchPossessionResponse(
            match_id=match_id,
            home_team=home_team,
            away_team=away_team,
            team=team,
            chains=chains,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to compute possession chains for match %s", match_id
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to compute possession chains",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/season",
    response_model=SeasonPossessionResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_season_possession_summary(
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> SeasonPossessionResponse:
    """Team possession summaries averaged across a competition season."""
    try:
        match_ids = resolve_season_match_ids(supabase, competition, season)
        if not match_ids:
            return SeasonPossessionResponse(
                competition=competition,
                season=season,
                matches=0,
                teams=[],
            )

        team_totals: dict[str, dict[str, float | int]] = defaultdict(
            lambda: {
                "possessions": 0,
                "duration_total": 0,
                "pass_total": 0,
                "shot_endings": 0,
            }
        )

        # One paginated pull for the whole season (not N sequential match fetches).
        all_events = _events_for_matches(supabase, match_ids)
        by_match: dict[int, list[dict[str, Any]]] = defaultdict(list)
        for row in all_events:
            mid = row.get("match_id")
            if mid is not None:
                by_match[int(mid)].append(row)

        for match_id in match_ids:
            chains = _build_chains(by_match.get(match_id, []))
            per_match = _aggregate_team_possession(chains)
            for team, summary in per_match.items():
                bucket = team_totals[team]
                bucket["possessions"] = int(bucket["possessions"]) + summary.possessions
                bucket["duration_total"] = (
                    float(bucket["duration_total"])
                    + summary.avg_duration_seconds * summary.possessions
                )
                bucket["pass_total"] = (
                    float(bucket["pass_total"])
                    + summary.avg_passes_per_possession * summary.possessions
                )
                bucket["shot_endings"] = (
                    float(bucket["shot_endings"])
                    + summary.shot_possession_rate * summary.possessions
                )

        teams: list[TeamPossessionSummary] = []
        for team, bucket in team_totals.items():
            possessions = int(bucket["possessions"])
            if possessions == 0:
                continue
            teams.append(
                TeamPossessionSummary(
                    team=team,
                    possessions=possessions,
                    avg_duration_seconds=round(
                        float(bucket["duration_total"]) / possessions, 1
                    ),
                    avg_passes_per_possession=round(
                        float(bucket["pass_total"]) / possessions, 1
                    ),
                    shot_possession_rate=round(
                        float(bucket["shot_endings"]) / possessions, 3
                    ),
                )
            )

        teams.sort(key=lambda item: item.avg_passes_per_possession, reverse=True)

        return SeasonPossessionResponse(
            competition=competition,
            season=season,
            matches=len(match_ids),
            teams=teams,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to compute season possession summary for %s %s",
            competition,
            season,
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to compute season possession summary",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )