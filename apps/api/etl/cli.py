import argparse

from etl.competitions import load_competitions, load_seasons_for_competition
from etl.events import load_events_for_match, load_all_events
from etl.matches import load_matches_for_season
from etl.players import load_players_for_loaded_matches
from etl.presets import EXPANSION_DATASET, GUEST_DEMO_DATASET, RECOMMENDED_DATASETS
from etl.preflight import require_events_upsert_ready, verify_events_upsert_ready
from etl.season_pipeline import load_full_season


def main():
    parser = argparse.ArgumentParser(description="StatsBomb Data Loader for Soccer Analytics")
    parser.add_argument("--load-competitions", action="store_true", help="Load competitions")
    parser.add_argument("--load-seasons", action="store_true", help="Load seasons for a competition")
    parser.add_argument("--load-matches", action="store_true", help="Load matches for a season")
    parser.add_argument(
        "--load-season",
        action="store_true",
        help="Full pipeline for one season: competitions → seasons → matches → events → players",
    )
    parser.add_argument("--load-events", action="store_true", help="Load events for a specific match")
    parser.add_argument("--load-events-all", action="store_true", help="Load events for ALL matches (can be slow)")
    parser.add_argument("--load-players-for-matches", action="store_true", help="Load players from lineups of existing matches")
    parser.add_argument("--competition", type=str, default="La Liga", help="Competition name")
    parser.add_argument("--season", type=str, default="2020/2021", help="Season name (e.g. 2020/2021)")
    parser.add_argument("--gender", type=str, default="male", help="Competition gender (male/female)")
    parser.add_argument("--match-id", type=int, help="StatsBomb match ID")
    parser.add_argument("--dry-run", action="store_true", help="Preview without inserting data")
    parser.add_argument(
        "--skip-events",
        action="store_true",
        help="With --load-season, load metadata only (no events)",
    )
    parser.add_argument(
        "--skip-players",
        action="store_true",
        help="With --load-season, skip player lineup ingest",
    )
    parser.add_argument(
        "--preset",
        choices=["demo", "expansion"],
        help="Use a curated dataset: demo (La Liga 2020/21) or expansion (Premier League 2003/04)",
    )
    parser.add_argument("--list-presets", action="store_true", help="Show curated dataset presets")
    parser.add_argument(
        "--verify-etl",
        action="store_true",
        help="Check events upsert prerequisites (run before a long season load)",
    )

    args = parser.parse_args()
    dry_run = args.dry_run

    if args.list_presets:
        for preset in RECOMMENDED_DATASETS:
            print(f"- {preset.competition} · {preset.season} [{preset.role}]")
            if preset.description:
                print(f"  {preset.description}")
        return

    if args.verify_etl:
        verify_events_upsert_ready()
        print("✅ ETL preflight OK — events upsert is ready.")
        return

    if args.preset == "demo":
        args.competition = GUEST_DEMO_DATASET.competition
        args.season = GUEST_DEMO_DATASET.season
        args.gender = GUEST_DEMO_DATASET.gender
    elif args.preset == "expansion":
        args.competition = EXPANSION_DATASET.competition
        args.season = EXPANSION_DATASET.season
        args.gender = EXPANSION_DATASET.gender

    needs_event_preflight = (
        not dry_run
        and (
            args.load_events
            or args.load_events_all
            or (args.load_season and not args.skip_events)
        )
    )
    if needs_event_preflight:
        require_events_upsert_ready()

    if args.load_competitions:
        load_competitions(dry_run)
    elif args.load_season:
        load_full_season(
            args.competition,
            args.season,
            gender=args.gender,
            dry_run=dry_run,
            skip_events=args.skip_events,
            skip_players=args.skip_players,
        )
    elif args.load_seasons:
        load_seasons_for_competition(args.competition, args.gender, dry_run)
    elif args.load_matches:
        load_matches_for_season(args.competition, args.season, args.gender, dry_run)
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