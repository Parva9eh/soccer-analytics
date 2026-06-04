import logging

from fastapi import APIRouter, Depends
from supabase import Client

from core.supabase_client import get_supabase
from schemas.competition import CompetitionCatalogItem
from schemas.error import ErrorCode, COMMON_ERROR_RESPONSES, raise_http_exception

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/competitions", tags=["Competitions"])


@router.get(
    "/",
    response_model=list[CompetitionCatalogItem],
    responses=COMMON_ERROR_RESPONSES,
)
def list_competitions_catalog(
    supabase: Client = Depends(get_supabase),
) -> list[CompetitionCatalogItem]:
    """List competitions and their seasons for UI filters."""
    try:
        comp_result = (
            supabase.table("competitions")
            .select("id, name")
            .order("name")
            .execute()
        )
        competitions = comp_result.data or []

        season_result = (
            supabase.table("seasons")
            .select("competition_id, year")
            .order("year")
            .execute()
        )
        seasons_by_comp: dict[int, list[str]] = {}
        for row in season_result.data or []:
            comp_id = row.get("competition_id")
            year = row.get("year")
            if comp_id is None or not year:
                continue
            seasons_by_comp.setdefault(comp_id, []).append(year)

        catalog: list[CompetitionCatalogItem] = []
        for comp in competitions:
            comp_id = comp.get("id")
            name = comp.get("name")
            if comp_id is None or not name:
                continue
            catalog.append(
                CompetitionCatalogItem(
                    name=name,
                    seasons=seasons_by_comp.get(comp_id, []),
                )
            )

        return catalog

    except Exception:
        logger.exception("Error in list_competitions_catalog")
        raise_http_exception(
            status_code=500,
            detail="Failed to fetch competitions catalog",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )