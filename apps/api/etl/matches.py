from tqdm import tqdm

from etl.utils import fetch_json, STATSBOMB_BASE, COMPETITIONS_URL
from etl.competitions import get_available_seasons
from core.supabase_client import get_supabase_service_client

supabase = get_supabase_service_client()


def load_matches_for_season(competition_name: str, season_name: str, gender: str = "male", dry_run: bool = False) -> None:
    print(f"\n📥 Loading matches for {competition_name} - {season_name}...")

    available_seasons = get_available_seasons(competition_name, gender)
    matched_season = next(
        (s for s in available_seasons if s.strip().lower() == season_name.strip().lower()),
        None
    )

    if not matched_season:
        print(f"❌ Season '{season_name}' not found.")
        print(f"   Available seasons: {available_seasons}")
        return

    competitions = fetch_json(COMPETITIONS_URL)
    season_info = next(
        (c for c in competitions if c["competition_name"] == competition_name and c["season_name"] == matched_season),
        None
    )

    if not season_info:
        print("❌ Could not find season info.")
        return

    comp_id = season_info["competition_id"]
    season_id = season_info["season_id"]

    matches_url = f"{STATSBOMB_BASE}/matches/{comp_id}/{season_id}.json"
    matches = fetch_json(matches_url)

    comp_db_id = supabase.table("competitions").select("id").eq("name", competition_name).execute().data[0]["id"]
    season_db_id = supabase.table("seasons").select("id").eq("year", matched_season).execute().data[0]["id"]

    for match in tqdm(matches, desc="Matches", unit="match"):
        home_data = match.get("home_team", {})
        away_data = match.get("away_team", {})

        home_name = home_data.get("home_team_name") or home_data.get("name")
        away_name = away_data.get("away_team_name") or away_data.get("name")

        if not home_name or not away_name:
            continue

        if not dry_run:
            for team_name in [home_name, away_name]:
                supabase.table("teams").upsert({"name": team_name}, on_conflict="name").execute()

            home_id = supabase.table("teams").select("id").eq("name", home_name).execute().data[0]["id"]
            away_id = supabase.table("teams").select("id").eq("name", away_name).execute().data[0]["id"]

            match_data = {
                "competition_id": comp_db_id,
                "season_id": season_db_id,
                "home_team_id": home_id,
                "away_team_id": away_id,
                "match_date": match["match_date"],
                "home_score": match.get("home_score"),
                "away_score": match.get("away_score"),
                "match_week": match.get("match_week"),
                "statsbomb_match_id": match.get("match_id"),
            }
            supabase.table("matches").upsert(
                match_data,
                on_conflict="home_team_id,away_team_id,match_date"
            ).execute()

    if dry_run:
        print(f"🔍 [DRY RUN] Would load {len(matches)} matches.")
    else:
        print(f"✅ Loaded {len(matches)} matches for {competition_name} {matched_season}.")
