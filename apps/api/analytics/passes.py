from __future__ import annotations

from typing import Any

PROGRESSIVE_PASS_THRESHOLD = 10.0


def _read_details(details: Any) -> dict[str, Any] | None:
    if not isinstance(details, dict):
        return None
    return details


def pass_team_name(details: Any) -> str | None:
    record = _read_details(details)
    if not record:
        return None
    team = record.get("team")
    if isinstance(team, dict):
        name = team.get("name")
        return str(name) if name else None
    return None


def pass_player_name(details: Any) -> str | None:
    record = _read_details(details)
    if not record:
        return None
    player = record.get("player")
    if isinstance(player, dict):
        name = player.get("name")
        return str(name) if name else None
    return None


def pass_player_id(details: Any) -> int | None:
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


def pass_recipient_name(details: Any) -> str | None:
    record = _read_details(details)
    if not record:
        return None
    pass_block = record.get("pass")
    if not isinstance(pass_block, dict):
        return None
    recipient = pass_block.get("recipient")
    if isinstance(recipient, dict):
        name = recipient.get("name")
        return str(name) if name else None
    return None


def pass_recipient_id(details: Any) -> int | None:
    record = _read_details(details)
    if not record:
        return None
    pass_block = record.get("pass")
    if not isinstance(pass_block, dict):
        return None
    recipient = pass_block.get("recipient")
    if isinstance(recipient, dict) and recipient.get("id") is not None:
        try:
            return int(recipient["id"])
        except (TypeError, ValueError):
            return None
    return None


def is_completed_pass(details: Any) -> bool:
    record = _read_details(details)
    if not record:
        return False
    pass_block = record.get("pass")
    if not isinstance(pass_block, dict):
        return False
    outcome = pass_block.get("outcome")
    if isinstance(outcome, dict):
        name = outcome.get("name")
        if name in {"Incomplete", "Out", "Pass Offside"}:
            return False
    return pass_recipient_name(details) is not None


def infer_team_attacks_high_x(team_pass_x_values: list[float]) -> bool:
    """True when the team predominantly operates in the left half (attacks toward x=120)."""
    if not team_pass_x_values:
        return True
    avg_x = sum(team_pass_x_values) / len(team_pass_x_values)
    return avg_x < 60.0


def is_progressive_pass(
    x: float | None,
    end_x: float | None,
    attacks_high_x: bool,
) -> bool:
    if x is None or end_x is None:
        return False
    if attacks_high_x:
        return end_x - x >= PROGRESSIVE_PASS_THRESHOLD
    return x - end_x >= PROGRESSIVE_PASS_THRESHOLD