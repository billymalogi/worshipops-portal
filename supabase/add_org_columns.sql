-- ============================================================
-- Patch: Add missing columns to existing organizations table
-- Run this in Supabase Dashboard → SQL Editor → New Query
--
-- Safe to run even if the table already exists —
-- ADD COLUMN IF NOT EXISTS is a no-op when column is present.
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS logo_url        TEXT,
  ADD COLUMN IF NOT EXISTS phone           TEXT,
  ADD COLUMN IF NOT EXISTS email           TEXT,
  ADD COLUMN IF NOT EXISTS website         TEXT,
  ADD COLUMN IF NOT EXISTS address_street  TEXT,
  ADD COLUMN IF NOT EXISTS address_city    TEXT,
  ADD COLUMN IF NOT EXISTS address_state   TEXT,
  ADD COLUMN IF NOT EXISTS address_zip     TEXT,
  ADD COLUMN IF NOT EXISTS address_country TEXT        DEFAULT 'US',
  ADD COLUMN IF NOT EXISTS capacity        INTEGER,
  ADD COLUMN IF NOT EXISTS service_times   JSONB       DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ministries      JSONB       DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_verses              JSONB   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS burnout_prevention_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS burnout_warning_threshold  INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS burnout_auto_threshold     INTEGER DEFAULT 6,
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT NOW();

-- ── RLS (skip if already enabled) ────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Allow org members to read
DROP POLICY IF EXISTS "members_read_org" ON organizations;
CREATE POLICY "members_read_org"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Allow admins to write
DROP POLICY IF EXISTS "admins_write_org" ON organizations;
CREATE POLICY "admins_write_org"
  ON organizations FOR ALL
  USING (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── Also make sure a row exists for your org ──────────────────────────────────
-- If OrgSettings has never saved before, there's no row to SELECT.
-- This inserts a blank row keyed to your org ID if one doesn't exist yet.
-- Replace 'YOUR-ORG-UUID-HERE' with the actual value from organization_members.
--
-- SELECT organization_id FROM organization_members LIMIT 1;
--
-- INSERT INTO organizations (id)
-- VALUES ('YOUR-ORG-UUID-HERE')
-- ON CONFLICT (id) DO NOTHING;
