-- ============================================================
-- Member Messages / Notifications Inbox
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS member_messages (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_member_id  BIGINT REFERENCES team_members(id) ON DELETE CASCADE,
  recipient_auth_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_auth_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name          TEXT NOT NULL DEFAULT 'System',
  subject              TEXT NOT NULL,
  body                 TEXT NOT NULL DEFAULT '',
  message_type         TEXT NOT NULL DEFAULT 'notification', -- 'notification' | 'direct'
  is_read              BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_member_messages_recipient_auth ON member_messages(recipient_auth_id);
CREATE INDEX IF NOT EXISTS idx_member_messages_recipient_member ON member_messages(recipient_member_id);

-- Enable RLS
ALTER TABLE member_messages ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own messages
CREATE POLICY "Recipients read own messages"
  ON member_messages FOR SELECT
  USING (auth.uid() = recipient_auth_id);

-- Authenticated users can send messages (leaders/admins composing)
CREATE POLICY "Authenticated users can send messages"
  ON member_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Recipients can update their own (mark read)
CREATE POLICY "Recipients update own messages"
  ON member_messages FOR UPDATE
  USING (auth.uid() = recipient_auth_id);

-- Recipients can delete their own
CREATE POLICY "Recipients delete own messages"
  ON member_messages FOR DELETE
  USING (auth.uid() = recipient_auth_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE member_messages;
