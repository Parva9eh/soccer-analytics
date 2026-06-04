-- Phase 3.2: Row Level Security for shared read-only app data
-- Authenticated users (Supabase Auth JWT) can SELECT; writes stay on service_role (ETL).

-- Competitions & seasons
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_competitions" ON public.competitions;
CREATE POLICY "authenticated_select_competitions"
  ON public.competitions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_select_seasons" ON public.seasons;
CREATE POLICY "authenticated_select_seasons"
  ON public.seasons
  FOR SELECT
  TO authenticated
  USING (true);

-- Teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_teams" ON public.teams;
CREATE POLICY "authenticated_select_teams"
  ON public.teams
  FOR SELECT
  TO authenticated
  USING (true);

-- Matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_matches" ON public.matches;
CREATE POLICY "authenticated_select_matches"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (true);

-- Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_events" ON public.events;
CREATE POLICY "authenticated_select_events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (true);

-- Players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select_players" ON public.players;
CREATE POLICY "authenticated_select_players"
  ON POLICY "authenticated_select_players"
  ON public.players
  FOR SELECT
  TO authenticated
  USING (true);