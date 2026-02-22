-- =====================================================
-- FIX: Overlap Prevention Trigger
-- This version works with BIGINT or UUID id columns
-- =====================================================

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS prevent_service_overlap ON services;
DROP FUNCTION IF EXISTS check_service_time_overlap();

-- Create new function that works with BIGINT ids
CREATE OR REPLACE FUNCTION check_service_time_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip check if start_time or end_time is null
  IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check for overlapping services on the same date
  -- Note: We use IS DISTINCT FROM to handle NULL ids properly
  IF EXISTS (
    SELECT 1 FROM services
    WHERE organization_id = NEW.organization_id
      AND date = NEW.date
      AND id IS DISTINCT FROM NEW.id  -- This works for both BIGINT and UUID
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
      AND (
        -- New service starts during existing service
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR
        -- New service ends during existing service
        (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR
        -- New service completely contains existing service
        (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Service time overlaps with another service on this date';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER prevent_service_overlap
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION check_service_time_overlap();

-- =====================================================
-- Test it (optional)
-- =====================================================
-- You can test by trying to create overlapping services
-- The second INSERT should fail with an overlap error

-- SUCCESS!
-- The overlap prevention now works with your existing schema
-- =====================================================
