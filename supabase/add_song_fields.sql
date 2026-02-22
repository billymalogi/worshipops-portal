-- WorshipOps — Add lyrics + metadata columns to the songs table
-- Run this once in your Supabase SQL editor (Dashboard → SQL Editor → New Query)

ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS artist           TEXT,
  ADD COLUMN IF NOT EXISTS lyrics           TEXT,
  ADD COLUMN IF NOT EXISTS year             INTEGER,
  ADD COLUMN IF NOT EXISTS is_public_domain BOOLEAN DEFAULT false;

-- Optional: index for fast public-domain filtering
CREATE INDEX IF NOT EXISTS idx_songs_is_public_domain ON songs (is_public_domain);