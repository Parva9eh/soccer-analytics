"""
StatsBomb Open Data Loader (Complete Version)
---------------------------------------------
Supports: Competitions, Seasons, Matches, Players, and Events
"""

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

import httpx
from tqdm import tqdm
from typing import List, Dict, Any
from core.supabase_client import supabase
import argparse

STATSBOMB_BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
COMPETITIONS_URL = f"{STATSBOMB_BASE}/competitions.json"


def fetch_json(url: str) -> List[Dict[str, Any]]:
    try:
        response = httpx.get(url, timeout=60.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
        raise


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


def load_events_for_match(statsbomb_match_id: int, dry_run: bool = False) -> None:
    """Load events for one specific match with better summary."""
    import time
    start_time = time.time()

    print(f"\n📥 Loading events for match {statsbomb_match_id}...")

    events_url = f"{STATSBOMB_BASE}/events/{statsbomb_match_id}.json"
    try:
        events = fetch_json(events_url)
    except Exception as e:
        print(f"❌ Could not fetch events: {e}")
        return

    match_db = supabase.table("matches").select("id").eq("statsbomb_match_id", statsbomb_match_id).execute().data
    if not match_db:
        print("❌ Match not found in database.")
        return

    match_db_id = match_db[0]["id"]
    inserted = 0
    skipped = 0

    # Count event types for summary
    from collections import Counter
    event_type_counter = Counter()

    for event in tqdm(events, desc="Events", unit="event"):
        event_type = event.get("type", {}).get("name")
        event_type_counter[event_type] += 1

        location = event.get("location") or [None, None]

        end_location = None
        if "pass" in event and "end_location" in event["pass"]:
            end_location = event["pass"]["end_location"]
        elif "carry" in event and "end_location" in event["carry"]:
            end_location = event["carry"]["end_location"]
        elif "shot" in event and "end_location" in event["shot"]:
            end_location = event["shot"]["end_location"]

        data = {
            "match_id": match_db_id,
            "event_type": event_type,
            "minute": event.get("minute"),
            "second": event.get("second"),
            "x": location[0],
            "y": location[1],
            "end_x": end_location[0] if end_location else None,
            "end_y": end_location[1] if end_location else None,
            "details": event,
        }

        if dry_run:
            continue

        try:
            # Using upsert with DO NOTHING to avoid duplicate errors on re-runs
            supabase.table("events").upsert(
                data,
                on_conflict="match_id,minute,second,event_type"  # Adjust if needed
            ).execute()
            inserted += 1
        except Exception:
            skipped += 1

    duration = round(time.time() - start_time, 1)

    if dry_run:
        print(f"🔍 [DRY RUN] Would process {len(events)} events.")
    else:
        print(f"\n✅ Finished in {duration}s")
        print(f"   Total events in match: {len(events)}")
        print(f"   Successfully inserted: {inserted}")
        print(f"   Skipped (duplicates/errors): {skipped}")

        # Show top 5 event types
        print("\n   Top event types:")
        for event_type, count in event_type_counter.most_common(5):
            print(f"     - {event_type}: {count}")

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

def load_all_events(dry_run: bool = False) -> None:
    print("\n" + "="*70)
    print("⚠️  WARNING: Loading ALL events can be slow and generate a lot of data.")
    print("   Each match usually has 2,000 – 4,000+ events.")
    print("   Recommended: Load 2–5 matches first for testing.")
    print("="*70 + "\n")

    matches = supabase.table("matches").select("statsbomb_match_id").not_.is_("statsbomb_match_id", "null").execute().data

    for m in tqdm(matches, desc="Loading events for matches", unit="match"):
        sb_id = m["statsbomb_match_id"]
        load_events_for_match(sb_id, dry_run=dry_run)

    print("\n✅ Finished loading events for all matches.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="StatsBomb Data Loader for Soccer Analytics")
    parser.add_argument("--load-competitions", action="store_true", help="Load competitions")
    parser.add_argument("--load-seasons", action="store_true", help="Load seasons for a competition")
    parser.add_argument("--load-matches", action="store_true", help="Load matches for a season")
    parser.add_argument("--load-events", action="store_true", help="Load events for a specific match")
    parser.add_argument("--load-events-all", action="store_true", help="Load events for ALL matches (can be slow)")
    parser.add_argument("--load-players-for-matches", action="store_true", help="Load players from lineups of existing matches")
    parser.add_argument("--competition", type=str, default="La Liga", help="Competition name")
    parser.add_argument("--season", type=str, default="2020/2021", help="Season name (e.g. 2020/2021)")
    parser.add_argument("--match-id", type=int, help="StatsBomb match ID")
    parser.add_argument("--dry-run", action="store_true", help="Preview without inserting data")

    args = parser.parse_args()
    dry_run = args.dry_run

    if args.load_competitions:
        load_competitions(dry_run)
    elif args.load_seasons:
        load_seasons_for_competition(args.competition, dry_run)
    elif args.load_matches:
        load_matches_for_season(args.competition, args.season, dry_run)
    elif args.load_events:
        if not args.match_id:
            print("❌ Error: --match-id is required when using --load-events")
        else:
            load_events_for_match(args.match_id, dry_run)
    elif args.load_events_all:
        load_all_events(dry_run)
    elif args.load_players_for_matches:
        load_players_for_loaded_matches(dry_run)
    else:
        print("No action specified. Use --help for usage options.")

"""
# 1. Check available seasons
uv run python etl/statsbomb_loader.py --list-seasons

# 2. Load competitions + seasons + matches
uv run python etl/statsbomb_loader.py --load-all --season "2020/2021"

# 3. Load players from lineups
uv run python etl/statsbomb_loader.py --load-players

# 4. Load events for ONE match (recommended first)
uv run python etl/statsbomb_loader.py --load-events --match-id 303473

# 5. Load events for ALL matches (use with caution)
uv run python etl/statsbomb_loader.py --load-events-all

# 6. Dry run mode (safe testing)
uv run python etl/statsbomb_loader.py --load-players --dry-run
uv run python etl/statsbomb_loader.py --load-events --match-id 303473 --dry-run

# Run this command to see which matches you have:
uv run python -c "
from core.supabase_client import supabase
matches = supabase.table('matches').select('id, statsbomb_match_id, match_date').order('match_date').execute().data
for m in matches:
    print(f\"DB ID: {m['id']} | StatsBomb ID: {m['statsbomb_match_id']} | Date: {m['match_date']}\")
"

# Match 0: Earliest-season
uv run python etl/statsbomb_loader.py --load-events --match-id 3773593

📥 Loading events for match 3773593...
Events: 100%|██████████████████████████████████████████████| 4342/4342 [09:28<00:00,  7.63event/s]
✅ Inserted 4342 events for match 3773593.

# Match 1: Mid-season
uv run python etl/statsbomb_loader.py --load-events --match-id 3773523

📥 Loading events for match 3773523...
Events: 100%|██████████████████████████████████████████████| 3609/3609 [08:04<00:00,  7.44event/s]

✅ Finished in 486.4s
   Total events in match: 3609
   Successfully inserted: 0
   Skipped (duplicates/errors): 3609

   Top event types:
     - Pass: 1016
     - Ball Receipt*: 981
     - Carry: 738
     - Pressure: 397
     - Ball Recovery: 86

# Match 2: Late season
uv run python etl/statsbomb_loader.py --load-events --match-id 3773695

📥 Loading events for match 3773695...
Events: 100%|██████████████████████████████████████████████| 3831/3831 [07:43<00:00,  8.26event/s]

✅ Finished in 465.5s
   Total events in match: 3831
   Successfully inserted: 0
   Skipped (duplicates/errors): 3831

   Top event types:
     - Pass: 1188
     - Ball Receipt*: 1164
     - Carry: 902
     - Pressure: 198
     - Ball Recovery: 85

# Match 3: High-scoring
uv run python etl/statsbomb_loader.py --load-events --match-id 3773586

📥 Loading events for match 3773586...
Events: 100%|██████████████████████████████████████████████| 3953/3953 [10:07<00:00,  6.50event/s]

✅ Finished in 609.6s
   Total events in match: 3953
   Successfully inserted: 0
   Skipped (duplicates/errors): 3953

   Top event types:
     - Pass: 1113
     - Ball Receipt*: 1099
     - Carry: 931
     - Pressure: 354
     - Ball Recovery: 71

# 5 uv run python etl/statsbomb_loader.py --load-events --match-id 3773660

📥 Loading events for match 3773660...
Events: 100%|██████████████████████| 3743/3743 [10:33<00:00,  5.90event/s]

✅ Finished in 683.3s
   Total events in match: 3743
   Successfully inserted: 0
   Skipped (duplicates/errors): 3743

   Top event types:
     - Pass: 1123
     - Ball Receipt*: 1093
     - Carry: 839
     - Pressure: 251
     - Ball Recovery: 70

#6 uv run python etl/statsbomb_loader.py --load-events --match-id 3773377

📥 Loading events for match 3773377...
Events: 100%|██████████████████████| 3717/3717 [10:27<00:00,  5.92event/s]

✅ Finished in 630.4s
   Total events in match: 3717
   Successfully inserted: 0
   Skipped (duplicates/errors): 3717

   Top event types:
     - Pass: 1069
     - Ball Receipt*: 1036
     - Carry: 882
     - Pressure: 235
     - Ball Recovery: 85

#7 uv run python etl/statsbomb_loader.py --load-events --match-id 3773474

📥 Loading events for match 3773474...
Events: 100%|██████████████████████| 3955/3955 [10:56<00:00,  6.03event/s]

✅ Finished in 659.1s
   Total events in match: 3955
   Successfully inserted: 0
   Skipped (duplicates/errors): 3955

   Top event types:
     - Pass: 1088
     - Ball Receipt*: 1036
     - Carry: 948
     - Pressure: 374
     - Ball Recovery: 97

#8 uv run python etl/statsbomb_loader.py --load-events --match-id 3773369

📥 Loading events for match 3773369...
Events: 100%|██████████████████████| 4806/4806 [13:00<00:00,  6.15event/s]

✅ Finished in 783.6s
   Total events in match: 4806
   Successfully inserted: 0
   Skipped (duplicates/errors): 4806

   Top event types:
     - Pass: 1357
     - Ball Receipt*: 1335
     - Carry: 1206
     - Pressure: 453
     - Ball Recovery: 83

To tes:

uv run python -c "
from core.supabase_client import supabase

# Total events
total_events = supabase.table('events').select('id', count='exact').execute().count
print(f'Total Events: {total_events}')

# Events per match
print('\nEvents per match:')
result = supabase.table('events').select('match_id', count='exact').execute()
from collections import Counter
counts = Counter([e['match_id'] for e in result.data])
for match_id, count in sorted(counts.items()):
    print(f'  Match DB ID {match_id}: {count} events')
"
Result: 
Total Events: 5091

Events per match:
  Match DB ID 1: 749 events
  Match DB ID 8: 251 events

To load players for matches that already exist in the database:
To review first, add --dry-run flag to see which players would be loaded without actually inserting them:
uv run python etl/statsbomb_loader.py --load-players-for-matches --dry-run
uv run python etl/statsbomb_loader.py --load-players-for-matches

uv run python etl/statsbomb_loader.py --load-players-for-matches --dry-run

📥 Loading players from lineups of existing matches...
Found 35 matches in database. Fetching lineups...
Processing matches: 100%|█████████████████| 35/35 [00:10<00:00,  3.20it/s]
Total unique players found: 516
🔍 Dry run enabled. No data will be inserted.
  - #22 Florian Grégoire Claude Lejeune (Left Center Back)
  - #9 José Luis Sanmartín Mato (Right Center Forward)
  - #10 John Guidetti (None)
  - #3 Rubén Duarte Sánchez (Left Back)
  - #5 Víctor Laguardia Cisneros (Right Back)


"""
