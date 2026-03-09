-- ============================================================
-- WorshipOps: Roles & Guest Access Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add permission + expiry fields to organization_members
ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS permissions         JSONB       DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS account_expires_at  TIMESTAMPTZ;

-- 2. Add guest fields to org_invitations
ALTER TABLE org_invitations
  ADD COLUMN IF NOT EXISTS permissions          JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS guest_duration_weeks INT   DEFAULT 1;
