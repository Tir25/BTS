-- Advanced Database Indexing Optimization
-- Implements comprehensive indexing strategy for optimal query performance

-- ===== CORE TABLE INDEXES =====

-- User profiles optimization
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active 
ON user_profiles(role, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_driver_active_email 
ON user_profiles(email, is_driver, is_active) 
WHERE is_driver = true AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at 
ON user_profiles(created_at DESC);

-- Buses table optimization
CREATE INDEX IF NOT EXISTS idx_buses_active_created 
ON buses(is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_buses_number_active 
ON buses(bus_number, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_buses_vehicle_no_active 
ON buses(vehicle_no, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_buses_capacity_active 
ON buses(capacity, is_active) 
WHERE is_active = true;

-- Routes table optimization
CREATE INDEX IF NOT EXISTS idx_routes_city_active 
ON routes(city, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_routes_name_active 
ON routes(name, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_routes_distance_active 
ON routes(distance_km, is_active) 
WHERE is_active = true;

-- ===== ASSIGNMENT SYSTEM INDEXES =====

-- Enhanced assignment indexes
CREATE INDEX IF NOT EXISTS idx_buses_assignment_composite 
ON buses(assigned_driver_profile_id, route_id, assignment_status, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_buses_unassigned 
ON buses(id, assignment_status) 
WHERE is_active = true AND assignment_status = 'unassigned';

CREATE INDEX IF NOT EXISTS idx_buses_assigned 
ON buses(id, assignment_status, updated_at) 
WHERE is_active = true AND assignment_status = 'assigned';

-- Assignment history optimization
CREATE INDEX IF NOT EXISTS idx_assignment_history_composite 
ON assignment_history(driver_id, bus_id, action, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignment_history_recent 
ON assignment_history(assigned_at DESC) 
WHERE assigned_at >= NOW() - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_assignment_history_by_user 
ON assignment_history(assigned_by, assigned_at DESC);

-- ===== LOCATION SYSTEM INDEXES =====

-- Live locations optimization
CREATE INDEX IF NOT EXISTS idx_live_locations_bus_recent 
ON live_locations(bus_id, recorded_at DESC) 
WHERE recorded_at >= NOW() - INTERVAL '1 hour';

CREATE INDEX IF NOT EXISTS idx_live_locations_time_spatial 
ON live_locations USING GIST(recorded_at, location) 
WHERE recorded_at >= NOW() - INTERVAL '24 hours';

CREATE INDEX IF NOT EXISTS idx_live_locations_speed 
ON live_locations(speed_kmh, recorded_at DESC) 
WHERE recorded_at >= NOW() - INTERVAL '1 hour';

-- ===== PERFORMANCE MONITORING INDEXES =====

-- System performance tracking
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp 
ON performance_metrics(recorded_at DESC) 
WHERE recorded_at >= NOW() - INTERVAL '7 days';

CREATE INDEX IF NOT EXISTS idx_performance_metrics_type 
ON performance_metrics(metric_type, recorded_at DESC);

-- ===== COMPOSITE INDEXES FOR COMPLEX QUERIES =====

-- Bus management view optimization
CREATE INDEX IF NOT EXISTS idx_bus_management_composite 
ON buses(is_active, assigned_driver_profile_id, route_id, updated_at DESC) 
WHERE is_active = true;

-- Driver assignment optimization
CREATE INDEX IF NOT EXISTS idx_driver_assignment_status 
ON user_profiles(id, is_driver, is_active) 
WHERE is_driver = true AND is_active = true;

-- Route assignment optimization
CREATE INDEX IF NOT EXISTS idx_route_assignment_status 
ON routes(id, is_active, created_at DESC) 
WHERE is_active = true;

-- ===== PARTIAL INDEXES FOR SPECIFIC USE CASES =====

-- Active assignments only
CREATE INDEX IF NOT EXISTS idx_active_assignments 
ON buses(assigned_driver_profile_id, route_id, updated_at) 
WHERE is_active = true 
AND assigned_driver_profile_id IS NOT NULL 
AND route_id IS NOT NULL;

-- Recent location updates
CREATE INDEX IF NOT EXISTS idx_recent_locations 
ON live_locations(bus_id, recorded_at DESC) 
WHERE recorded_at >= NOW() - INTERVAL '5 minutes';

-- High-frequency queries
CREATE INDEX IF NOT EXISTS idx_frequent_queries 
ON buses(is_active, assignment_status, updated_at DESC) 
WHERE is_active = true;

-- ===== COVERING INDEXES FOR READ-HEAVY OPERATIONS =====

-- Bus list with driver info (covering index)
CREATE INDEX IF NOT EXISTS idx_bus_driver_covering 
ON buses(id, bus_number, vehicle_no, assigned_driver_profile_id, route_id, is_active) 
WHERE is_active = true;

-- Driver list with assignment info (covering index)
CREATE INDEX IF NOT EXISTS idx_driver_assignment_covering 
ON user_profiles(id, full_name, email, phone, is_driver, is_active) 
WHERE is_driver = true AND is_active = true;

-- ===== SPATIAL INDEXES FOR LOCATION QUERIES =====

-- Enhanced spatial indexing
CREATE INDEX IF NOT EXISTS idx_live_locations_spatial_enhanced 
ON live_locations USING GIST(location) 
WHERE recorded_at >= NOW() - INTERVAL '1 hour';

CREATE INDEX IF NOT EXISTS idx_routes_spatial_enhanced 
ON routes USING GIST(stops) 
WHERE is_active = true;

-- ===== STATISTICS AND MAINTENANCE =====

-- Update table statistics for better query planning
ANALYZE user_profiles;
ANALYZE buses;
ANALYZE routes;
ANALYZE live_locations;
ANALYZE assignment_history;

-- Create function to monitor index usage
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT,
  usage_ratio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    i.indexname::TEXT,
    i.idx_scan,
    i.idx_tup_read,
    i.idx_tup_fetch,
    CASE 
      WHEN i.idx_scan > 0 THEN ROUND((i.idx_tup_fetch::NUMERIC / i.idx_tup_read::NUMERIC) * 100, 2)
      ELSE 0 
    END as usage_ratio
  FROM pg_stat_user_indexes i
  JOIN pg_stat_user_tables t ON i.relid = t.relid
  WHERE i.schemaname = 'public'
  ORDER BY i.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to identify unused indexes
CREATE OR REPLACE FUNCTION get_unused_indexes()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  last_scan TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    i.indexname::TEXT,
    pg_size_pretty(pg_relation_size(i.indexrelid))::TEXT as index_size,
    i.idx_scan::TIMESTAMP as last_scan
  FROM pg_stat_user_indexes i
  JOIN pg_stat_user_tables t ON i.relid = t.relid
  WHERE i.schemaname = 'public'
  AND i.idx_scan = 0
  AND i.indexname NOT LIKE '%_pkey'
  ORDER BY pg_relation_size(i.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to optimize query performance
CREATE OR REPLACE FUNCTION optimize_database_performance()
RETURNS TABLE (
  optimization_type TEXT,
  description TEXT,
  impact_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Index Maintenance'::TEXT,
    'Run REINDEX CONCURRENTLY on frequently used indexes'::TEXT,
    'High'::TEXT
  UNION ALL
  SELECT 
    'Statistics Update'::TEXT,
    'Update table statistics for better query planning'::TEXT,
    'Medium'::TEXT
  UNION ALL
  SELECT 
    'Vacuum Analysis'::TEXT,
    'Analyze tables for optimal storage and performance'::TEXT,
    'Medium'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_unused_indexes() TO PUBLIC;
GRANT EXECUTE ON FUNCTION optimize_database_performance() TO PUBLIC;

-- Create maintenance schedule recommendations
COMMENT ON INDEX idx_user_profiles_role_active IS 'Optimized for role-based queries with active status filtering';
COMMENT ON INDEX idx_buses_assignment_composite IS 'Composite index for assignment queries with multiple conditions';
COMMENT ON INDEX idx_live_locations_bus_recent IS 'Optimized for recent location queries by bus';
COMMENT ON INDEX idx_active_assignments IS 'Partial index for active assignments only';
COMMENT ON INDEX idx_bus_driver_covering IS 'Covering index for bus list queries with driver information';
