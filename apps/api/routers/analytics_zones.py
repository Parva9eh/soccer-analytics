import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from supabase import Client

from analytics.zones import (
    HEATMAP_COLS,
    HEATMAP_ROWS,
    aggregate_team_heatmap,
    aggregate_team_zones,
)
from core.config import get_settings
from core.season_zone_cache import (
    SeasonScopeCache,
    get_cached_positioned_events,
    get_cached_season_zones,
    set_cached_positioned_events,
    set_cached_season_zones,
)
from core.supabase_client import get_supabase_public_read
from services.season_scope import resolve_season_match_ids
from schemas.error import COMMON_ERROR_RESPONSES, ErrorCode, raise_http_exception
from schemas.zones import (
    HeatmapBinOut,
    SeasonZonesResponse,
    TeamHeatmapResponse,
    TeamZoneSummary,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/zones", tags=["Analytics"])

_PAGE_SIZE = 1000
_EVENTS_CACHE_PREFIX = "events"
_ZONES_CACHE_PREFIX = "zones"


def _positioned_events_for_matches(
    supabase: Client,
    match_ids: list[int],
    *,
    competition: str,
    season: str,
) -> list[dict[str, Any]]:
    if not match_ids:
        return []

    settings = get_settings()
    cache_key = SeasonScopeCache.scope_key(
        _EVENTS_CACHE_PREFIX, competition, season, match_ids
    )
    cached = get_cached_positioned_events(cache_key)
    if cached is not None:
        return cached

    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        batch = (
            supabase.table("events")
            .select("x, y, details")
            .in_("match_id", match_ids)
            .not_.is_("x", "null")
            .not_.is_("y", "null")
            .range(offset, offset + _PAGE_SIZE - 1)
            .execute()
        ).data or []
        rows.extend(batch)
        if len(batch) < _PAGE_SIZE:
            break
        offset += _PAGE_SIZE

    set_cached_positioned_events(cache_key, rows)
    return rows


def _teams_from_zone_counts(
    zone_counts: dict[str, dict[str, int]],
) -> list[TeamZoneSummary]:
    return [
        TeamZoneSummary(
            team=team,
            left_third=counts["left_third"],
            middle_third=counts["middle_third"],
            right_third=counts["right_third"],
            total_events=counts["total_events"],
        )
        for team, counts in sorted(
            zone_counts.items(),
            key=lambda item: item[1]["total_events"],
            reverse=True,
        )
    ]


def _read_season_zones_from_view(
    supabase: Client, competition: str, season: str
) -> list[TeamZoneSummary] | None:
    settings = get_settings()
    if not settings.USE_ZONE_MATERIALIZED_VIEW:
        return None

    try:
        response = (
            supabase.table("season_team_zone_stats")
            .select("team, left_third, middle_third, right_third, total_events")
            .eq("competition", competition)
            .eq("season", season)
            .execute()
        )
    except Exception:
        logger.debug("season_team_zone_stats view unavailable", exc_info=True)
        return None

    rows = response.data or []
    if not rows:
        return None

    return [
        TeamZoneSummary(
            team=row["team"],
            left_third=int(row["left_third"]),
            middle_third=int(row["middle_third"]),
            right_third=int(row["right_third"]),
            total_events=int(row["total_events"]),
        )
        for row in sorted(
            rows,
            key=lambda item: int(item.get("total_events") or 0),
            reverse=True,
        )
    ]


def _build_season_zones(
    supabase: Client, competition: str, season: str
) -> list[TeamZoneSummary]:
    match_ids = resolve_season_match_ids(supabase, competition, season)
    cache_key = SeasonScopeCache.scope_key(
        _ZONES_CACHE_PREFIX, competition, season, match_ids
    )
    cached = get_cached_season_zones(cache_key)
    if cached is not None:
        return [TeamZoneSummary(**row) for row in cached]

    view_teams = _read_season_zones_from_view(supabase, competition, season)
    if view_teams is not None:
        payload = [team.model_dump() for team in view_teams]
        set_cached_season_zones(cache_key, payload)
        return view_teams

    rows = _positioned_events_for_matches(
        supabase,
        match_ids,
        competition=competition,
        season=season,
    )
    zone_counts = aggregate_team_zones(rows)
    teams = _teams_from_zone_counts(zone_counts)
    set_cached_season_zones(cache_key, [team.model_dump() for team in teams])
    return teams


@router.get(
    "/season",
    response_model=SeasonZonesResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_season_zones(
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> SeasonZonesResponse:
    """Team event counts by pitch third for a competition season."""
    try:
        teams = _build_season_zones(supabase, competition, season)
        return SeasonZonesResponse(
            competition=competition,
            season=season,
            teams=teams,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to build season zones for %s %s", competition, season
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to build season zone summary",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


@router.get(
    "/heatmap",
    response_model=TeamHeatmapResponse,
    responses=COMMON_ERROR_RESPONSES,
)
def get_team_season_heatmap(
    team: str = Query(..., min_length=1),
    competition: str = Query(..., min_length=1),
    season: str = Query(..., min_length=1),
    supabase: Client = Depends(get_supabase_public_read),
) -> TeamHeatmapResponse:
    """Binned spatial heatmap for one team's season events."""
    try:
        match_ids = resolve_season_match_ids(supabase, competition, season)
        rows = _positioned_events_for_matches(
            supabase,
            match_ids,
            competition=competition,
            season=season,
        )
        bins_map, total = aggregate_team_heatmap(rows, team)
        if total == 0:
            raise_http_exception(
                status_code=404,
                detail="No positioned events for this team in season scope",
                code=ErrorCode.NOT_FOUND,
            )
        bins = [
            HeatmapBinOut(col=col, row=row, count=count)
            for (col, row), count in sorted(bins_map.items())
        ]
        return TeamHeatmapResponse(
            competition=competition,
            season=season,
            team=team,
            cols=HEATMAP_COLS,
            rows=HEATMAP_ROWS,
            bins=bins,
            total_events=total,
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception(
            "Failed to build team heatmap for %s in %s %s",
            team,
            competition,
            season,
        )
        raise_http_exception(
            status_code=500,
            detail="Failed to build team season heatmap",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )