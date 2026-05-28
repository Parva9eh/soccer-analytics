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


if __name__ == "__main__":
    from etl import cli
    cli.main()
