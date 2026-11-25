-- ============================================================
-- WorshipOps: Consolidate leads + early_access into one table
-- Same concept (early access signups), just two tables that grew
-- up separately with different verbiage. Merging into early_access.
-- ============================================================

-- Different intake forms supply different subsets of fields
-- (the full modal collects everything, a phone-only form supplies
-- just phone) — loosen NOT NULL so either can write here.
ALTER TABLE early_access
  ALTER COLUMN first_name  DROP NOT NULL,
  ALTER COLUMN last_name   DROP NOT NULL,
  ALTER COLUMN email       DROP NOT NULL,
  ALTER COLUMN church_name DROP NOT NULL;

ALTER TABLE early_access ADD COLUMN IF NOT EXISTS phone text;

-- Carry over any existing leads rows (e.g. the phone-only signup)
INSERT INTO early_access (first_name, last_name, email, church_name, phone, created_at)
SELECT first_name, last_name, email, church_name, phone, created_at FROM leads;

DROP TABLE IF EXISTS leads;
