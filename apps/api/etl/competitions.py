from typing import List
from tqdm import tqdm

from etl.utils import fetch_json, COMPETITIONS_URL
from core.supabase_client import get_supabase_service_client

supabase = get_supabase_service_client()


def get_available_seasons(competition_name: str, gender: str = "male") -> List[str]:
    competitions = fetch_json(COMPETITIONS_URL)
    return [
        c["season_name"]
        for c in competitions
        if c["competition_name"] == competition_name and c["competition_gender"] == gender
    ]


def load_competitions(dry_run: bool = False) -> None:
    print("\n📥 Loading competitions from StatsBomb...")
    competitions = fetch_json(COMPETITIONS_URL)
    inserted, skipped = 0, 0

    for comp in tqdm(competitions, desc="Competitions", unit="comp"):
        data = {
            "name": comp["competition_name"],
            "country": comp.get("country_name"),
            "type": "League" if "League" in comp.get("competition_name", "") else "Cup",
            "gender": comp.get("competition_gender"),
        }
        if dry_run:
            continue
        try:
            supabase.table("competitions").upsert(data, on_conflict="name").execute()
            inserted += 1
        except Exception:
            skipped += 1

    if dry_run:
        print(f"🔍 [DRY RUN] Would process {len(competitions)} competitions.")
    else:
        print(f"✅ Competitions loaded. Inserted/Updated: {inserted}, Skipped: {skipped}")


def load_seasons_for_competition(competition_name: str, gender: str = "male", dry_run: bool = False) -> None:
    print(f"\n📥 Loading seasons for '{competition_name}'...")
    seasons = get_available_seasons(competition_name, gender)

    if not seasons:
        print(f"⚠️  No seasons found for {competition_name}")
        return

    comp_result = supabase.table("competitions").select("id").eq("name", competition_name).execute()
    if not comp_result.data:
        print(f"❌ Competition '{competition_name}' not found in DB.")
        return

    db_comp_id = comp_result.data[0]["id"]

    for season_name in tqdm(seasons, desc="Seasons", unit="season"):
        data = {"competition_id": db_comp_id, "year": season_name}
        if not dry_run:
            supabase.table("seasons").upsert(data, on_conflict="competition_id,year").execute()

    if dry_run:
        print(f"🔍 [DRY RUN] Would load {len(seasons)} seasons.")
    else:
        print(f"✅ Loaded {len(seasons)} seasons for {competition_name}.")
