-- ============================================================
-- WorshipOps Chat System Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Service chat messages (in-app planner chat)
CREATE TABLE IF NOT EXISTS service_chat_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      BIGINT      NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  organization_id UUID        NOT NULL,
  sender_id       UUID        NOT NULL,        -- auth.uid()
  sender_name     TEXT        NOT NULL,
  sender_role     TEXT        DEFAULT 'member', -- 'admin' | 'leader' | 'member'
  message         TEXT        NOT NULL CHECK (length(trim(message)) > 0),
  thread          TEXT        NOT NULL DEFAULT 'global', -- 'global' | ministry name
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_service_thread ON service_chat_messages(service_id, thread, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_org ON service_chat_messages(organization_id, created_at DESC);

-- RLS
ALTER TABLE service_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read chat" ON service_chat_messages;
CREATE POLICY "org members read chat" ON service_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = service_chat_messages.organization_id
        AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org members insert chat" ON service_chat_messages;
CREATE POLICY "org members insert chat" ON service_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = service_chat_messages.organization_id
        AND user_id = auth.uid()
    )
  );

-- 2. Twilio / WhatsApp config stored per org (new columns on organizations)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS twilio_account_sid    TEXT,
  ADD COLUMN IF NOT EXISTS twilio_auth_token     TEXT,
  ADD COLUMN IF NOT EXISTS twilio_from_phone     TEXT,   -- E.164 e.g. +12025551234
  ADD COLUMN IF NOT EXISTS twilio_whatsapp_from  TEXT;   -- e.g. whatsapp:+14155238886

-- 3. Outbound message log (audit trail for SMS/WhatsApp sent from the app)
CREATE TABLE IF NOT EXISTS outbound_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL,
  service_id      BIGINT      REFERENCES services(id) ON DELETE SET NULL,
  sent_by         UUID        NOT NULL,   -- auth.uid() of admin who pressed send
  channel         TEXT        NOT NULL,   -- 'sms' | 'whatsapp'
  recipients      JSONB       NOT NULL,   -- [ { name, phone } ]
  message_body    TEXT        NOT NULL,
  status          TEXT        DEFAULT 'queued', -- 'queued' | 'sent' | 'failed'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  sent_at         TIMESTAMPTZ
);

ALTER TABLE outbound_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read outbound messages" ON outbound_messages;
CREATE POLICY "admins read outbound messages" ON outbound_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = outbound_messages.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'leader')
    )
  );

DROP POLICY IF EXISTS "admins insert outbound messages" ON outbound_messages;
CREATE POLICY "admins insert outbound messages" ON outbound_messages
  FOR INSERT WITH CHECK (
    sent_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = outbound_messages.organization_id
        AND user_id = auth.uid()
        AND role IN ('admin', 'leader')
    )
  );

-- Grant realtime access for chat (run this too)
-- ALTER PUBLICATION supabase_realtime ADD TABLE service_chat_messages;
