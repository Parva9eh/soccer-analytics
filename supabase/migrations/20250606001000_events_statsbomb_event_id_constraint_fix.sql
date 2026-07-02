-- Fix: PostgREST upsert ignores partial unique indexes (42P10).
-- Run this if you already applied the first statsbomb_event_id migration.

DROP INDEX IF EXISTS events_statsbomb_event_id_unique;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_statsbomb_event_id_key;

ALTER TABLE public.events
  ADD CONSTRAINT events_statsbomb_event_id_key UNIQUE (statsbomb_event_id);