import argparse

from etl.competitions import load_competitions, load_seasons_for_competition
from etl.matches import load_matches_for_season
from etl.players import load_players_for_loaded_matches
from etl.events import load_events_for_match, load_all_events


def main():
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


if __name__ == "__main__":
    main()
