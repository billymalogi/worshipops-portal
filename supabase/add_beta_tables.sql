-- ============================================================
-- WorshipOps — Beta Tables Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Beta Invitations ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS beta_invitations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  token         text        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_email text,
  note          text,
  invited_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  used_at       timestamptz,
  used_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active     boolean     DEFAULT true
);

-- ── 2. Feature Requests ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_name  text,
  submitter_email text,
  title           text        NOT NULL,
  description     text,
  reference_url   text,
  screenshot_url  text,
  organization_id uuid        REFERENCES organizations(id) ON DELETE SET NULL,
  status          text        DEFAULT 'new',   -- new | reviewing | planned | shipped | declined
  admin_note      text,
  created_at      timestamptz DEFAULT now()
);

-- ── 3. RLS ──────────────────────────────────────────────────
ALTER TABLE beta_invitations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_requests  ENABLE ROW LEVEL SECURITY;

-- Beta invitations: any admin can manage
CREATE POLICY "admins_manage_invitations" ON beta_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Beta invitations: allow public SELECT by token (for the invite signup page — anon key)
CREATE POLICY "public_read_invitation_by_token" ON beta_invitations
  FOR SELECT
  USING (true);

-- Feature requests: authenticated users can insert their own
CREATE POLICY "users_insert_feature_requests" ON feature_requests
  FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

-- Feature requests: users can read their own
CREATE POLICY "users_read_own_requests" ON feature_requests
  FOR SELECT
  USING (auth.uid() = submitted_by);

-- Feature requests: admins can read and update all
CREATE POLICY "admins_manage_feature_requests" ON feature_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── 4. Storage bucket for screenshots ───────────────────────
-- Run manually in Supabase Dashboard → Storage → New bucket:
--   Name: feature-screenshots
--   Public: true  (so screenshot images can be previewed inline)
-- Then add policy: allow authenticated uploads
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('feature-screenshots', 'feature-screenshots', true)
-- ON CONFLICT DO NOTHING;
