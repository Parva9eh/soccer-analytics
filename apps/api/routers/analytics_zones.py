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
from core.supabase_client import get_supabase_public_read
from routers.analytics_profiles import _season_match_ids
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


def _positioned_events_for_matches(
    supabase: Client, match_ids: list[int]
) -> list[dict[str, Any]]:
    if not match_ids:
        return []
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
    return rows


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
        match_ids = _season_match_ids(supabase, competition, season)
        rows = _positioned_events_for_matches(supabase, match_ids)
        zone_counts = aggregate_team_zones(rows)
        teams = [
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
        match_ids = _season_match_ids(supabase, competition, season)
        rows = _positioned_events_for_matches(supabase, match_ids)
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