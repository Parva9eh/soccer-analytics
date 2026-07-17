"""Possession chain building — domain logic owned by services (not routers)."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any

from analytics.possession import (
    event_timestamp,
    is_pass_event,
    is_shot_event,
    play_pattern_name,
    possession_id,
    possession_team_name,
    shot_was_goal,
)
from schemas.possession import PossessionChainSummary, TeamPossessionSummary


@dataclass
class ChainAccumulator:
    possession_id: int
    team: str
    event_count: int = 0
    pass_count: int = 0
    start_ts: int = 0
    end_ts: int = 0
    start_minute: int | None = None
    end_minute: int | None = None
    play_pattern: str | None = None
    ended_with_shot: bool = False
    ended_with_goal: bool = False
    event_ids: list[int] = field(default_factory=list)


def build_possession_chains(
    event_rows: list[dict[str, Any]], team_filter: str | None = None
) -> list[PossessionChainSummary]:
    grouped: dict[tuple[int, str], ChainAccumulator] = {}

    for row in event_rows:
        details = row.get("details")
        pid = possession_id(details)
        team = possession_team_name(details)
        if pid is None or not team:
            continue
        if team_filter and team != team_filter:
            continue

        key = (pid, team)
        chain = grouped.get(key)
        ts = event_timestamp(row.get("minute"), row.get("second"))
        minute = row.get("minute")

        if chain is None:
            chain = ChainAccumulator(
                possession_id=pid,
                team=team,
                start_ts=ts,
                end_ts=ts,
                start_minute=minute,
                end_minute=minute,
                play_pattern=play_pattern_name(details),
            )
            grouped[key] = chain

        chain.event_count += 1
        if is_pass_event(row.get("event_type")):
            chain.pass_count += 1
        chain.end_ts = max(chain.end_ts, ts)
        chain.end_minute = minute
        if chain.play_pattern is None:
            chain.play_pattern = play_pattern_name(details)

        event_id = row.get("id")
        if event_id is not None:
            chain.event_ids.append(int(event_id))

        if is_shot_event(row.get("event_type")):
            chain.ended_with_shot = True
            if shot_was_goal(details):
                chain.ended_with_goal = True

    summaries: list[PossessionChainSummary] = []
    for chain in grouped.values():
        duration = max(chain.end_ts - chain.start_ts, 0)
        summaries.append(
            PossessionChainSummary(
                possession_id=chain.possession_id,
                team=chain.team,
                event_count=chain.event_count,
                pass_count=chain.pass_count,
                duration_seconds=duration,
                start_minute=chain.start_minute,
                end_minute=chain.end_minute,
                play_pattern=chain.play_pattern,
                ended_with_shot=chain.ended_with_shot,
                ended_with_goal=chain.ended_with_goal,
                event_ids=chain.event_ids,
            )
        )

    summaries.sort(
        key=lambda item: (item.pass_count, item.duration_seconds),
        reverse=True,
    )
    return summaries


def aggregate_team_possession(
    chains: list[PossessionChainSummary],
) -> dict[str, TeamPossessionSummary]:
    buckets: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {
            "possessions": 0,
            "duration_total": 0,
            "pass_total": 0,
            "shot_endings": 0,
        }
    )

    for chain in chains:
        bucket = buckets[chain.team]
        bucket["possessions"] = int(bucket["possessions"]) + 1
        bucket["duration_total"] = int(bucket["duration_total"]) + chain.duration_seconds
        bucket["pass_total"] = int(bucket["pass_total"]) + chain.pass_count
        if chain.ended_with_shot:
            bucket["shot_endings"] = int(bucket["shot_endings"]) + 1

    summaries: dict[str, TeamPossessionSummary] = {}
    for team, bucket in buckets.items():
        possessions = int(bucket["possessions"])
        if possessions == 0:
            continue
        summaries[team] = TeamPossessionSummary(
            team=team,
            possessions=possessions,
            avg_duration_seconds=round(
                int(bucket["duration_total"]) / possessions, 1
            ),
            avg_passes_per_possession=round(
                int(bucket["pass_total"]) / possessions, 1
            ),
            shot_possession_rate=round(
                int(bucket["shot_endings"]) / possessions, 3
            ),
        )
    return summaries
