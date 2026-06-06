-- Accept workspace invitation (bypasses workspace_members / invitations RLS for invitees)

CREATE OR REPLACE FUNCTION public.accept_workspace_invitation(p_token text)
RETURNS TABLE (
  workspace_id uuid,
  workspace_name text,
  role public.workspace_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  inv public.workspace_invitations%ROWTYPE;
  ws_name text;
  user_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  user_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  IF user_email = '' THEN
    RAISE EXCEPTION 'Account has no email' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO inv
  FROM public.workspace_invitations
  WHERE token = trim(p_token)
    AND status = 'pending'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or no longer valid' USING ERRCODE = 'P0002';
  END IF;

  SELECT name
  INTO ws_name
  FROM public.workspaces
  WHERE id = inv.workspace_id;

  IF inv.expires_at < NOW() THEN
    UPDATE public.workspace_invitations
    SET status = 'revoked'
    WHERE id = inv.id;
    RAISE EXCEPTION 'Invitation has expired' USING ERRCODE = '22023';
  END IF;

  IF lower(trim(inv.email)) <> user_email THEN
    RAISE EXCEPTION 'Sign in with the email address that received this invitation'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    uid,
    user_email,
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() -> 'user_metadata' ->> 'name',
      split_part(user_email, '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    updated_at = NOW();

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, uid, inv.role)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

  UPDATE public.workspace_invitations
  SET status = 'accepted'
  WHERE id = inv.id;

  RETURN QUERY SELECT inv.workspace_id, ws_name, inv.role;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_workspace_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invitation(text) TO authenticated;