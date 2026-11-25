-- Temporary introspection view to see the real live policy set on
-- beta_invitations (local migration history doesn't match what the
-- anon key can actually read, so inspecting ground truth). Will be
-- dropped again immediately after use.
CREATE OR REPLACE VIEW public._debug_beta_policies AS
SELECT policyname, cmd, permissive, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'beta_invitations';

GRANT SELECT ON public._debug_beta_policies TO anon;

NOTIFY pgrst, 'reload schema';
