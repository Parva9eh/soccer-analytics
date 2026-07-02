-- Stable StatsBomb event UUID for idempotent ETL upserts.
-- PostgREST upsert requires a UNIQUE CONSTRAINT (not a partial unique index).

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS statsbomb_event_id uuid;

DROP INDEX IF EXISTS events_statsbomb_event_id_unique;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_statsbomb_event_id_key;

ALTER TABLE public.events
  ADD CONSTRAINT events_statsbomb_event_id_key UNIQUE (statsbomb_event_id);

COMMENT ON COLUMN public.events.statsbomb_event_id IS
  'StatsBomb open-data event id; used for ETL upsert deduplication.';