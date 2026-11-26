-- ============================================================
-- WorshipOps: Multiple named time blocks per plan
--
-- A plan currently has exactly one start_time. This adds a `times`
-- column so a single plan can carry several named time blocks
-- (Service / Rehearsal / Other), each with its own day, date, and
-- start/end — e.g. a 9:00am and an 11:00am service sharing one
-- run sheet, plus a Wednesday rehearsal. Existing start_time/
-- end_time columns are untouched for backward compatibility; the
-- ScheduleTable UI falls back to them when `times` is empty.
-- ============================================================

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS times JSONB DEFAULT '[]'::jsonb;

ALTER TABLE service_templates
  ADD COLUMN IF NOT EXISTS times JSONB DEFAULT '[]'::jsonb;
