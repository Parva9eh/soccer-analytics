"""Canonical competition/season → match-id resolution for analytics routers."""

from __future__ import annotations

from typing import Any

from supabase import Client


def resolve_season_ids(
    supabase: Client, competition: str, season: str
) -> tuple[int, int] | None:
    """Return (competition_id, season_id) or None if either is missing."""
    comp = (
        supabase.table("competitions")
        .select("id")
        .eq("name", competition)
        .limit(1)
        .execute()
    )
    if not comp.data:
        return None

    comp_id = int(comp.data[0]["id"])
    season_row = (
        supabase.table("seasons")
        .select("id")
        .eq("competition_id", comp_id)
        .eq("year", season)
        .limit(1)
        .execute()
    )
    if not season_row.data:
        return None

    return comp_id, int(season_row.data[0]["id"])


def resolve_season_match_ids(
    supabase: Client, competition: str, season: str
) -> list[int]:
    """Match primary keys for a competition + season year (RLS-scoped)."""
    resolved = resolve_season_ids(supabase, competition, season)
    if resolved is None:
        return []

    comp_id, season_id = resolved
    matches = (
        supabase.table("matches")
        .select("id")
        .eq("competition_id", comp_id)
        .eq("season_id", season_id)
        .execute()
    )
    return [int(row["id"]) for row in matches.data or [] if row.get("id") is not None]


def list_season_match_rows(
    supabase: Client, competition: str, season: str
) -> list[dict[str, Any]]:
    """Full match rows for a season (with team embeds)."""
    resolved = resolve_season_ids(supabase, competition, season)
    if resolved is None:
        return []

    comp_id, season_id = resolved
    matches = (
        supabase.table("matches")
        .select(
            "id, match_date, home_score, away_score, "
            "home_team:teams!home_team_id(name), "
            "away_team:teams!away_team_id(name)"
        )
        .eq("competition_id", comp_id)
        .eq("season_id", season_id)
        .execute()
    )
    return matches.data or []
