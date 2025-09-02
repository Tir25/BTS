# 🗄️ Database Backup Strategy for Optimization

## 📅 Backup Timeline
- **Pre-Optimization**: Complete backup before any changes
- **During Optimization**: Incremental backups after each phase
- **Post-Optimization**: Final backup after successful completion

## 🔧 Backup Methods

### Method 1: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `gthwmwfwvhyriygpcdlr`
3. Navigate to **Database** → **Backups**
4. Click **"Create a new backup"**
5. Download the SQL dump file
6. Store securely in: `backups/pre-optimization-$(date +%Y%m%d).sql`

### Method 2: Supabase CLI (Advanced)
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Create backup
supabase db dump --db-url "your-connection-string" -f backup-$(date +%Y%m%d).sql
```

### Method 3: Direct PostgreSQL Dump
```bash
# Using pg_dump (if you have direct access)
pg_dump -h db.gthwmwfwvhyriygpcdlr.supabase.co \
         -U postgres \
         -d postgres \
         -f backup-$(date +%Y%m%d).sql
```

## 📊 What to Backup

### Critical Tables (Must Backup)
- `live_locations` (2,943 rows) - Primary tracking data
- `profiles` (5 rows) - User profiles
- `users` (5 rows) - User accounts
- `buses` (3 rows) - Fleet information
- `routes` (3 rows) - Route definitions
- `drivers` (1 row) - Driver information

### Supporting Tables (Should Backup)
- `unified_profiles` (5 rows)
- `user_profiles` (4 rows)
- `system_constants` (1 row)
- `default_destination` (1 row)

### Unused Tables (Optional Backup)
- `bus_locations_live` (0 rows)
- `bus_location_history` (0 rows)
- `route_stops` (0 rows)
- `bus_stops` (0 rows)
- `driver_bus_assignments` (0 rows)
- `destinations` (0 rows)
- `default_destinations` (0 rows)

## 🗂️ Backup Storage Locations

### Local Storage
```
backups/
├── pre-optimization-20250102.sql
├── phase1-complete-20250103.sql
├── phase2-complete-20250104.sql
├── phase3-complete-20250105.sql
└── post-optimization-20250106.sql
```

### Cloud Storage (Recommended)
- **Google Drive**: Create folder "Database Backups"
- **Dropbox**: Create folder "Supabase Backups"
- **GitHub**: Create private repository "database-backups"

## ✅ Backup Verification

### Verify Backup Integrity
```sql
-- After creating backup, verify these queries work:
SELECT COUNT(*) FROM live_locations;  -- Should return 2,943
SELECT COUNT(*) FROM profiles;        -- Should return 5
SELECT COUNT(*) FROM users;           -- Should return 5
SELECT COUNT(*) FROM buses;           -- Should return 3
SELECT COUNT(*) FROM routes;          -- Should return 3
```

### Test Restore Process
1. Create test database
2. Restore backup to test database
3. Verify all data is present
4. Run basic queries to ensure functionality

## 🚨 Emergency Recovery

### Quick Restore Commands
```bash
# Restore from backup
psql -h db.gthwmwfwvhyriygpcdlr.supabase.co \
     -U postgres \
     -d postgres \
     -f backup-YYYYMMDD.sql

# Or using Supabase CLI
supabase db reset --db-url "your-connection-string"
```

## 📞 Backup Contacts

- **Primary Backup Manager**: [Your Name]
- **Secondary Backup Manager**: [Team Member Name]
- **Emergency Contact**: [Phone Number]
- **Backup Storage Location**: [Local Path + Cloud URLs]

## ⏰ Backup Schedule

- **Pre-Optimization**: Today (Before any changes)
- **Phase 1 Complete**: After table cleanup
- **Phase 2 Complete**: After profile consolidation
- **Phase 3 Complete**: After optimization
- **Post-Optimization**: After successful completion

## 🔐 Security Notes

- Store backup files securely
- Use encrypted storage for sensitive data
- Limit access to backup files
- Test restore process regularly
- Document all backup procedures
