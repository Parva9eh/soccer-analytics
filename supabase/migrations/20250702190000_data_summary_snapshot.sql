-- Fast RLS-scoped summary for dashboard (/summary).
-- Join matches first so event counts do not scan the full events heap under EXISTS RLS.

CREATE OR REPLACE FUNCTION public.data_summary_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_matches', (SELECT COUNT(*)::bigint FROM public.matches),
    'total_events', (
      SELECT COUNT(*)::bigint
      FROM public.events e
      INNER JOIN public.matches m ON m.id = e.match_id
    ),
    'total_players', (SELECT COUNT(*)::bigint FROM public.players),
    'status', 'healthy'
  );
$$;

REVOKE ALL ON FUNCTION public.data_summary_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.data_summary_snapshot() TO anon, authenticated;