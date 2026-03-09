-- ============================================================
-- WorshipOps: Org Invitations Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS org_invitations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by      UUID        REFERENCES auth.users(id),
  email           TEXT        NOT NULL,
  name            TEXT,
  role            TEXT        NOT NULL DEFAULT 'volunteer',
  token           TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_inv_token ON org_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_inv_org   ON org_invitations(organization_id, created_at DESC);

ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Org admins and leaders can view and create invitations for their org
CREATE POLICY "org_admins_manage_invitations" ON org_invitations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('admin', 'leader')
    )
  );
