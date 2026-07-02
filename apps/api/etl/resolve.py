from typing import List, Tuple

from etl.competitions import get_available_seasons
from etl.utils import fetch_json, COMPETITIONS_URL, STATSBOMB_BASE
from core.supabase_client import get_supabase_service_client

supabase = get_supabase_service_client()


def normalize_season_name(season_name: str, available: List[str]) -> str | None:
    target = season_name.strip().lower()
    return next((s for s in available if s.strip().lower() == target), None)


def resolve_statsbomb_competition_season(
    competition_name: str,
    season_name: str,
    gender: str = "male",
) -> Tuple[int, int, str]:
    """Return StatsBomb competition_id, season_id, and canonical season_name."""
    available = get_available_seasons(competition_name, gender)
    matched = normalize_season_name(season_name, available)
    if not matched:
        raise ValueError(
            f"Season '{season_name}' not found for {competition_name}. "
            f"Available: {available}"
        )

    competitions = fetch_json(COMPETITIONS_URL)
    season_info = next(
        (
            c
            for c in competitions
            if c["competition_name"] == competition_name
            and c["season_name"] == matched
            and c.get("competition_gender") == gender
        ),
        None,
    )
    if not season_info:
        raise ValueError(f"Could not resolve StatsBomb ids for {competition_name} {matched}")

    return season_info["competition_id"], season_info["season_id"], matched


def resolve_db_competition_season_ids(
    competition_name: str,
    season_name: str,
    gender: str = "male",
) -> Tuple[int, int, str, str]:
    """Return DB competition_id, season_id, and canonical names."""
    available = get_available_seasons(competition_name, gender)
    matched = normalize_season_name(season_name, available)
    if not matched:
        raise ValueError(
            f"Season '{season_name}' not found for {competition_name}. "
            f"Available: {available}"
        )

    comp_result = (
        supabase.table("competitions")
        .select("id, name")
        .eq("name", competition_name)
        .limit(1)
        .execute()
    )
    if not comp_result.data:
        raise ValueError(f"Competition '{competition_name}' not found in database")

    comp_db_id = comp_result.data[0]["id"]
    season_result = (
        supabase.table("seasons")
        .select("id, year")
        .eq("competition_id", comp_db_id)
        .eq("year", matched)
        .limit(1)
        .execute()
    )
    if not season_result.data:
        raise ValueError(
            f"Season '{matched}' not found in database for {competition_name}"
        )

    season_db_id = season_result.data[0]["id"]
    return comp_db_id, season_db_id, competition_name, matched


def list_statsbomb_match_ids_for_season(
    competition_name: str,
    season_name: str,
    gender: str = "male",
) -> List[int]:
    comp_id, season_id, matched = resolve_statsbomb_competition_season(
        competition_name, season_name, gender
    )
    matches_url = f"{STATSBOMB_BASE}/matches/{comp_id}/{season_id}.json"
    matches = fetch_json(matches_url)
    return [m["match_id"] for m in matches if m.get("match_id") is not None]


def list_db_statsbomb_match_ids_for_season(
    competition_name: str,
    season_name: str,
    gender: str = "male",
) -> List[int]:
    comp_db_id, season_db_id, _, _ = resolve_db_competition_season_ids(
        competition_name, season_name, gender
    )
    result = (
        supabase.table("matches")
        .select("statsbomb_match_id")
        .eq("competition_id", comp_db_id)
        .eq("season_id", season_db_id)
        .not_.is_("statsbomb_match_id", "null")
        .execute()
    )
    return [row["statsbomb_match_id"] for row in result.data or []]