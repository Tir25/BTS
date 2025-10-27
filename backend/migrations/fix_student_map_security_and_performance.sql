-- ============================================================================
-- Student Map Comprehensive Security and Performance Fixes
-- Migration: fix_student_map_security_and_performance
-- Date: 2024
-- Description: Fixes RLS issues, removes unused/duplicate indexes, optimizes RLS policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: SECURITY FIXES - Enable RLS on Public Tables
-- ============================================================================

-- Enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.role ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tables that should have RLS but don't
ALTER TABLE public.dev_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_route_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_bus_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_constants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_save_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: PERFORMANCE FIXES - Remove Unused Indexes
-- ============================================================================

-- Remove unused indexes on live_locations
DROP INDEX IF EXISTS public.idx_live_locations_location;
DROP INDEX IF EXISTS public.idx_live_locations_bus_driver_time;
DROP INDEX IF EXISTS public.idx_live_locations_location_gist;
DROP INDEX IF EXISTS public.idx_live_locations_spatial;
DROP INDEX IF EXISTS public.idx_live_locations_bus_time;

-- Remove unused indexes on buses
DROP INDEX IF EXISTS public.idx_buses_code;
DROP INDEX IF EXISTS public.idx_buses_number_plate;
DROP INDEX IF EXISTS public.idx_buses_vehicle;
DROP INDEX IF EXISTS public.idx_buses_is_active;
DROP INDEX IF EXISTS public.idx_buses_number;
DROP INDEX IF EXISTS public.idx_buses_vehicle_no;
DROP INDEX IF EXISTS public.idx_buses_driver_id;
DROP INDEX IF EXISTS public.idx_buses_route_assignment;

-- Remove unused indexes on routes
DROP INDEX IF EXISTS public.idx_routes_origin;
DROP INDEX IF EXISTS public.idx_routes_destination;
DROP INDEX IF EXISTS public.idx_routes_active;
DROP INDEX IF EXISTS public.idx_routes_is_active;

-- Remove unused indexes on user_profiles
DROP INDEX IF EXISTS public.idx_user_profiles_is_driver;
DROP INDEX IF EXISTS public.idx_user_profiles_is_active;
DROP INDEX IF EXISTS public.idx_user_profiles_driver_active;
DROP INDEX IF EXISTS public.idx_user_profiles_last_login;

-- Remove unused indexes on bus_stops
DROP INDEX IF EXISTS public.idx_bus_stops_name;
DROP INDEX IF EXISTS public.idx_bus_stops_type_active;
DROP INDEX IF EXISTS public.idx_bus_stops_created_by;
DROP INDEX IF EXISTS public.idx_bus_stops_location;
DROP INDEX IF EXISTS public.idx_bus_stops_type;
DROP INDEX IF EXISTS public.idx_bus_stops_active;
DROP INDEX IF EXISTS public.idx_bus_stops_coordinates;

-- Remove unused indexes on other tables
DROP INDEX IF EXISTS public.idx_destinations_is_default_active;
DROP INDEX IF EXISTS public.idx_destinations_location;
DROP INDEX IF EXISTS public.idx_destinations_coordinates;
DROP INDEX IF EXISTS public.idx_destinations_created_by;
DROP INDEX IF EXISTS public.idx_route_stops_active;
DROP INDEX IF EXISTS public.idx_shifts_name;
DROP INDEX IF EXISTS public.idx_dev_config_key;
DROP INDEX IF EXISTS public.idx_dev_metadata_table;
DROP INDEX IF EXISTS public.idx_dev_log_action;
DROP INDEX IF EXISTS public.idx_dev_log_table;
DROP INDEX IF EXISTS public.idx_dev_log_performed_at;
DROP INDEX IF EXISTS public.idx_bus_route_shifts_bus_id;
DROP INDEX IF EXISTS public.idx_bus_route_shifts_service_date;
DROP INDEX IF EXISTS public.idx_bus_route_shifts_combined;
DROP INDEX IF EXISTS public.idx_system_settings_key;
DROP INDEX IF EXISTS public.idx_system_settings_type;
DROP INDEX IF EXISTS public.idx_system_settings_active;
DROP INDEX IF EXISTS public.idx_route_details_destination_id;
DROP INDEX IF EXISTS public.idx_assignment_history_assigned_at;
DROP INDEX IF EXISTS public.idx_assignment_rules_rule_type;
DROP INDEX IF EXISTS public.idx_assignment_rules_is_active;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;
DROP INDEX IF EXISTS public.idx_audit_logs_action;
DROP INDEX IF EXISTS public.idx_audit_logs_success;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_action_created_at;
DROP INDEX IF EXISTS public.idx_location_save_audit_timestamp;
DROP INDEX IF EXISTS public.idx_location_save_audit_bus_driver;
DROP INDEX IF EXISTS public.idx_location_save_audit_success;
DROP INDEX IF EXISTS public.idx_active_bus_locations_spatial;
DROP INDEX IF EXISTS public.idx_active_bus_locations_time;
DROP INDEX IF EXISTS public.idx_system_constants_constant_key;
DROP INDEX IF EXISTS public.idx_system_constants_is_active;
DROP INDEX IF EXISTS public.idx_locations_location;
DROP INDEX IF EXISTS public.idx_locations_bus_id;
DROP INDEX IF EXISTS public.idx_locations_driver_id;
DROP INDEX IF EXISTS public.idx_locations_bus_recorded;

-- ============================================================================
-- PART 3: PERFORMANCE FIXES - Remove Duplicate Indexes
-- ============================================================================

-- Remove duplicate indexes on buses (keep idx_buses_assigned_driver_profile_id, drop idx_buses_driver)
DROP INDEX IF EXISTS public.idx_buses_driver;

