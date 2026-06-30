-- Pre-aggregated season zone stats (team event counts by pitch third).
-- Refresh after ETL loads: REFRESH MATERIALIZED VIEW CONCURRENTLY public.season_team_zone_stats;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.season_team_zone_stats AS
SELECT
  c.name AS competition,
  s.year AS season,
  COALESCE(
    e.details -> 'team' ->> 'name',
    e.details -> 'possession_team' ->> 'name'
  ) AS team,
  COUNT(*) FILTER (WHERE e.x < 40)::bigint AS left_third,
  COUNT(*) FILTER (WHERE e.x >= 40 AND e.x < 80)::bigint AS middle_third,
  COUNT(*) FILTER (WHERE e.x >= 80)::bigint AS right_third,
  COUNT(*)::bigint AS total_events
FROM public.events e
INNER JOIN public.matches m ON m.id = e.match_id
INNER JOIN public.competitions c ON c.id = m.competition_id
INNER JOIN public.seasons s ON s.id = m.season_id
WHERE e.x IS NOT NULL
  AND COALESCE(
    e.details -> 'team' ->> 'name',
    e.details -> 'possession_team' ->> 'name'
  ) IS NOT NULL
GROUP BY
  c.name,
  s.year,
  COALESCE(
    e.details -> 'team' ->> 'name',
    e.details -> 'possession_team' ->> 'name'
  );

CREATE UNIQUE INDEX IF NOT EXISTS season_team_zone_stats_unique
  ON public.season_team_zone_stats (competition, season, team);

CREATE OR REPLACE FUNCTION public.refresh_season_team_zone_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.season_team_zone_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_season_team_zone_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_season_team_zone_stats() TO service_role;

COMMENT ON MATERIALIZED VIEW public.season_team_zone_stats IS
  'Team event counts by pitch third per competition season. API may read when USE_ZONE_MATERIALIZED_VIEW=true; otherwise live aggregation with TTL cache.';