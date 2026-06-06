-- Fix: PL/pgSQL variable season_id conflicted with workspace_datasets.season_id column

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

-- Re-run backfill for workspaces that may have missed seeding
DO $$
DECLARE
  ws record;
BEGIN
  FOR ws IN SELECT id, created_by FROM public.workspaces LOOP
    PERFORM public.seed_default_workspace_dataset(ws.id, ws.created_by);
  END LOOP;
END;
$$;