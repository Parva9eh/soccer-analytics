from __future__ import annotations

from typing import Any


def _read_details(details: Any) -> dict[str, Any] | None:
    if not isinstance(details, dict):
        return None
    return details


def event_player_id(details: Any) -> int | None:
    record = _read_details(details)
    if not record:
        return None
    player = record.get("player")
    if isinstance(player, dict) and player.get("id") is not None:
        try:
            return int(player["id"])
        except (TypeError, ValueError):
            return None
    return None


def event_player_name(details: Any) -> str | None:
    record = _read_details(details)
    if not record:
        return None
    player = record.get("player")
    if isinstance(player, dict):
        name = player.get("name")
        return str(name) if name else None
    return None


def event_team_name(details: Any) -> str | None:
    record = _read_details(details)
    if not record:
        return None
    team = record.get("team")
    if isinstance(team, dict):
        name = team.get("name")
        return str(name) if name else None
    return None