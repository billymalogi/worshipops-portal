-- ── Brand Color Migration ──────────────────────────────────────────────────
-- Run in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS throughout)

-- 1. Standalone brand colors table (one row per org)
CREATE TABLE IF NOT EXISTS organization_brand_colors (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  UUID        NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  brand_color             TEXT        DEFAULT NULL,  -- nav bar background
  brand_header_color      TEXT        DEFAULT NULL,  -- scripture/verse bar background
  brand_sidebar_color     TEXT        DEFAULT NULL,  -- left sidebar background
  brand_nav_text_color     TEXT        DEFAULT NULL,  -- nav text override (NULL = auto-detect)
  brand_header_text_color  TEXT        DEFAULT NULL,  -- verse bar text override (NULL = auto-detect)
  brand_sidebar_text_color TEXT        DEFAULT NULL,  -- sidebar text override (NULL = auto-detect)
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on brand colors table
ALTER TABLE organization_brand_colors ENABLE ROW LEVEL SECURITY;

-- Any org member can read their org's brand colors
CREATE POLICY "org_brand_colors_select" ON organization_brand_colors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = org_id AND user_id = auth.uid()
    )
  );

-- Only admins can insert
CREATE POLICY "org_brand_colors_insert" ON organization_brand_colors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update
CREATE POLICY "org_brand_colors_update" ON organization_brand_colors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- 2. Proposals table (multi-admin approval workflow)
CREATE TABLE IF NOT EXISTS brand_color_proposals (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proposed_color              TEXT        NOT NULL,
  proposed_header_color       TEXT        NOT NULL,
  proposed_sidebar_color      TEXT        NOT NULL,
  proposed_nav_text_color      TEXT,
  proposed_header_text_color   TEXT,
  proposed_sidebar_text_color  TEXT,
  proposed_by                 UUID        NOT NULL,
  approved_by                 UUID[]      NOT NULL DEFAULT '{}',
  status                      TEXT        NOT NULL DEFAULT 'pending',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one pending proposal per org at a time
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_per_org
  ON brand_color_proposals(org_id)
  WHERE status = 'pending';

ALTER TABLE brand_color_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_color_proposals_select" ON brand_color_proposals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "brand_color_proposals_insert" ON brand_color_proposals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "brand_color_proposals_update" ON brand_color_proposals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = org_id AND user_id = auth.uid() AND role = 'admin'
    )
  );