-- Remove duplicate indexes on buses for bus_number (keep idx_buses_bus_number, drop others)
DROP INDEX IF EXISTS public.idx_buses_code;

-- Remove duplicate indexes on buses for route (keep idx_buses_route_id, drop idx_buses_route)
DROP INDEX IF EXISTS public.idx_buses_route;

-- Remove duplicate indexes on buses for vehicle (keep idx_buses_vehicle_no, drop others)
DROP INDEX IF EXISTS public.idx_buses_number_plate;
DROP INDEX IF EXISTS public.idx_buses_vehicle;

-- Remove duplicate indexes on live_locations for time (keep idx_live_locations_recorded_at, drop others)
DROP INDEX IF EXISTS public.idx_live_locations_recent;

-- Remove duplicate indexes on live_locations for bus/time (keep idx_live_locations_bus_id_recorded_at, drop idx_live_locations_bus_time)
DROP INDEX IF EXISTS public.idx_live_locations_bus_time;

-- Remove duplicate indexes on live_locations for spatial (keep idx_live_locations_location_gist, drop others)
DROP INDEX IF EXISTS public.idx_live_locations_location;

-- Remove duplicate indexes on user_profiles (keep idx_user_profiles_is_active, drop idx_user_profiles_active)
DROP INDEX IF EXISTS public.idx_user_profiles_active;

-- ============================================================================
-- PART 4: PERFORMANCE FIXES - Add Missing Foreign Key Indexes
-- ============================================================================

-- Add index on assignment_history.assigned_by
CREATE INDEX IF NOT EXISTS idx_assignment_history_assigned_by 
ON public.assignment_history(assigned_by);

-- Add index on bus_route_assignments.assigned_driver_profile_id
CREATE INDEX IF NOT EXISTS idx_bus_route_assignments_driver_profile 
ON public.bus_route_assignments(assigned_driver_profile_id);

-- Add index on location_save_audit.driver_id
CREATE INDEX IF NOT EXISTS idx_location_save_audit_driver_id 
ON public.location_save_audit(driver_id);

-- ============================================================================
-- PART 5: PERFORMANCE FIXES - Optimize RLS Policies
-- ============================================================================

-- Drop existing inefficient policies and recreate with optimized pattern
-- This prevents auth.uid() from being re-evaluated for each row

-- Fix live_locations policy for drivers
DROP POLICY IF EXISTS "Allow drivers to insert their bus location" ON public.live_locations;
CREATE POLICY "Allow drivers to insert their bus location" ON public.live_locations
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = driver_id
);

-- Fix buses policy for drivers
DROP POLICY IF EXISTS "Allow drivers to read their assigned bus" ON public.buses;
CREATE POLICY "Allow drivers to read their assigned bus" ON public.buses
FOR SELECT
TO authenticated
USING (
  assigned_driver_profile_id = (SELECT auth.uid())
);

-- Fix locations policies
DROP POLICY IF EXISTS "Allow authenticated users to read locations" ON public.locations;
CREATE POLICY "Allow authenticated users to read locations" ON public.locations
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow service role to insert locations" ON public.locations;
CREATE POLICY "Allow service role to insert locations" ON public.locations
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role to update locations" ON public.locations;
CREATE POLICY "Allow service role to update locations" ON public.locations
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role to delete locations" ON public.locations;
CREATE POLICY "Allow service role to delete locations" ON public.locations
FOR DELETE
TO service_role
USING (true);

-- ============================================================================
-- PART 6: SECURITY FIXES - Add RLS Policies for Newly Protected Tables
-- ============================================================================

-- Add basic policies for tables that now have RLS enabled
-- Note: These are minimal policies - adjust based on your requirements

-- Policy for dev_config (development only - restrict access)
CREATE POLICY "Service role only for dev_config" ON public.dev_config
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for dev_metadata (development only)
CREATE POLICY "Service role only for dev_metadata" ON public.dev_metadata
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for shifts (allow read for authenticated, write for service role)
CREATE POLICY "Authenticated can read shifts" ON public.shifts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manages shifts" ON public.shifts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for bus_route_assignments (public read, service role write)
CREATE POLICY "Public can read bus route assignments" ON public.bus_route_assignments
FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role manages assignments" ON public.bus_route_assignments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for assignment_history (authenticated read, service role write)
CREATE POLICY "Authenticated can read assignment history" ON public.assignment_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manages assignment history" ON public.assignment_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for driver_bus_assignments (public read, service role write)
CREATE POLICY "Public can read driver bus assignments" ON public.driver_bus_assignments
FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role manages driver assignments" ON public.driver_bus_assignments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for system_settings (authenticated read, service role write)
CREATE POLICY "Authenticated can read system settings" ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manages system settings" ON public.system_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for system_constants (public read, service role write)
CREATE POLICY "Public can read system constants" ON public.system_constants
FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role manages system constants" ON public.system_constants
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for assignment_rules (authenticated read, service role write)
CREATE POLICY "Authenticated can read assignment rules" ON public.assignment_rules
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manages assignment rules" ON public.assignment_rules
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for route_details (public read, service role write)
CREATE POLICY "Public can read route details" ON public.route_details
FOR SELECT
TO public
USING (true);

CREATE POLICY "Service role manages route details" ON public.route_details
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for location_save_audit (authenticated read, service role write)
CREATE POLICY "Authenticated can read location audit" ON public.location_save_audit
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role manages location audit" ON public.location_save_audit
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for migrations (service role only)
CREATE POLICY "Service role only for migrations" ON public.migrations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================================================

-- Verify RLS is enabled on all tables
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename;

-- Verify indexes were removed
-- SELECT indexname, tablename 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- Verify policies are optimized
-- SELECT schemaname, tablename, policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;

