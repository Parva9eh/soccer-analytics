-- Allow workspace creators to read rows they created (needed for INSERT RETURNING and slug flows)

DROP POLICY IF EXISTS "workspaces_select_member" ON public.workspaces;
CREATE POLICY "workspaces_select_member"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR id IN (SELECT public.current_user_workspace_ids())
  );

-- OAuth users may exist in auth.users before profiles trigger ran
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);