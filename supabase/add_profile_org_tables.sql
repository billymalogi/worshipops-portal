-- WorshipOps — Extended profile & organization tables
-- Run once in Supabase Dashboard → SQL Editor → New Query
--
-- ──────────────────────────────────────────────────────────────────────────────
-- BEFORE RUNNING: create these Storage buckets in Supabase Dashboard → Storage:
--   1. Name: avatars    | Public: ON
--   2. Name: org-logos  | Public: ON
-- ──────────────────────────────────────────────────────────────────────────────

-- ── User Profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id                 UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name       TEXT,
  avatar_url         TEXT,
  phone              TEXT,
  date_of_birth      DATE,
  wedding_anniversary DATE,
  team_joined_date   DATE,
  serve_capacity     TEXT        DEFAULT 'flexible',
  church_role        TEXT,
  bio                TEXT,
  household          JSONB       DEFAULT '[]'::jsonb,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users fully own their own row
DROP POLICY IF EXISTS "users_own_profile" ON user_profiles;
CREATE POLICY "users_own_profile"
  ON user_profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Org members can read each other's profiles (for team directory)
DROP POLICY IF EXISTS "org_members_read_profiles" ON user_profiles;
CREATE POLICY "org_members_read_profiles"
  ON user_profiles
  FOR SELECT
  USING (
    id IN (
      SELECT om2.user_id
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
    )
  );

-- ── Organizations (extended info) ─────────────────────────────────────────────
-- NOTE: The id here should match the organization_id values in organization_members.
CREATE TABLE IF NOT EXISTS organizations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT,
  logo_url        TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  address_street  TEXT,
  address_city    TEXT,
  address_state   TEXT,
  address_zip     TEXT,
  address_country TEXT        DEFAULT 'US',
  capacity        INTEGER,
  service_times   JSONB       DEFAULT '[]'::jsonb,
  ministries      JSONB       DEFAULT '[]'::jsonb,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Any org member can read
DROP POLICY IF EXISTS "members_read_org" ON organizations;
CREATE POLICY "members_read_org"
  ON organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Only admins can insert / update / delete
DROP POLICY IF EXISTS "admins_write_org" ON organizations;
CREATE POLICY "admins_write_org"
  ON organizations
  FOR ALL
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

-- Optional: auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS set_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_organizations_updated_at ON organizations;
CREATE TRIGGER set_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
