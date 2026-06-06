-- Private saved analyses per user within a workspace (Phase 3.3)

CREATE TABLE IF NOT EXISTS public.saved_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces (id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  match_id BIGINT,
  title TEXT NOT NULL,
  notes TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT saved_analyses_title_not_empty CHECK (char_length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_saved_analyses_workspace_creator
  ON public.saved_analyses (workspace_id, created_by, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_analyses_match_id
  ON public.saved_analyses (match_id)
  WHERE match_id IS NOT NULL;

ALTER TABLE public.saved_analyses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_analyses TO authenticated;

DROP POLICY IF EXISTS "saved_analyses_select_own" ON public.saved_analyses;
CREATE POLICY "saved_analyses_select_own"
  ON public.saved_analyses
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  );

DROP POLICY IF EXISTS "saved_analyses_insert_own" ON public.saved_analyses;
CREATE POLICY "saved_analyses_insert_own"
  ON public.saved_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  );

DROP POLICY IF EXISTS "saved_analyses_update_own" ON public.saved_analyses;
CREATE POLICY "saved_analyses_update_own"
  ON public.saved_analyses
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  )
  WITH CHECK (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  );

DROP POLICY IF EXISTS "saved_analyses_delete_own" ON public.saved_analyses;
CREATE POLICY "saved_analyses_delete_own"
  ON public.saved_analyses
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND workspace_id IN (SELECT public.current_user_workspace_ids())
  );

CREATE OR REPLACE FUNCTION public.touch_saved_analysis_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS saved_analyses_set_updated_at ON public.saved_analyses;
CREATE TRIGGER saved_analyses_set_updated_at
  BEFORE UPDATE ON public.saved_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_saved_analysis_updated_at();