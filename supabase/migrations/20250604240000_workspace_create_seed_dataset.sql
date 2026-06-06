-- Seed default dataset when a workspace is created

CREATE OR REPLACE FUNCTION public.create_workspace_for_user(p_name text)
RETURNS TABLE (id uuid, name text, slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  uid uuid := auth.uid();
  base_slug text;
  try_slug text;
  ws_id uuid;
  n int := 0;
  cleaned_name text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;

  cleaned_name := trim(p_name);
  IF cleaned_name = '' THEN
    RAISE EXCEPTION 'Workspace name is required'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    uid,
    auth.jwt() ->> 'email',
    COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() -> 'user_metadata' ->> 'name',
      split_part(COALESCE(auth.jwt() ->> 'email', ''), '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    updated_at = NOW();

  base_slug := lower(regexp_replace(cleaned_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'workspace';
  END IF;
  IF length(base_slug) > 60 THEN
    base_slug := left(base_slug, 60);
  END IF;

  LOOP
    n := n + 1;
    IF n = 1 THEN
      try_slug := base_slug;
    ELSE
      try_slug := base_slug || '-' || n::text;
    END IF;

    BEGIN
      INSERT INTO public.workspaces (name, slug, created_by)
      VALUES (cleaned_name, try_slug, uid)
      RETURNING workspaces.id INTO ws_id;
      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        IF n >= 6 THEN
          RAISE;
        END IF;
    END;
  END LOOP;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (ws_id, uid, 'admin')
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = 'admin';

  PERFORM public.seed_default_workspace_dataset(ws_id, uid);

  RETURN QUERY SELECT ws_id, cleaned_name, try_slug;
END;
$$;