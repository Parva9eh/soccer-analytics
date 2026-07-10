"""Paginated event fetches — avoid silent PostgREST max-row truncation."""

from __future__ import annotations

from typing import Any, Sequence

from supabase import Client

# Match PostgREST default max-rows; always page until short batch.
PAGE_SIZE = 1000


def fetch_events_paginated(
    supabase: Client,
    columns: str,
    *,
    match_ids: Sequence[int] | None = None,
    match_id: int | None = None,
    event_type: str | None = None,
    order: bool = False,
) -> list[dict[str, Any]]:
    """
    Load all matching event rows via range pagination.

    Use this for season aggregates and any multi-match pull where a single
    `.execute()` would silently cap at ~1000 rows.
    """
    if match_ids is not None and len(match_ids) == 0:
        return []
    if match_id is None and match_ids is None:
        return []

    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        query = supabase.table("events").select(columns)
        if match_id is not None:
            query = query.eq("match_id", match_id)
        if match_ids is not None:
            query = query.in_("match_id", list(match_ids))
        if event_type is not None:
            query = query.eq("event_type", event_type)
        if order:
            query = query.order("minute").order("second").order("id")
        batch = (
            query.range(offset, offset + PAGE_SIZE - 1).execute().data or []
        )
        rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return rows
