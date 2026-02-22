-- =====================================================
-- WORSHIP OPS - SERVICE TIMES & MULTIPLE SERVICES
-- Migration for adding time management features
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. ADD TIME FIELDS TO SERVICES TABLE
-- =====================================================
-- Add start_time and end_time columns to services
ALTER TABLE services
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT '10:30:00',
ADD COLUMN IF NOT EXISTS service_type VARCHAR(50) DEFAULT 'service';

-- Add a computed duration field (optional - can be calculated in app)
-- Duration in minutes - convert TIME to minutes and subtract
ALTER TABLE services
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER GENERATED ALWAYS AS (
  (EXTRACT(HOUR FROM end_time) * 60 + EXTRACT(MINUTE FROM end_time))::INTEGER -
  (EXTRACT(HOUR FROM start_time) * 60 + EXTRACT(MINUTE FROM start_time))::INTEGER
) STORED;

-- 2. CREATE MASTER SERVICE TIMES TABLE
-- =====================================================
-- This stores the church's default/master service times
-- Example: 9am Traditional, 11:30am Contemporary, 6pm Evening
CREATE TABLE IF NOT EXISTS service_time_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization_profile(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- e.g., "Morning Service", "Evening Service"
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_default BOOLEAN DEFAULT false, -- One default per organization
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_service_time_templates_org
ON service_time_templates(organization_id);

-- 3. ADD CONSTRAINT TO PREVENT TIME OVERLAPS
-- =====================================================
-- This prevents scheduling overlapping services on the same day
CREATE OR REPLACE FUNCTION check_service_time_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's any overlapping service on the same date
  IF EXISTS (
    SELECT 1 FROM services
    WHERE organization_id = NEW.organization_id
      AND date = NEW.date
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
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

-- 4. UPDATE EXISTING SERVICES (OPTIONAL)
-- =====================================================
-- Set default times for existing services that don't have times yet
UPDATE services
SET
  start_time = '09:00:00',
  end_time = '10:30:00',
  service_type = 'service'
WHERE start_time IS NULL;

-- 5. CREATE HELPER FUNCTION TO GET SERVICES WITH BREAKS
-- =====================================================
-- This function returns services for a day with calculated breaks
CREATE OR REPLACE FUNCTION get_services_with_breaks(
  p_organization_id UUID,
  p_date DATE
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  date DATE,
  start_time TIME,
  end_time TIME,
  service_type VARCHAR,
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
      s.duration_minutes,
      LAG(s.end_time) OVER (ORDER BY s.start_time) AS prev_end_time
    FROM services s
    WHERE s.organization_id = p_organization_id
      AND s.date = p_date
  )
  SELECT
    so.id,
    so.name,
    so.date,
    so.start_time,
    so.end_time,
    so.service_type,
    so.duration_minutes,
    -- Calculate break time by converting times to minutes and subtracting
    CASE
      WHEN so.prev_end_time IS NOT NULL THEN
        (EXTRACT(HOUR FROM so.start_time) * 60 + EXTRACT(MINUTE FROM so.start_time))::INTEGER -
        (EXTRACT(HOUR FROM so.prev_end_time) * 60 + EXTRACT(MINUTE FROM so.prev_end_time))::INTEGER
      ELSE NULL
    END AS break_before_minutes
  FROM services_ordered so
  ORDER BY so.start_time;
END;
$$ LANGUAGE plpgsql;

-- 6. ADD RLS POLICIES FOR NEW TABLE
-- =====================================================
-- Enable Row Level Security
ALTER TABLE service_time_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view templates for their organization
CREATE POLICY "Users can view their org's service time templates"
  ON service_time_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can insert templates
CREATE POLICY "Admins can create service time templates"
  ON service_time_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update templates
CREATE POLICY "Admins can update service time templates"
  ON service_time_templates
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete templates
CREATE POLICY "Admins can delete service time templates"
  ON service_time_templates
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- VERIFICATION QUERIES (Run after migration)
-- =====================================================
-- Check if columns were added
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'services' AND column_name IN ('start_time', 'end_time', 'service_type', 'duration_minutes');

-- Check if table was created
-- SELECT * FROM service_time_templates LIMIT 1;

-- Test the overlap prevention (should fail)
-- INSERT INTO services (name, date, start_time, end_time, organization_id)
-- VALUES ('Test 1', '2026-02-20', '09:00', '10:00', 'YOUR_ORG_ID');
-- INSERT INTO services (name, date, start_time, end_time, organization_id)
-- VALUES ('Test 2', '2026-02-20', '09:30', '10:30', 'YOUR_ORG_ID'); -- Should fail!

-- =====================================================
-- COMPLETED!
-- Your database is now ready for multiple services per day with time management
-- =====================================================
