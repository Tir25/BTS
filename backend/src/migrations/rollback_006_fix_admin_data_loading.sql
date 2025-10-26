-- Rollback script for 006_fix_admin_data_loading migration
-- This script safely removes the changes made by the migration

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS route_management_view;
DROP VIEW IF EXISTS driver_management_view;
DROP VIEW IF EXISTS bus_management_view;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS live_locations CASCADE;
DROP TABLE IF EXISTS bus_locations CASCADE;
DROP TABLE IF EXISTS buses CASCADE;
DROP TABLE IF EXISTS routes CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop the trigger function if no other tables use it
-- (Check if any other tables use this function before dropping)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
