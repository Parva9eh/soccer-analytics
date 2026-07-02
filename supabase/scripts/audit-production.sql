-- Production schema audit (run in Supabase → SQL → New query)
-- Does NOT use supabase_migrations.schema_migrations (only exists after `supabase db push`).

-- 1) Core collaboration tables
SELECT 'tables' AS check_type, table_name, 'ok' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'workspaces',
    'workspace_members',
    'workspace_datasets',
    'workspace_invitations',
    'saved_analyses',
    'workspace_reports'
  )
ORDER BY table_name;

-- 2) Expected RPCs (workspace create, bootstrap, reports)
SELECT 'functions' AS check_type, routine_name, 'ok' AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_workspace_for_user',
    'accept_workspace_invitation',
    'workspace_report_snapshot'
  )
ORDER BY routine_name;

-- 3) RLS enabled on collaboration tables
SELECT
  'rls' AS check_type,
  c.relname AS table_name,
  CASE WHEN c.relrowsecurity THEN 'enabled' ELSE 'MISSING' END AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'profiles',
    'workspaces',
    'workspace_members',
    'saved_analyses',
    'workspace_reports'
  )
ORDER BY c.relname;

-- 4) Quick row counts (non-secret sanity check)
SELECT 'row_counts' AS check_type, 'profiles' AS item, COUNT(*)::text AS status
FROM public.profiles
UNION ALL
SELECT 'row_counts', 'workspaces', COUNT(*)::text FROM public.workspaces
UNION ALL
SELECT 'row_counts', 'workspace_reports', COUNT(*)::text FROM public.workspace_reports
UNION ALL
SELECT 'row_counts', 'saved_analyses', COUNT(*)::text FROM public.saved_analyses;