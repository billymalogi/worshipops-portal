# Service Times & Multiple Services Implementation Guide

## 🎉 What's Been Implemented

### 1. **Persistent Calendar Sidebar** ✅
- Calendar now lives on the right side of ALL views (Dashboard, Team, Lighting, Schedule Table)
- Always visible and accessible
- Shows dots on days with scheduled services
- Click any date to create a new service
- Shows "Today's Services" section at the top

### 2. **Multiple Services Per Day** ✅
- Create unlimited services on the same day
- Each service has its own start and end time
- Automatic overlap detection prevents scheduling conflicts
- Services are sorted by time in the calendar and lists

### 3. **Service Time Management** ✅
- **Start Time** - When the service begins
- **End Time** - When the service ends
- **Duration** - Automatically calculated
- **Service Type** - Regular service, break, etc.

### 4. **Master Service Times (Templates)** ✅
- Admins can create church-wide default service times
- Examples: "9am Traditional", "11:30am Contemporary", "6pm Evening"
- When creating a service, choose from templates or create custom time
- Templates include name, start time, end time, and default flag

### 5. **Overlap Prevention** ✅
- Database trigger prevents overlapping services on the same day
- UI validation shows which service you're conflicting with
- Clear error messages guide users to fix conflicts

## 📋 Setup Instructions

### Step 1: Run Database Migration

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `SUPABASE_MIGRATION.sql`
4. Run the migration
5. Verify success with the verification queries at the bottom of the file

This migration adds:
- `start_time` and `end_time` columns to `services` table
- `service_type` column (service, break, etc.)
- `duration_minutes` computed column
- `service_time_templates` table for master times
- Overlap prevention trigger
- Helper function for getting services with breaks

### Step 2: Create Master Service Times (Optional)

As an admin, you can create default service times:

```sql
-- Example: Add your church's typical service times
INSERT INTO service_time_templates (organization_id, name, start_time, end_time, is_default)
VALUES
  ('YOUR_ORG_ID_HERE', 'Morning Service', '09:00:00', '10:30:00', true),
  ('YOUR_ORG_ID_HERE', 'Contemporary Service', '11:30:00', '13:00:00', false),
  ('YOUR_ORG_ID_HERE', 'Evening Service', '18:00:00', '19:30:00', false);
```

Replace `YOUR_ORG_ID_HERE` with your actual organization ID (check the debug bar at the top of the dashboard).

### Step 3: Test the Features

1. **Create a Service**:
   - Click any date on the calendar
   - Choose from your master service times OR create custom time
   - Enter service name
   - Click "Create Service"

2. **Create Multiple Services Same Day**:
   - Click a date that already has a service
   - See existing services listed
   - Choose a different time slot
   - If times overlap, you'll get a warning

3. **View Services**:
   - Calendar shows dots on days with services
   - "Today's Services" appears in calendar sidebar
   - Main area shows all services sorted by time

## 🔧 Files Modified/Created

### New Files:
- `SUPABASE_MIGRATION.sql` - Database schema updates
- `src/components/PersistentCalendar.jsx` - Right sidebar calendar
- `src/components/ServiceTimeModal.jsx` - Service creation with time management
- `IMPLEMENTATION_GUIDE.md` - This file

### Modified Files:
- `src/Dashboard.jsx` - Added persistent calendar layout, removed old calendar from folders sidebar

## 🚀 Still To Implement

### Break Time Detection (Automatic)
Currently planned features:
- Automatically detect gaps between services
- Show break duration (e.g., "1 hour break before next service")
- Optional: Create "Coffee/Break" service types for these gaps

### Countdown Timers
Currently planned features:
- Dashboard shows countdown to next service
- Volunteer view shows time until their service
- Visual timer during break periods

### UI Enhancements
- Admin panel to manage master service times
- Bulk service creation (create recurring services)
- Drag-and-drop to reschedule services
- Better mobile responsive design

## 📊 Database Schema Reference

### `services` Table (Updated)
```
- id (uuid)
- name (text)
- date (date)
- start_time (time) ← NEW
- end_time (time) ← NEW
- service_type (varchar) ← NEW
- duration_minutes (integer, computed) ← NEW
- organization_id (uuid)
- folder_id (uuid)
- items (jsonb)
- created_at (timestamptz)
```

### `service_time_templates` Table (New)
```
- id (uuid)
- organization_id (uuid)
- name (varchar) - e.g., "Morning Service"
- start_time (time)
- end_time (time)
- is_default (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

## 🎨 User Experience Flow

### Creating a Service (New Experience):

**Without Templates:**
1. Click calendar date
2. Enter service name
3. Set start time and end time
4. See duration calculated automatically
5. See other services scheduled that day
6. Get overlap warning if conflicts exist
7. Create service

**With Templates:**
1. Click calendar date
2. See list of your church's typical service times
3. Click a template (e.g., "9am Traditional")
4. Name and times auto-fill
5. Optionally adjust or click "Use Custom Time"
6. Create service

### Viewing Services:
- Calendar shows visual indicators (dots) for days with services
- Today's services appear in sidebar
- Main area shows all services with time badges
- Click service to edit/view details

## 🐛 Troubleshooting

### Issue: "Service time overlaps" error when no overlap exists
**Fix**: Check that all existing services have `start_time` and `end_time` values. The migration sets defaults, but manually created services before the migration might be null.

```sql
-- Update any services missing times
UPDATE services
SET start_time = '09:00:00', end_time = '10:30:00'
WHERE start_time IS NULL OR end_time IS NULL;
```

### Issue: Can't create service templates
**Fix**: Verify RLS policies are in place and you're logged in as an admin.

```sql
-- Check your role
SELECT role FROM organization_members
WHERE user_id = auth.uid();
```

### Issue: Calendar not showing services
**Fix**: Verify services have proper `date` format (YYYY-MM-DD) and are associated with your organization.

## 💡 Pro Tips

1. **Set a Default Template**: Mark one service time as default - it will be highlighted when creating services
2. **Consistent Naming**: Use consistent names for similar services (e.g., "Sunday 9am", "Sunday 11:30am")
3. **Buffer Time**: Leave 15-30 minutes between services for transition
4. **Break Services**: You can create a service type of "break" for coffee time between services

## 📞 Need Help?

If something isn't working:
1. Check the browser console for errors (F12)
2. Verify the database migration ran successfully
3. Check that your organization_id is correct
4. Ensure you're logged in as an admin for template features

---

**Version**: 1.0
**Last Updated**: 2026-02-17
**Author**: Claude Code Assistant
