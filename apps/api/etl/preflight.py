"""Pre-flight checks before long-running StatsBomb event ingest."""

from __future__ import annotations

import sys
import uuid

from core.supabase_client import get_supabase_service_client

EVENTS_MIGRATION = "supabase/migrations/20250606000000_events_statsbomb_event_id.sql"
EVENTS_CONSTRAINT_FIX = (
    "supabase/migrations/20250606001000_events_statsbomb_event_id_constraint_fix.sql"
)


class EtlPreflightError(RuntimeError):
    """ETL cannot safely write events."""


def verify_events_upsert_ready() -> None:
    """
    Confirm events.statsbomb_event_id exists and PostgREST upsert works.

    PostgREST requires a UNIQUE CONSTRAINT (not a partial unique index).
    Without it, bulk loads report Upserted: 0 for every match (42P10).
    """
    supabase = get_supabase_service_client()

    try:
        supabase.table("events").select("statsbomb_event_id").limit(1).execute()
    except Exception as exc:
        raise EtlPreflightError(
            "events.statsbomb_event_id column is missing. "
            f"Apply {EVENTS_MIGRATION} in Supabase SQL Editor."
        ) from exc

    match_row = (
        supabase.table("matches")
        .select("id")
        .not_.is_("statsbomb_match_id", "null")
        .limit(1)
        .execute()
        .data
    )
    if not match_row:
        raise EtlPreflightError(
            "No matches in database — load matches before events."
        )

    match_id = match_row[0]["id"]
    probe_id = str(uuid.uuid4())

    try:
        supabase.table("events").upsert(
            {
                "match_id": match_id,
                "statsbomb_event_id": probe_id,
                "event_type": "ETL Preflight",
                "minute": 0,
                "second": 0,
                "details": {"preflight": True},
            },
            on_conflict="statsbomb_event_id",
        ).execute()
    except Exception as exc:
        message = str(exc)
        if "42P10" in message or "no unique or exclusion constraint" in message:
            raise EtlPreflightError(
                "Events upsert preflight failed (42P10): missing UNIQUE CONSTRAINT on "
                "statsbomb_event_id. A partial unique index is not enough for PostgREST.\n"
                f"Run SQL from {EVENTS_CONSTRAINT_FIX} in Supabase SQL Editor, then "
                "`uv run python -m etl.cli --verify-etl`."
            ) from exc
        raise EtlPreflightError(f"Events upsert preflight failed: {exc}") from exc

    try:
        supabase.table("events").delete().eq("statsbomb_event_id", probe_id).execute()
    except Exception:
        # Non-fatal; probe row is harmless if delete fails.
        pass


def require_events_upsert_ready() -> None:
    """Exit with code 1 and a clear message when preflight fails."""
    try:
        verify_events_upsert_ready()
    except EtlPreflightError as exc:
        print(f"\n❌ ETL preflight failed: {exc}\n", file=sys.stderr)
        raise SystemExit(1) from exc