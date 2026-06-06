-- Workspace reports: saved multi-match snapshots and dashboard stats (Phase 3.3)

CREATE TABLE IF NOT EXISTS public.workspace_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  competition TEXT,
  season TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT workspace_reports_title_not_empty CHECK (char_length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_workspace_reports_workspace_creator
  ON public.workspace_reports (workspace_id, created_by, updated_at DESC);

ALTER TABLE public.workspace_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_reports TO authenticated;

DROP POLICY IF EXISTS "workspace_reports_select_own" ON public.workspace_reports;
CREATE POLICY "workspace_reports_select_own"
  ON public.workspace_reports
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  );

DROP POLICY IF EXISTS "workspace_reports_insert_own" ON public.workspace_reports;
CREATE POLICY "workspace_reports_insert_own"
  ON public.workspace_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  );

DROP POLICY IF EXISTS "workspace_reports_update_own" ON public.workspace_reports;
CREATE POLICY "workspace_reports_update_own"
  ON public.workspace_reports
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  )
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  );

DROP POLICY IF EXISTS "workspace_reports_delete_own" ON public.workspace_reports;
CREATE POLICY "workspace_reports_delete_own"
  ON public.workspace_reports
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  );

DROP TRIGGER IF EXISTS workspace_reports_set_updated_at ON public.workspace_reports;
CREATE TRIGGER workspace_reports_set_updated_at
  BEFORE UPDATE ON public.workspace_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_saved_analysis_updated_at();

CREATE OR REPLACE FUNCTION public.workspace_report_snapshot(
  p_competition text DEFAULT NULL,
  p_season text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws_id uuid := public.effective_active_workspace_id();
  comp_filter text := NULLIF(trim(p_competition), '');
  season_filter text := NULLIF(trim(p_season), '');
  total_matches bigint := 0;
  total_events bigint := 0;
  total_goals bigint := 0;
  avg_goals numeric := 0;
  result jsonb;
BEGIN
  IF ws_id IS NULL THEN
    RETURN jsonb_build_object(
      'workspace_id', NULL,
      'competition', comp_filter,
      'season', season_filter,
      'total_matches', 0,
      'total_events', 0,
      'total_goals', 0,
      'avg_goals_per_match', 0,
      'event_types', '[]'::jsonb,
      'matches_by_week', '[]'::jsonb,
      'datasets', '[]'::jsonb
    );
  END IF;

  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(COALESCE(m.home_score, 0) + COALESCE(m.away_score, 0)), 0)::bigint,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(
          COALESCE(SUM(COALESCE(m.home_score, 0) + COALESCE(m.away_score, 0)), 0)::numeric
          / COUNT(*)::numeric,
          2
        )
      ELSE 0
    END
  INTO total_matches, total_goals, avg_goals
  FROM public.matches m
  INNER JOIN public.workspace_datasets wd
    ON wd.competition_id = m.competition_id
   AND wd.season_id = m.season_id
  INNER JOIN public.competitions c ON c.id = m.competition_id
  INNER JOIN public.seasons s ON s.id = m.season_id
  WHERE wd.workspace_id = ws_id
    AND (comp_filter IS NULL OR c.name = comp_filter)
    AND (season_filter IS NULL OR s.year = season_filter);

  SELECT COUNT(*)::bigint
  INTO total_events
  FROM public.events e
  INNER JOIN public.matches m ON m.id = e.match_id
  INNER JOIN public.workspace_datasets wd
    ON wd.competition_id = m.competition_id
   AND wd.season_id = m.season_id
  INNER JOIN public.competitions c ON c.id = m.competition_id
  INNER JOIN public.seasons s ON s.id = m.season_id
  WHERE wd.workspace_id = ws_id
    AND (comp_filter IS NULL OR c.name = comp_filter)
    AND (season_filter IS NULL OR s.year = season_filter);

  SELECT jsonb_build_object(
    'workspace_id', ws_id,
    'competition', comp_filter,
    'season', season_filter,
    'total_matches', total_matches,
    'total_events', total_events,
    'total_goals', total_goals,
    'avg_goals_per_match', avg_goals,
    'event_types', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('event_type', et.event_type, 'count', et.c) ORDER BY et.c DESC)
      FROM (
        SELECT e.event_type, COUNT(*)::bigint AS c
        FROM public.events e
        INNER JOIN public.matches m ON m.id = e.match_id
        INNER JOIN public.workspace_datasets wd
          ON wd.competition_id = m.competition_id
         AND wd.season_id = m.season_id
        INNER JOIN public.competitions c ON c.id = m.competition_id
        INNER JOIN public.seasons s ON s.id = m.season_id
        WHERE wd.workspace_id = ws_id
          AND e.event_type IS NOT NULL
          AND (comp_filter IS NULL OR c.name = comp_filter)
          AND (season_filter IS NULL OR s.year = season_filter)
        GROUP BY e.event_type
        ORDER BY COUNT(*) DESC
        LIMIT 12
      ) et
    ), '[]'::jsonb),
    'matches_by_week', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('match_week', w.match_week, 'count', w.c) ORDER BY w.match_week)
      FROM (
        SELECT m.match_week, COUNT(*)::bigint AS c
        FROM public.matches m
        INNER JOIN public.workspace_datasets wd
          ON wd.competition_id = m.competition_id
         AND wd.season_id = m.season_id
        INNER JOIN public.competitions c ON c.id = m.competition_id
        INNER JOIN public.seasons s ON s.id = m.season_id
        WHERE wd.workspace_id = ws_id
          AND m.match_week IS NOT NULL
          AND (comp_filter IS NULL OR c.name = comp_filter)
          AND (season_filter IS NULL OR s.year = season_filter)
        GROUP BY m.match_week
        ORDER BY m.match_week
      ) w
    ), '[]'::jsonb),
    'datasets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('competition', c.name, 'season', s.year) ORDER BY c.name, s.year)
      FROM public.workspace_datasets wd
      INNER JOIN public.competitions c ON c.id = wd.competition_id
      INNER JOIN public.seasons s ON s.id = wd.season_id
      WHERE wd.workspace_id = ws_id
    ), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.workspace_report_snapshot(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workspace_report_snapshot(text, text) TO authenticated;