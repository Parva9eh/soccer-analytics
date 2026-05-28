from tqdm import tqdm

from etl.utils import fetch_json, STATSBOMB_BASE
from core.supabase_client import get_supabase_service_client

supabase = get_supabase_service_client()


def load_players(dry_run: bool = False) -> None:
    print("\n📥 Loading players from lineups...")
    matches = supabase.table("matches").select("statsbomb_match_id").not_.is_("statsbomb_match_id", "null").execute().data

    if not matches:
        print("⚠️  No matches with statsbomb_match_id found. Load matches first.")
        return

    inserted = 0
    for m in tqdm(matches, desc="Processing matches", unit="match"):
        sb_match_id = m["statsbomb_match_id"]
        lineup_url = f"{STATSBOMB_BASE}/lineups/{sb_match_id}.json"
        try:
            lineups = fetch_json(lineup_url)
        except Exception:
            continue

        for team in lineups:
            for player in team.get("lineup", []):
                data = {
                    "name": player.get("player_name"),
                    "position": player.get("positions", [{}])[0].get("position") if player.get("positions") else None,
                }
                if dry_run or not data["name"]:
                    continue
                try:
                    supabase.table("players").upsert(data, on_conflict="name").execute()
                    inserted += 1
                except Exception:
                    pass

    if dry_run:
        print(f"🔍 [DRY RUN] Would process players from {len(matches)} matches.")
    else:
        print(f"✅ Players loaded/updated: {inserted}")


def load_players_for_loaded_matches(dry_run: bool = False):
    """Load players from lineups of matches that already exist in the database."""
    print("\n📥 Loading players from lineups of existing matches...")

    # 1. Get all matches we already have
    matches_result = supabase.table("matches").select("statsbomb_match_id").execute()
    if not matches_result.data:
        print("❌ No matches found in database. Load matches first.")
        return

    match_ids = [m["statsbomb_match_id"] for m in matches_result.data]
    print(f"Found {len(match_ids)} matches in database. Fetching lineups...")

    all_players = {}  # Deduplicate by statsbomb_player_id

    for match_id in tqdm(match_ids, desc="Processing matches"):
        url = f"https://raw.githubusercontent.com/statsbomb/open-data/master/data/lineups/{match_id}.json"
        lineup_data = fetch_json(url)

        if not lineup_data:
            continue

        for team in lineup_data:
            for player in team.get("lineup", []):
                player_id = player.get("player_id")
                if not player_id:
                    continue

                # Get first position if available
                positions = player.get("positions", [])
                position = positions[0].get("position") if positions else None

                all_players[player_id] = {
                    "statsbomb_player_id": player_id,
                    "name": player.get("player_name"),
                    "position": position,
                    "jersey_number": player.get("jersey_number"),
                    "nationality": player.get("country", {}).get("name") if player.get("country") else None,
                }

    if not all_players:
        print("⚠️ No players found in lineups.")
        return

    print(f"Total unique players found: {len(all_players)}")

    if dry_run:
        print("🔍 Dry run enabled. No data will be inserted.")
        for pid, p in list(all_players.items())[:5]:
            print(f"  - #{p.get('jersey_number')} {p['name']} ({p['position']})")
        return

    # 2. Upsert players
    data_to_insert = list(all_players.values())
    result = supabase.table("players").upsert(
        data_to_insert,
        on_conflict="statsbomb_player_id"
    ).execute()

    print(f"✅ Players loaded/updated: {len(data_to_insert)}")
