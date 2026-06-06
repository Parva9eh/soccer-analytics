-- Workspace datasets: link workspaces to competition + season pairs (Phase 3.3)

GRANT SELECT ON public.competitions TO authenticated;
GRANT SELECT ON public.seasons TO authenticated;

CREATE TABLE IF NOT EXISTS public.workspace_datasets (
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  competition_id INTEGER NOT NULL REFERENCES public.competitions (id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES public.seasons (id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, competition_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_datasets_workspace_id
  ON public.workspace_datasets (workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_datasets_competition_season
  ON public.workspace_datasets (competition_id, season_id);

ALTER TABLE public.workspace_datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_datasets_select_member" ON public.workspace_datasets;
CREATE POLICY "workspace_datasets_select_member"
  ON public.workspace_datasets
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (SELECT public.current_user_workspace_ids())
  );

DROP POLICY IF EXISTS "workspace_datasets_insert_admin" ON public.workspace_datasets;
CREATE POLICY "workspace_datasets_insert_admin"
  ON public.workspace_datasets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "workspace_datasets_delete_admin" ON public.workspace_datasets;
CREATE POLICY "workspace_datasets_delete_admin"
  ON public.workspace_datasets
  FOR DELETE
  TO authenticated
  USING (public.user_is_workspace_admin(workspace_id));

-- Active workspace for data scoping (profile preference, validated membership)
CREATE OR REPLACE FUNCTION public.effective_active_workspace_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT p.active_workspace_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.active_workspace_id IN (
          SELECT wm.workspace_id
          FROM public.workspace_members wm
          WHERE wm.user_id = auth.uid()
        )
    ),
    (
      SELECT wm.workspace_id
      FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
      ORDER BY wm.joined_at
      LIMIT 1
    )
  );
$$;

GRANT SELECT, INSERT, DELETE ON public.workspace_datasets TO authenticated;

CREATE OR REPLACE FUNCTION public.user_can_access_match(p_match_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    INNER JOIN public.workspace_datasets wd
      ON wd.competition_id = m.competition_id
     AND wd.season_id = m.season_id
    WHERE m.id = p_match_id
      AND wd.workspace_id = public.effective_active_workspace_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.effective_active_workspace_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_match(bigint) TO authenticated;

-- Seed default dataset (La Liga 2020/2021 when present)
CREATE OR REPLACE FUNCTION public.seed_default_workspace_dataset(
  p_workspace_id uuid,
  p_added_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_comp_id integer;
  v_season_id integer;
BEGIN
  SELECT c.id, s.id
  INTO v_comp_id, v_season_id
  FROM public.competitions c
  INNER JOIN public.seasons s ON s.competition_id = c.id
  WHERE c.name = 'La Liga'
    AND s.year = '2020/2021'
  LIMIT 1;

  IF v_comp_id IS NULL OR v_season_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.workspace_datasets (workspace_id, competition_id, season_id, added_by)
  VALUES (p_workspace_id, v_comp_id, v_season_id, p_added_by)
  ON CONFLICT (workspace_id, competition_id, season_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_default_workspace_dataset(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_default_workspace_dataset(uuid, uuid) TO authenticated;

-- Backfill existing workspaces
DO $$
DECLARE
  ws record;
BEGIN
  FOR ws IN SELECT id, created_by FROM public.workspaces LOOP
    PERFORM public.seed_default_workspace_dataset(ws.id, ws.created_by);
  END LOOP;
END;
$$;

-- Scope app data to active workspace datasets
DROP POLICY IF EXISTS "authenticated_select_competitions" ON public.competitions;
CREATE POLICY "authenticated_select_competitions"
  ON public.competitions
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT wd.competition_id
      FROM public.workspace_datasets wd
      WHERE wd.workspace_id = public.effective_active_workspace_id()
    )
  );

DROP POLICY IF EXISTS "authenticated_select_seasons" ON public.seasons;
CREATE POLICY "authenticated_select_seasons"
  ON public.seasons
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT wd.season_id
      FROM public.workspace_datasets wd
      WHERE wd.workspace_id = public.effective_active_workspace_id()
    )
  );

DROP POLICY IF EXISTS "authenticated_select_matches" ON public.matches;
CREATE POLICY "authenticated_select_matches"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_match(id));

DROP POLICY IF EXISTS "authenticated_select_events" ON public.events;
CREATE POLICY "authenticated_select_events"
  ON public.events
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_match(match_id));