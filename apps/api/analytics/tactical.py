from __future__ import annotations

from typing import Any

SET_PIECE_PATTERNS = (
    "From Corner",
    "From Free Kick",
    "From Throw In",
    "From Goal Kick",
    "From Penalty",
    "From Kick Off",
)


def play_pattern_name(details: Any) -> str | None:
    if not isinstance(details, dict):
        return None
    pattern = details.get("play_pattern")
    if isinstance(pattern, dict):
        name = pattern.get("name")
        return str(name) if name else None
    return None


def is_set_piece_pattern(pattern: str | None) -> bool:
    if not pattern:
        return False
    return any(marker in pattern for marker in SET_PIECE_PATTERNS)


def is_counter_pattern(pattern: str | None) -> bool:
    return bool(pattern and "Counter" in pattern)


def is_final_third_location(x: float | None) -> bool:
    if x is None:
        return False
    return x >= 80 or x <= 40