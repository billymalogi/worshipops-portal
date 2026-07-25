-- ============================================================
-- WorshipOps: Restrict beta invite management to Billy's account only
-- Previously any admin of any organization could create/revoke/delete
-- beta invitations via direct table access (RLS allowed any admin).
-- ============================================================

DROP POLICY IF EXISTS "admins_manage_invitations" ON beta_invitations;

CREATE POLICY "master_account_manages_invitations" ON beta_invitations
  FOR ALL
  USING ((auth.jwt() ->> 'email') = 'billy@worshipops.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'billy@worshipops.com');

-- Public read-by-token policy is unchanged — still needed for the
-- unauthenticated invite signup page (InvitePage.jsx).
