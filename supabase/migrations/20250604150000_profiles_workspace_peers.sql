-- Allow workspace members to view peer profiles (for member lists)

DROP POLICY IF EXISTS "profiles_select_workspace_peer" ON public.profiles;
CREATE POLICY "profiles_select_workspace_peer"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm_self
      INNER JOIN public.workspace_members wm_peer
        ON wm_self.workspace_id = wm_peer.workspace_id
      WHERE wm_self.user_id = auth.uid()
        AND wm_peer.user_id = profiles.id
    )
  );