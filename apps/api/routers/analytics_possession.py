import logging
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from core.supabase_client import get_supabase_public_read
from services.event_fetch import fetch_events_paginated
from services.possession_chains import aggregate_team_possession, build_possession_chains
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
        chains = build_possession_chains(event_rows, team_filter=team)[:limit]

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
            chains = build_possession_chains(by_match.get(match_id, []))
            per_match = aggregate_team_possession(chains)
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