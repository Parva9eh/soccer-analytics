-- Active workspace preference on profile (Phase 3.3)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_workspace_id UUID
  REFERENCES public.workspaces (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_active_workspace_id
  ON public.profiles (active_workspace_id);