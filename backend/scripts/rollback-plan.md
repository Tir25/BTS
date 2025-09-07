# 🚨 Rollback Plan for Database Optimization

## 🎯 Purpose
Comprehensive rollback procedures to restore the database to its previous state if any issues occur during optimization.

## 📊 Current Database State (Pre-Optimization)

### Active Tables with Data
- `live_locations`: 2,943 rows (Primary tracking data)
- `profiles`: 5 rows (User profiles)
- `users`: 5 rows (User accounts)
- `buses`: 3 rows (Fleet information)
- `routes`: 3 rows (Route definitions)
- `drivers`: 1 row (Driver information)
- `unified_profiles`: 5 rows
- `user_profiles`: 4 rows
- `system_constants`: 1 row
- `default_destination`: 1 row

### Empty Tables (Will be dropped)
- `bus_locations_live`: 0 rows
- `bus_location_history`: 0 rows
- `route_stops`: 0 rows
- `bus_stops`: 0 rows
- `driver_bus_assignments`: 0 rows
- `destinations`: 0 rows
- `default_destinations`: 0 rows

## 🚨 Emergency Rollback Triggers

### Immediate Rollback Required If:
- [ ] **Data loss detected** (any table has fewer rows than expected)
- [ ] **Frontend errors** (components not loading or displaying data)
- [ ] **API failures** (endpoints returning errors)
- [ ] **Performance degradation** (queries taking >5x longer)
- [ ] **Foreign key violations** (constraint errors)
- [ ] **Spatial data corruption** (PostGIS errors)

### Warning Signs (Monitor Closely):
- [ ] **Increased error rates** in logs
- [ ] **Slow query performance** (>2x baseline)
- [ ] **Memory usage spikes** in backend
- [ ] **Connection timeouts** to database
- [ ] **WebSocket disconnections** increasing

## 🔄 Rollback Procedures by Phase

### Phase 1: Table Cleanup Rollback
```sql
-- If dropping unused tables causes issues, restore them:

-- Restore bus_locations_live
CREATE TABLE IF NOT EXISTS bus_locations_live (
  bus_id UUID PRIMARY KEY,
  geom GEOMETRY(POINT, 4326),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  speed_kmh NUMERIC,
  heading NUMERIC,
  accuracy_m NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore bus_location_history
CREATE TABLE IF NOT EXISTS bus_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID,
  geom GEOMETRY(POINT, 4326),
  speed_kmh NUMERIC,
  heading NUMERIC,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore route_stops
CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID,
  name TEXT,
  geom GEOMETRY(POINT, 4326),
  seq INTEGER
);

-- Restore bus_stops
CREATE TABLE IF NOT EXISTS bus_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID,
  name TEXT,
  description TEXT,
  location GEOMETRY(POINT, 4326),
  stop_order INTEGER,
  estimated_time_from_start INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore driver_bus_assignments
CREATE TABLE IF NOT EXISTS driver_bus_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID,
  bus_id UUID,
  route_id UUID,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore destinations
CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOMETRY(POINT, 4326),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restore default_destinations
CREATE TABLE IF NOT EXISTS default_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  description TEXT,
  location GEOMETRY(POINT, 4326),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 2: Profile Consolidation Rollback
```sql
-- If profile consolidation fails, restore original tables:

-- Restore original profiles table
DROP TABLE IF EXISTS profiles_consolidated;

-- Restore original profile tables (if they were dropped)
-- This would require restoring from backup
```

### Phase 3: Index Optimization Rollback
```sql
-- If new indexes cause performance issues, drop them:

DROP INDEX IF EXISTS idx_live_locations_bus_id_time;
DROP INDEX IF EXISTS idx_live_locations_location_gist;
DROP INDEX IF EXISTS idx_live_locations_recorded_at_btree;

