from etl.competitions import load_competitions, load_seasons_for_competition
from etl.events import load_events_for_match
from etl.preflight import require_events_upsert_ready
from etl.matches import load_matches_for_season
from etl.players import load_players_for_statsbomb_match_ids
from etl.resolve import list_db_statsbomb_match_ids_for_season


def load_full_season(
    competition_name: str,
    season_name: str,
    *,
    gender: str = "male",
    dry_run: bool = False,
    skip_events: bool = False,
    skip_players: bool = False,
    ensure_competitions: bool = True,
) -> None:
    """
    Load one StatsBomb competition season end-to-end:
    competitions (optional) → seasons → matches → events → players.
    """
    print("\n" + "=" * 70)
    print(f"📦 Loading season: {competition_name} · {season_name}")
    print("=" * 70)

    if ensure_competitions:
        load_competitions(dry_run=dry_run)

    load_seasons_for_competition(competition_name, gender=gender, dry_run=dry_run)
    load_matches_for_season(
        competition_name,
        season_name,
        gender=gender,
        dry_run=dry_run,
    )

    if dry_run:
        print("\n🔍 [DRY RUN] Skipping events and players.")
        return

    if not skip_events:
        require_events_upsert_ready()
        match_ids = list_db_statsbomb_match_ids_for_season(
            competition_name,
            season_name,
            gender=gender,
        )
        if not match_ids:
            print("⚠️  No matches found in database for this season.")
        else:
            print(f"\n📥 Loading events for {len(match_ids)} matches...")
            for sb_id in match_ids:
                load_events_for_match(sb_id, dry_run=False)

    if not skip_players:
        match_ids = list_db_statsbomb_match_ids_for_season(
            competition_name,
            season_name,
            gender=gender,
        )
        load_players_for_statsbomb_match_ids(match_ids, dry_run=False)

    print(f"\n✅ Season load complete: {competition_name} · {season_name}")