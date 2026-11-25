-- ============================================================
-- WorshipOps: Restrict early_access SELECT to platform admins
--
-- The old policy allowed any authenticated user (any logged-in
-- volunteer account, not just admins) to read every prospective
-- customer's name/email/church name. Scope it to admins only,
-- matching the pattern used by beta_invitations/feature_requests.
-- ============================================================

DROP POLICY IF EXISTS "authenticated read early access" ON early_access;

CREATE POLICY "admins_read_early_access"
  ON early_access
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
