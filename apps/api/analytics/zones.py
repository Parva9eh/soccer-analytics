from __future__ import annotations

from collections import defaultdict
from typing import Any

from analytics.players import event_team_name
from analytics.possession import possession_team_name

PITCH_LENGTH_U = 120.0
PITCH_WIDTH_U = 80.0
HEATMAP_COLS = 12
HEATMAP_ROWS = 8


def team_name_from_details(details: Any) -> str | None:
    return event_team_name(details) or possession_team_name(details)


def pitch_zone_from_x(x: float | None) -> str | None:
    if x is None:
        return None
    if x < PITCH_LENGTH_U / 3:
        return "left_third"
    if x < (PITCH_LENGTH_U * 2) / 3:
        return "middle_third"
    return "right_third"


def heatmap_bin(x: float, y: float) -> tuple[int, int]:
    col = min(
        HEATMAP_COLS - 1,
        max(0, int((x / PITCH_LENGTH_U) * HEATMAP_COLS)),
    )
    row = min(
        HEATMAP_ROWS - 1,
        max(0, int((y / PITCH_WIDTH_U) * HEATMAP_ROWS)),
    )
    return col, row


def aggregate_team_zones(
    rows: list[dict[str, Any]],
) -> dict[str, dict[str, int]]:
    counts: dict[str, dict[str, int]] = defaultdict(
        lambda: {
            "left_third": 0,
            "middle_third": 0,
            "right_third": 0,
            "total_events": 0,
        }
    )
    for row in rows:
        x = row.get("x")
        if x is None:
            continue
        team = team_name_from_details(row.get("details"))
        if not team:
            continue
        zone = pitch_zone_from_x(float(x))
        if not zone:
            continue
        counts[team][zone] += 1
        counts[team]["total_events"] += 1
    return counts


def aggregate_team_heatmap(
    rows: list[dict[str, Any]],
    team: str,
) -> tuple[dict[tuple[int, int], int], int]:
    bins: dict[tuple[int, int], int] = defaultdict(int)
    total = 0
    for row in rows:
        x = row.get("x")
        y = row.get("y")
        if x is None or y is None:
            continue
        row_team = team_name_from_details(row.get("details"))
        if row_team != team:
            continue
        col, row_idx = heatmap_bin(float(x), float(y))
        bins[(col, row_idx)] += 1
        total += 1
    return bins, total