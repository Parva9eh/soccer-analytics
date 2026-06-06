-- Guest read-only browsing: anon role can read the public demo dataset (La Liga 2020/21).

GRANT SELECT ON public.competitions TO anon;
GRANT SELECT ON public.seasons TO anon;
GRANT SELECT ON public.teams TO anon;
GRANT SELECT ON public.matches TO anon;
GRANT SELECT ON public.events TO anon;
GRANT SELECT ON public.players TO anon;

DROP POLICY IF EXISTS "anon_select_competitions_demo" ON public.competitions;
CREATE POLICY "anon_select_competitions_demo"
  ON public.competitions
  FOR SELECT
  TO anon
  USING (name = 'La Liga');

DROP POLICY IF EXISTS "anon_select_seasons_demo" ON public.seasons;
CREATE POLICY "anon_select_seasons_demo"
  ON public.seasons
  FOR SELECT
  TO anon
  USING (
    year = '2020/2021'
    AND competition_id IN (
      SELECT c.id FROM public.competitions c WHERE c.name = 'La Liga'
    )
  );

DROP POLICY IF EXISTS "anon_select_teams" ON public.teams;
CREATE POLICY "anon_select_teams"
  ON public.teams
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "anon_select_matches_demo" ON public.matches;
CREATE POLICY "anon_select_matches_demo"
  ON public.matches
  FOR SELECT
  TO anon
  USING (
    competition_id IN (
      SELECT c.id FROM public.competitions c WHERE c.name = 'La Liga'
    )
    AND season_id IN (
      SELECT s.id
      FROM public.seasons s
      INNER JOIN public.competitions c ON c.id = s.competition_id
      WHERE c.name = 'La Liga' AND s.year = '2020/2021'
    )
  );

DROP POLICY IF EXISTS "anon_select_events_demo" ON public.events;
CREATE POLICY "anon_select_events_demo"
  ON public.events
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.id = events.match_id
        AND m.competition_id IN (
          SELECT c.id FROM public.competitions c WHERE c.name = 'La Liga'
        )
        AND m.season_id IN (
          SELECT s.id
          FROM public.seasons s
          INNER JOIN public.competitions c ON c.id = s.competition_id
          WHERE c.name = 'La Liga' AND s.year = '2020/2021'
        )
    )
  );

DROP POLICY IF EXISTS "anon_select_players" ON public.players;
CREATE POLICY "anon_select_players"
  ON public.players
  FOR SELECT
  TO anon
  USING (true);