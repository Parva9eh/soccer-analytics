-- Workspace invitations (Phase 3.3)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE public.invitation_status AS ENUM (
      'pending',
      'accepted',
      'revoked'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.workspace_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id
  ON public.workspace_invitations (workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token
  ON public.workspace_invitations (token);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_invitations_pending_email
  ON public.workspace_invitations (workspace_id, lower(email))
  WHERE status = 'pending';

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_invitations_select" ON public.workspace_invitations;
CREATE POLICY "workspace_invitations_select"
  ON public.workspace_invitations
  FOR SELECT
  TO authenticated
  USING (
    public.user_is_workspace_admin(workspace_id)
    OR (
      lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      AND status = 'pending'
    )
  );

DROP POLICY IF EXISTS "workspace_invitations_insert_admin" ON public.workspace_invitations;
CREATE POLICY "workspace_invitations_insert_admin"
  ON public.workspace_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_is_workspace_admin(workspace_id)
    AND invited_by = auth.uid()
  );

DROP POLICY IF EXISTS "workspace_invitations_update_admin" ON public.workspace_invitations;
CREATE POLICY "workspace_invitations_update_admin"
  ON public.workspace_invitations
  FOR UPDATE
  TO authenticated
  USING (public.user_is_workspace_admin(workspace_id));