-- Restrict anon team reads to La Liga 2020/2021 demo matches (align with other anon policies).

DROP POLICY IF EXISTS "anon_select_teams" ON public.teams;
DROP POLICY IF EXISTS "anon_select_teams_demo" ON public.teams;

CREATE POLICY "anon_select_teams_demo"
  ON public.teams
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE (m.home_team_id = teams.id OR m.away_team_id = teams.id)
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