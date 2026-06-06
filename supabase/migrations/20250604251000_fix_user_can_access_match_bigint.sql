-- Fix: matches.id and events.match_id are bigint, not integer

DROP FUNCTION IF EXISTS public.user_can_access_match(integer);

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

REVOKE ALL ON FUNCTION public.user_can_access_match(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_access_match(bigint) TO authenticated;