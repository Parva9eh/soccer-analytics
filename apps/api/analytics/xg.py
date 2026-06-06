from __future__ import annotations

from typing import Any


def shot_xg_from_details(details: Any) -> float | None:
    if not isinstance(details, dict):
        return None
    shot = details.get("shot")
    if not isinstance(shot, dict):
        return None
    raw = shot.get("statsbomb_xg")
    if raw is None:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def shot_team_name(details: Any) -> str | None:
    if not isinstance(details, dict):
        return None
    team = details.get("team")
    if isinstance(team, dict):
        name = team.get("name")
        return str(name) if name else None
    return None


def shot_player_name(details: Any) -> str | None:
    if not isinstance(details, dict):
        return None
    player = details.get("player")
    if isinstance(player, dict):
        name = player.get("name")
        return str(name) if name else None
    return None


def shot_outcome(details: Any) -> str | None:
    if not isinstance(details, dict):
        return None
    shot = details.get("shot")
    if not isinstance(shot, dict):
        return None
    outcome = shot.get("outcome")
    if isinstance(outcome, dict):
        name = outcome.get("name")
        return str(name) if name else None
    return None


def is_goal_outcome(outcome: str | None) -> bool:
    return outcome == "Goal"