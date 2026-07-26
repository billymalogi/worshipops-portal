-- ============================================================
-- WorshipOps: Add contact fields to the leads table
-- The leads table previously only captured `phone`, making it
-- impossible to identify who a given lead actually is.
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS first_name  text,
  ADD COLUMN IF NOT EXISTS last_name   text,
  ADD COLUMN IF NOT EXISTS church_name text,
  ADD COLUMN IF NOT EXISTS email       text;
