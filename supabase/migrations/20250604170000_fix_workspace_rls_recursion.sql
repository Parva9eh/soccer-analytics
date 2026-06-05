-- Fix infinite recursion in workspace RLS (SELECT on workspace_members)

CREATE OR REPLACE FUNCTION public.current_user_workspace_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_is_workspace_admin(ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_workspace_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_workspace_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "workspaces_select_member" ON public.workspaces;
CREATE POLICY "workspaces_select_member"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (id IN (SELECT public.current_user_workspace_ids()));

DROP POLICY IF EXISTS "workspace_members_select_peer" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_member" ON public.workspace_members;
CREATE POLICY "workspace_members_select_member"
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (workspace_id IN (SELECT public.current_user_workspace_ids()));

DROP POLICY IF EXISTS "workspace_members_admin_manage" ON public.workspace_members;
CREATE POLICY "workspace_members_admin_manage"
  ON public.workspace_members
  FOR UPDATE
  TO authenticated
  USING (public.user_is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS "workspace_members_admin_delete" ON public.workspace_members;
CREATE POLICY "workspace_members_admin_delete"
  ON public.workspace_members
  FOR DELETE
  TO authenticated
  USING (public.user_is_workspace_admin(workspace_id));