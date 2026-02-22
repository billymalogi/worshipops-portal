-- ============================================================
-- Migration: Template Folders + Burnout System + Custom Verses
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Template folders table
CREATE TABLE IF NOT EXISTS template_folders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL,
  name            TEXT        NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Link templates to folders
ALTER TABLE service_templates
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES template_folders(id) ON DELETE SET NULL;

-- 3. Extra columns on team_members
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS ministries      JSONB   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS notes           TEXT,
  ADD COLUMN IF NOT EXISTS available_until DATE,
  ADD COLUMN IF NOT EXISTS linked_user_id  UUID,
  ADD COLUMN IF NOT EXISTS date_of_birth   DATE,
  ADD COLUMN IF NOT EXISTS bio             TEXT,
  ADD COLUMN IF NOT EXISTS household       JSONB   DEFAULT '[]';

-- 4. Extra columns on organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS custom_verses              JSONB   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS burnout_prevention_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS burnout_warning_threshold  INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS burnout_auto_threshold     INTEGER DEFAULT 6;

-- 5. Burnout notifications queue (for future email automation)
CREATE TABLE IF NOT EXISTS burnout_notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID       NOT NULL,
  team_member_id UUID        NOT NULL,
  email          TEXT,
  member_name    TEXT,
  triggered_at   TIMESTAMPTZ DEFAULT NOW(),
  sent_at        TIMESTAMPTZ
);

-- 6. RLS for template_folders
ALTER TABLE template_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read template folders"
  ON template_folders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage template folders"
  ON template_folders FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 7. RLS for burnout_notifications
ALTER TABLE burnout_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage burnout notifications"
  ON burnout_notifications FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
