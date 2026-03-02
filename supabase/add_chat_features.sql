-- ============================================================
-- WorshipOps Chat Features Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to service_chat_messages
ALTER TABLE service_chat_messages
  ADD COLUMN IF NOT EXISTS message_type  TEXT    DEFAULT 'text',   -- 'text' | 'alert'
  ADD COLUMN IF NOT EXISTS is_pinned     BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS media_url     TEXT;                     -- Supabase Storage URL

-- 2. Add chat feature toggles to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS chat_features JSONB DEFAULT '{"alerts": true, "pins": true, "media": true, "mentions": true}';

-- Note: Create a Supabase Storage bucket called 'chat-media' (public) for image/file uploads.
--       Dashboard → Storage → New Bucket → Name: chat-media → Public: ON
