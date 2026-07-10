-- Phase 7.1: close workspace membership / seed privilege gaps.
--
-- 1) Drop open self-insert on workspace_members (any user could join any workspace as admin).
--    Membership inserts must go through SECURITY DEFINER RPCs only
--    (create_workspace_for_user, accept_workspace_invitation).
-- 2) Revoke direct EXECUTE on seed_default_workspace_dataset from authenticated;
--    definer RPCs still call it successfully.

DROP POLICY IF EXISTS "workspace_members_insert_self" ON public.workspace_members;

-- Definer functions run as owner and bypass RLS; no public INSERT policy remains.
-- authenticated still has table GRANT INSERT from earlier migrations; without a
-- permissive INSERT policy, PostgREST inserts fail. Prefer least privilege:
REVOKE INSERT ON public.workspace_members FROM authenticated;
-- Keep SELECT/UPDATE/DELETE grants as established by admin manage policies + select policies.
-- (SELECT/UPDATE/DELETE policies still apply for members/admins.)

REVOKE EXECUTE ON FUNCTION public.seed_default_workspace_dataset(uuid, uuid) FROM authenticated;
-- Leave EXECUTE for postgres / service_role / function owner paths used by create_workspace_for_user.
