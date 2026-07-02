-- Stable StatsBomb event UUID for idempotent ETL upserts.
-- PostgREST upsert requires a matching unique constraint (see etl/events.py).

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS statsbomb_event_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS events_statsbomb_event_id_unique
  ON public.events (statsbomb_event_id)
  WHERE statsbomb_event_id IS NOT NULL;

COMMENT ON COLUMN public.events.statsbomb_event_id IS
  'StatsBomb open-data event id; used for ETL upsert deduplication.';