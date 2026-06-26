from __future__ import annotations

from typing import Any

from analytics.xg import is_goal_outcome, shot_outcome


def _read_details(details: Any) -> dict[str, Any] | None:
    if not isinstance(details, dict):
        return None
    return details


def possession_id(details: Any) -> int | None:
    record = _read_details(details)
    if not record:
        return None
    raw = record.get("possession")
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def possession_team_name(details: Any) -> str | None:
    record = _read_details(details)
    if not record:
        return None
    team = record.get("possession_team")
    if isinstance(team, dict):
        name = team.get("name")
        return str(name) if name else None
    return None


def play_pattern_name(details: Any) -> str | None:
    record = _read_details(details)
    if not record:
        return None
    pattern = record.get("play_pattern")
    if isinstance(pattern, dict):
        name = pattern.get("name")
        return str(name) if name else None
    return None


def event_timestamp(minute: int | None, second: int | None) -> int:
    return (minute or 0) * 60 + (second or 0)


def is_pass_event(event_type: str | None) -> bool:
    return bool(event_type and "pass" in event_type.lower())


def is_shot_event(event_type: str | None) -> bool:
    return bool(event_type and "shot" in event_type.lower())


def shot_was_goal(details: Any) -> bool:
    return is_goal_outcome(shot_outcome(details))