-- ============================================================
-- WorshipOps: Remove stray public SELECT/UPDATE policies on
-- beta_invitations.
--
-- The live database had policies that were never captured in any
-- local migration file (likely created ad hoc via the Supabase
-- Studio dashboard, drifting from source control):
--
--   • public_read_beta_invitation_by_token — SELECT, USING (true)
--     Same bug as the previous migration tried to fix, just under
--     a different name, so that DROP POLICY silently no-opped.
--
--   • public_mark_beta_invitation_used — UPDATE, USING (true),
--     WITH CHECK (true). This let ANY anon client rewrite any
--     column of any row (flip is_active, clear used_at, even
--     overwrite the token). The process-beta-invite edge function
--     already marks invites as used via the service_role key, so
--     this public write path is both dangerous and redundant.
-- ============================================================

DROP POLICY IF EXISTS "public_read_beta_invitation_by_token" ON beta_invitations;
DROP POLICY IF EXISTS "public_mark_beta_invitation_used" ON beta_invitations;

-- Clean up the temporary introspection view from the previous migration.
DROP VIEW IF EXISTS public._debug_beta_policies;
