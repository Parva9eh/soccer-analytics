-- Enable RLS on player_match_stats (Supabase advisor: public table without RLS).
-- Safe to run if the table does not exist yet (no-op).
-- Policies follow the same workspace / guest demo patterns as events when match_id is present.

DO $$
BEGIN
  IF to_regclass('public.player_match_stats') IS NULL THEN
    RAISE NOTICE 'public.player_match_stats not found — skipping RLS migration';
    RETURN;
  END IF;

  ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;

  GRANT SELECT ON public.player_match_stats TO authenticated;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'player_match_stats'
      AND column_name = 'match_id'
  ) THEN
    -- Workspace-scoped reads for signed-in users (same as events).
    DROP POLICY IF EXISTS "authenticated_select_player_match_stats"
      ON public.player_match_stats;
    CREATE POLICY "authenticated_select_player_match_stats"
      ON public.player_match_stats
      FOR SELECT
      TO authenticated
      USING (public.user_can_access_match(match_id));

    -- Guest demo reads (La Liga 2020/21), aligned with anon_select_events_demo.
    GRANT SELECT ON public.player_match_stats TO anon;

    DROP POLICY IF EXISTS "anon_select_player_match_stats_demo"
      ON public.player_match_stats;
    CREATE POLICY "anon_select_player_match_stats_demo"
      ON public.player_match_stats
      FOR SELECT
      TO anon
      USING (
        EXISTS (
          SELECT 1
          FROM public.matches m
          WHERE m.id = player_match_stats.match_id
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
  ELSE
    -- No match_id: treat like global players read for authenticated users.
    DROP POLICY IF EXISTS "authenticated_select_player_match_stats"
      ON public.player_match_stats;
    CREATE POLICY "authenticated_select_player_match_stats"
      ON public.player_match_stats
      FOR SELECT
      TO authenticated
      USING (true);

    RAISE NOTICE
      'player_match_stats has no match_id column — using global authenticated SELECT; writes remain service_role only';
  END IF;
END;
$$;