-- Restore original indexes
CREATE INDEX IF NOT EXISTS idx_live_locations_bus_id ON live_locations(bus_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_recorded_at ON live_locations(recorded_at);
CREATE INDEX IF NOT EXISTS idx_live_locations_location ON live_locations USING GIST(location);
```

## 🚨 Complete Database Restore

### Method 1: Supabase Dashboard Restore
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `gthwmwfwvhyriygpcdlr`
3. Navigate to **Database** → **Backups**
4. Find the pre-optimization backup
5. Click **"Restore"**
6. Confirm the restore operation

### Method 2: SQL Restore from Backup File
```bash
# If you have the SQL backup file
psql -h db.gthwmwfwvhyriygpcdlr.supabase.co \
     -U postgres \
     -d postgres \
     -f backup-pre-optimization-YYYYMMDD.sql
```

### Method 3: Supabase CLI Restore
```bash
# Using Supabase CLI
supabase db reset --db-url "your-connection-string"
```

## 🔍 Rollback Verification

### Data Integrity Check
```sql
-- After rollback, verify these counts match pre-optimization:
SELECT 
  'live_locations' as table_name, COUNT(*) as row_count FROM live_locations
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'buses', COUNT(*) FROM buses
UNION ALL
SELECT 'routes', COUNT(*) FROM routes
UNION ALL
SELECT 'drivers', COUNT(*) FROM drivers
UNION ALL
SELECT 'unified_profiles', COUNT(*) FROM unified_profiles
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'system_constants', COUNT(*) FROM system_constants
UNION ALL
SELECT 'default_destination', COUNT(*) FROM default_destination
ORDER BY table_name;
```

### Expected Results After Rollback
- `live_locations`: 2,943 rows
- `profiles`: 5 rows
- `users`: 5 rows
- `buses`: 3 rows
- `routes`: 3 rows
- `drivers`: 1 row
- `unified_profiles`: 5 rows
- `user_profiles`: 4 rows
- `system_constants`: 1 row
- `default_destination`: 1 row

## 📞 Emergency Contacts

### Primary Contacts
- **Database Administrator**: [Your Name]
- **Backend Developer**: [Team Member Name]
- **System Administrator**: [Admin Name]

### Escalation Path
1. **Level 1**: Database Administrator (immediate response)
2. **Level 2**: Backend Developer (within 30 minutes)
3. **Level 3**: System Administrator (within 1 hour)
4. **Level 4**: Project Manager (within 2 hours)

### Communication Channels
- **Emergency**: Phone call
- **Urgent**: Slack/Teams message
- **Normal**: Email notification

## ⏰ Rollback Timeline

### Immediate Response (0-15 minutes)
- [ ] Assess the issue severity
- [ ] Stop any ongoing optimization processes
- [ ] Notify emergency contacts
- [ ] Begin rollback procedures

### Quick Rollback (15-60 minutes)
- [ ] Execute rollback SQL scripts
- [ ] Verify data integrity
- [ ] Test critical functionality
- [ ] Communicate status to team

### Full Restore (1-4 hours)
- [ ] If quick rollback fails, perform full backup restore
- [ ] Verify complete system functionality
- [ ] Document the incident
- [ ] Plan next steps

## 📋 Rollback Checklist

### Before Starting Optimization
- [ ] Complete backup created and verified
- [ ] Rollback procedures tested in test environment
- [ ] Emergency contacts notified
- [ ] Rollback scripts prepared and tested

### During Optimization
- [ ] Monitor system continuously
- [ ] Check data integrity after each phase
- [ ] Test critical functionality after each phase
- [ ] Document any issues immediately

### If Rollback Required
- [ ] Stop optimization process immediately
- [ ] Execute appropriate rollback procedure
- [ ] Verify data integrity
- [ ] Test system functionality
- [ ] Document incident and lessons learned
- [ ] Communicate status to stakeholders

## 🔄 Post-Rollback Actions

### Investigation
- [ ] Analyze what caused the issue
- [ ] Review logs and error messages
- [ ] Identify root cause
- [ ] Document findings

### Recovery Planning
- [ ] Assess if optimization can continue
- [ ] Modify approach if necessary
- [ ] Update rollback procedures
- [ ] Re-test in safe environment

### Communication
- [ ] Update stakeholders on status
- [ ] Provide timeline for next attempt
- [ ] Share lessons learned
- [ ] Update documentation

## 🎯 Success Criteria for Rollback

- [ ] All data restored to pre-optimization state
- [ ] All system functionality working
- [ ] Performance back to baseline
- [ ] No data corruption
- [ ] All users can access system normally
- [ ] Real-time tracking working
- [ ] Admin functions operational
- [ ] Driver functions operational
- [ ] Student map working

## 🚨 Final Notes

- **Never proceed** if rollback verification fails
- **Always test** rollback procedures before optimization
- **Keep backups** accessible during optimization
- **Monitor continuously** during all phases
- **Have multiple rollback options** ready
- **Document everything** for future reference
