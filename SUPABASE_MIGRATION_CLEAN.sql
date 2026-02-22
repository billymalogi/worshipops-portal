-- =====================================================
-- WORSHIP OPS - SERVICE TIMES & MULTIPLE SERVICES
-- CLEAN MIGRATION - Handles existing columns
-- Run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Clean up any existing columns that might have wrong types
-- =====================================================
-- Drop columns if they exist (safe to run multiple times)
ALTER TABLE services DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE services DROP COLUMN IF EXISTS start_time CASCADE;
ALTER TABLE services DROP COLUMN IF EXISTS end_time CASCADE;
ALTER TABLE services DROP COLUMN IF EXISTS service_type CASCADE;

-- STEP 2: Add columns with correct types
-- =====================================================
ALTER TABLE services
ADD COLUMN start_time TIME NOT NULL DEFAULT '09:00:00',
ADD COLUMN end_time TIME NOT NULL DEFAULT '10:30:00',
ADD COLUMN service_type VARCHAR(50) NOT NULL DEFAULT 'service';

-- Note: We'll calculate duration in the app instead of using a computed column
-- This avoids type casting issues

-- STEP 3: CREATE MASTER SERVICE TIMES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS service_time_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: We're not adding a foreign key constraint because we don't know
-- the exact name of your organization table. The app will handle this relationship.

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_time_templates_org
ON service_time_templates(organization_id);

-- STEP 4: ADD OVERLAP PREVENTION
-- =====================================================
CREATE OR REPLACE FUNCTION check_service_time_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip check if start_time or end_time is null
  IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check for overlapping services on the same date
  IF EXISTS (
    SELECT 1 FROM services
    WHERE organization_id = NEW.organization_id
      AND date = NEW.date
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
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

-- Create trigger
DROP TRIGGER IF EXISTS prevent_service_overlap ON services;
CREATE TRIGGER prevent_service_overlap
  BEFORE INSERT OR UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION check_service_time_overlap();

-- STEP 5: HELPER FUNCTION FOR SERVICES WITH BREAKS
-- =====================================================
CREATE OR REPLACE FUNCTION get_services_with_breaks(
  p_organization_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  date DATE,
  start_time TIME,
  end_time TIME,
  service_type TEXT,
  duration_minutes INTEGER,
  break_before_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH services_ordered AS (
    SELECT
      s.id,
      s.name,
      s.date,
      s.start_time,
      s.end_time,
      s.service_type,
      LAG(s.end_time) OVER (ORDER BY s.start_time) AS prev_end_time
    FROM services s
    WHERE s.organization_id = p_organization_id
      AND s.date = p_date
      AND s.start_time IS NOT NULL
      AND s.end_time IS NOT NULL
    ORDER BY s.start_time
  )
  SELECT
    so.id,
    so.name,
    so.date,
    so.start_time,
    so.end_time,
    so.service_type,
    -- Calculate duration in minutes
    (EXTRACT(HOUR FROM so.end_time)::INTEGER * 60 + EXTRACT(MINUTE FROM so.end_time)::INTEGER) -
    (EXTRACT(HOUR FROM so.start_time)::INTEGER * 60 + EXTRACT(MINUTE FROM so.start_time)::INTEGER) AS duration_minutes,
    -- Calculate break time before this service
    CASE
      WHEN so.prev_end_time IS NOT NULL THEN
        (EXTRACT(HOUR FROM so.start_time)::INTEGER * 60 + EXTRACT(MINUTE FROM so.start_time)::INTEGER) -
        (EXTRACT(HOUR FROM so.prev_end_time)::INTEGER * 60 + EXTRACT(MINUTE FROM so.prev_end_time)::INTEGER)
      ELSE NULL
    END AS break_before_minutes
  FROM services_ordered so;
END;
$$ LANGUAGE plpgsql;

-- STEP 6: ROW LEVEL SECURITY FOR TEMPLATES
-- =====================================================
ALTER TABLE service_time_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their org's service time templates" ON service_time_templates;
DROP POLICY IF EXISTS "Admins can create service time templates" ON service_time_templates;
DROP POLICY IF EXISTS "Admins can update service time templates" ON service_time_templates;
DROP POLICY IF EXISTS "Admins can delete service time templates" ON service_time_templates;

-- Create policies
CREATE POLICY "Users can view their org's service time templates"
  ON service_time_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create service time templates"
  ON service_time_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update service time templates"
  ON service_time_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete service time templates"
  ON service_time_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run these queries to verify everything worked:

-- 1. Check columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'services'
  AND column_name IN ('start_time', 'end_time', 'service_type')
ORDER BY column_name;

-- 2. Check service_time_templates table
SELECT COUNT(*) as template_count FROM service_time_templates;

-- 3. Test function (replace with your org_id)
-- SELECT * FROM get_services_with_breaks('YOUR_ORG_ID_HERE', CURRENT_DATE);

-- =====================================================
-- SAMPLE DATA (OPTIONAL)
-- =====================================================
-- Uncomment and replace YOUR_ORG_ID to add sample service time templates:

/*
INSERT INTO service_time_templates (organization_id, name, start_time, end_time, is_default)
VALUES
  ('YOUR_ORG_ID', 'Morning Service', '09:00:00', '10:30:00', true),
  ('YOUR_ORG_ID', 'Contemporary Service', '11:30:00', '13:00:00', false),
  ('YOUR_ORG_ID', 'Evening Service', '18:00:00', '19:30:00', false);
*/

-- =====================================================
-- SUCCESS!
-- Your database is now ready for multiple services per day
-- =====================================================
