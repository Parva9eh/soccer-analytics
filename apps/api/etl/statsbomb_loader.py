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
from core.supabase_client import get_supabase_service_client

from etl.utils import fetch_json, STATSBOMB_BASE, COMPETITIONS_URL
from etl.competitions import (
    get_available_seasons,
    load_competitions,
    load_seasons_for_competition,
)
from etl.matches import load_matches_for_season
from etl.players import load_players, load_players_for_loaded_matches

supabase = get_supabase_service_client()
import argparse


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
