from typing import List, Dict, Any
import httpx

STATSBOMB_BASE = "https://raw.githubusercontent.com/statsbomb/open-data/master/data"
COMPETITIONS_URL = f"{STATSBOMB_BASE}/competitions.json"


def fetch_json(url: str) -> List[Dict[str, Any]]:
    """Fetch JSON data from a URL with basic error handling."""
    try:
        response = httpx.get(url, timeout=60.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"❌ Error fetching {url}: {e}")
        raise
