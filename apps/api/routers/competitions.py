import logging

from fastapi import APIRouter, Depends
from supabase import Client

from core.auth import AuthUser
from core.deps import get_current_user_required
from core.supabase_client import get_supabase_public_read, get_supabase_service_client
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
    supabase: Client = Depends(get_supabase_public_read),
) -> list[CompetitionCatalogItem]:
    """List competitions and their seasons for UI filters."""
    try:
        return _build_catalog_from_supabase(supabase)

    except Exception:
        logger.exception("Error in list_competitions_catalog")
        raise_http_exception(
            status_code=500,
            detail="Failed to fetch competitions catalog",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )


def _loaded_season_ids(supabase: Client) -> set[int]:
    match_result = supabase.table("matches").select("season_id").execute()
    return {
        row["season_id"]
        for row in match_result.data or []
        if row.get("season_id") is not None
    }


def _build_catalog_from_supabase(
    supabase: Client,
    *,
    match_loaded_only: bool = False,
) -> list[CompetitionCatalogItem]:
    comp_result = (
        supabase.table("competitions")
        .select("id, name")
        .order("name")
        .execute()
    )
    competitions = comp_result.data or []

    season_result = (
        supabase.table("seasons")
        .select("id, competition_id, year")
        .order("year")
        .execute()
    )
    loaded_season_ids = _loaded_season_ids(supabase) if match_loaded_only else None
    seasons_by_comp: dict[int, list[str]] = {}
    for row in season_result.data or []:
        season_id = row.get("id")
        comp_id = row.get("competition_id")
        year = row.get("year")
        if comp_id is None or not year or season_id is None:
            continue
        if loaded_season_ids is not None and season_id not in loaded_season_ids:
            continue
        seasons_by_comp.setdefault(comp_id, []).append(year)

    catalog: list[CompetitionCatalogItem] = []
    for comp in competitions:
        comp_id = comp.get("id")
        name = comp.get("name")
        if comp_id is None or not name:
            continue
        seasons = seasons_by_comp.get(comp_id, [])
        if not seasons:
            continue
        catalog.append(CompetitionCatalogItem(name=name, seasons=seasons))

    return catalog


@router.get(
    "/inventory",
    response_model=list[CompetitionCatalogItem],
    responses=COMMON_ERROR_RESPONSES,
)
def list_competitions_inventory(
    _user: AuthUser = Depends(get_current_user_required),
) -> list[CompetitionCatalogItem]:
    """All competition seasons loaded in the database (for workspace dataset linking)."""
    try:
        supabase = get_supabase_service_client()
        return _build_catalog_from_supabase(supabase, match_loaded_only=True)
    except Exception:
        logger.exception("Error in list_competitions_inventory")
        raise_http_exception(
            status_code=500,
            detail="Failed to fetch competitions inventory",
            code=ErrorCode.INTERNAL_SERVER_ERROR,
        )