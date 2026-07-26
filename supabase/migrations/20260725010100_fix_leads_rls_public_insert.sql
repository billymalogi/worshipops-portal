-- ============================================================
-- WorshipOps: Fix leads table RLS so anonymous visitors can
-- actually submit the lead capture form (was blocking all
-- anon inserts, which is why lead volume looked suspiciously low).
-- Only admins can read leads back out; anyone can insert one.
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_leads" ON leads;
CREATE POLICY "public_insert_leads" ON leads
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "admins_read_leads" ON leads;
CREATE POLICY "admins_read_leads" ON leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
