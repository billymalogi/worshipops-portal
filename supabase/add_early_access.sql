-- ============================================================
-- WorshipOps Early Access Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS early_access (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  TEXT        NOT NULL,
  last_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  church_name TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE early_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public insert early access" ON early_access;
CREATE POLICY "public insert early access"
  ON early_access
  FOR INSERT
  WITH CHECK (true);

-- Allow authenticated admins to read all signups
DROP POLICY IF EXISTS "authenticated read early access" ON early_access;
CREATE POLICY "authenticated read early access"
  ON early_access
  FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT INSERT ON early_access TO anon;
GRANT INSERT ON early_access TO authenticated;
GRANT SELECT ON early_access TO authenticated;
