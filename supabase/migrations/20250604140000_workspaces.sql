-- Workspaces & membership (Phase 3.3 foundation)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
    CREATE TYPE public.workspace_role AS ENUM (
      'admin',
      'coach',
      'analyst',
      'viewer'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id
  ON public.workspace_members (user_id);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspaces: members can read; creators can insert
DROP POLICY IF EXISTS "workspaces_select_member" ON public.workspaces;
CREATE POLICY "workspaces_select_member"
  ON public.workspaces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "workspaces_insert_creator" ON public.workspaces;
CREATE POLICY "workspaces_insert_creator"
  ON public.workspaces
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Members: view peers in same workspace; insert self; admins manage others
DROP POLICY IF EXISTS "workspace_members_select_peer" ON public.workspace_members;
CREATE POLICY "workspace_members_select_peer"
  ON public.workspace_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "workspace_members_insert_self" ON public.workspace_members;
CREATE POLICY "workspace_members_insert_self"
  ON public.workspace_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "workspace_members_admin_manage" ON public.workspace_members;
CREATE POLICY "workspace_members_admin_manage"
  ON public.workspace_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "workspace_members_admin_delete" ON public.workspace_members;
CREATE POLICY "workspace_members_admin_delete"
  ON public.workspace_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role = 'admin'
    )
  );