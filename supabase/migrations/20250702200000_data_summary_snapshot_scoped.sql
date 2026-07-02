-- Replace join+RLS scan with explicit SECURITY DEFINER scoping (fast for anon + workspace).

CREATE OR REPLACE FUNCTION public.data_summary_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ws_id uuid;
  v_matches bigint := 0;
  v_events bigint := 0;
  v_players bigint := 0;
BEGIN
  IF v_uid IS NULL THEN
    SELECT COUNT(*)::bigint
    INTO v_matches
    FROM public.matches m
    INNER JOIN public.competitions c ON c.id = m.competition_id AND c.name = 'La Liga'
    INNER JOIN public.seasons s ON s.id = m.season_id AND s.year = '2020/2021';

    SELECT COUNT(*)::bigint
    INTO v_events
    FROM public.events e
    INNER JOIN public.matches m ON m.id = e.match_id
    INNER JOIN public.competitions c ON c.id = m.competition_id AND c.name = 'La Liga'
    INNER JOIN public.seasons s ON s.id = m.season_id AND s.year = '2020/2021';
  ELSE
    v_ws_id := public.effective_active_workspace_id();

    IF v_ws_id IS NULL THEN
      RETURN jsonb_build_object(
        'total_matches', 0,
        'total_events', 0,
        'total_players', 0,
        'status', 'healthy'
      );
    END IF;

    SELECT COUNT(*)::bigint
    INTO v_matches
    FROM public.matches m
    INNER JOIN public.workspace_datasets wd
      ON wd.competition_id = m.competition_id
     AND wd.season_id = m.season_id
    WHERE wd.workspace_id = v_ws_id;

    SELECT COUNT(*)::bigint
    INTO v_events
    FROM public.events e
    INNER JOIN public.matches m ON m.id = e.match_id
    INNER JOIN public.workspace_datasets wd
      ON wd.competition_id = m.competition_id
     AND wd.season_id = m.season_id
    WHERE wd.workspace_id = v_ws_id;
  END IF;

  SELECT COUNT(*)::bigint INTO v_players FROM public.players;

  RETURN jsonb_build_object(
    'total_matches', v_matches,
    'total_events', v_events,
    'total_players', v_players,
    'status', 'healthy'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.data_summary_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.data_summary_snapshot() TO anon, authenticated;