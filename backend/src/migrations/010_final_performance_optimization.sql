-- Final Performance Optimization Migration
-- Ensures all database optimizations are properly applied for Issue #11 fix

-- ===== VERIFY AND CREATE MISSING INDEXES =====

-- Verify spatial indexes for live_locations
CREATE INDEX IF NOT EXISTS idx_live_locations_spatial 
ON live_locations USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_live_locations_bus_time 
ON live_locations(bus_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_locations_recent 
ON live_locations(recorded_at DESC);

-- Verify assignment optimization indexes
CREATE INDEX IF NOT EXISTS idx_buses_route_assignment 
ON buses(route_id, assigned_driver_profile_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_driver_active 
ON user_profiles(id, is_driver, is_active) 
WHERE is_driver = true AND is_active = true;

-- ===== ENSURE MATERIALIZED VIEW EXISTS =====

-- Drop and recreate materialized view to ensure it's up to date
DROP MATERIALIZED VIEW IF EXISTS active_bus_locations CASCADE;

CREATE MATERIALIZED VIEW active_bus_locations AS
SELECT 
  ll.bus_id,
  ll.location,
  ll.speed_kmh,
  ll.heading_degrees,
  ll.recorded_at,
  b.bus_number,
  b.vehicle_no,
  u.full_name as driver_name,
  r.name as route_name,
  r.city as route_city
FROM live_locations ll
JOIN buses b ON ll.bus_id = b.id
LEFT JOIN user_profiles u ON b.assigned_driver_profile_id = u.id
LEFT JOIN routes r ON b.route_id = r.id
WHERE ll.recorded_at >= NOW() - INTERVAL '5 minutes'
AND b.is_active = true
ORDER BY ll.recorded_at DESC;

-- Create indexes on materialized view
CREATE INDEX IF NOT EXISTS idx_active_bus_locations_spatial 
ON active_bus_locations USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_active_bus_locations_time 
ON active_bus_locations(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_active_bus_locations_bus_id 
ON active_bus_locations(bus_id);

-- ===== CREATE OPTIMIZED FUNCTIONS =====

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_active_bus_locations()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_bus_locations;
END;
$$ LANGUAGE plpgsql;

-- Optimized function for driver bus info (replaces N+1 queries)
CREATE OR REPLACE FUNCTION get_driver_bus_info_optimized(driver_id_param UUID)
RETURNS TABLE (
  bus_id UUID,
  bus_number VARCHAR,
  vehicle_no VARCHAR,
  route_id UUID,
  route_name VARCHAR,
  driver_id UUID,
  driver_name VARCHAR,
  route_city VARCHAR,
  bus_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as bus_id,
    b.bus_number,
    b.vehicle_no,
    b.route_id,
    COALESCE(r.name, 'Unknown Route') as route_name,
    b.assigned_driver_profile_id as driver_id,
    COALESCE(u.full_name, 'Unknown Driver') as driver_name,
    r.city as route_city,
    b.bus_image_url
  FROM buses b
  LEFT JOIN routes r ON b.route_id = r.id
  LEFT JOIN user_profiles u ON b.assigned_driver_profile_id = u.id
  WHERE b.assigned_driver_profile_id = driver_id_param
  AND b.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function for viewport-based location queries
CREATE OR REPLACE FUNCTION get_locations_in_viewport_optimized(
  north_lat FLOAT,
  south_lat FLOAT,
  east_lng FLOAT,
  west_lng FLOAT,
  time_window_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  bus_id UUID,
  location GEOMETRY,
  speed_kmh DECIMAL,
  heading_degrees DECIMAL,
  recorded_at TIMESTAMP WITH TIME ZONE,
  bus_number VARCHAR,
  vehicle_no VARCHAR,
  driver_name VARCHAR,
  route_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    abl.bus_id,
    abl.location,
    abl.speed_kmh,
    abl.heading_degrees,
    abl.recorded_at,
    abl.bus_number,
    abl.vehicle_no,
    abl.driver_name,
    abl.route_name
  FROM active_bus_locations abl
  WHERE abl.recorded_at >= NOW() - INTERVAL '1 minute' * time_window_minutes
  AND ST_Intersects(abl.location, ST_MakeEnvelope(west_lng, south_lat, east_lng, north_lat, 4326))
  ORDER BY abl.recorded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ===== CREATE PERFORMANCE MONITORING =====

-- Create performance monitoring view
CREATE OR REPLACE VIEW location_performance_stats AS
SELECT 
  'live_locations' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT bus_id) as unique_buses,
  MAX(recorded_at) as latest_location,
  MIN(recorded_at) as earliest_location,
  AVG(EXTRACT(EPOCH FROM (NOW() - recorded_at))) as avg_age_seconds
FROM live_locations
WHERE recorded_at >= NOW() - INTERVAL '1 hour'
UNION ALL
SELECT 
  'active_bus_locations' as table_name,
  COUNT(*) as total_rows,
  COUNT(DISTINCT bus_id) as unique_buses,
  MAX(recorded_at) as latest_location,
  MIN(recorded_at) as earliest_location,
  AVG(EXTRACT(EPOCH FROM (NOW() - recorded_at))) as avg_age_seconds
FROM active_bus_locations;

-- Create index usage monitoring
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- ===== CREATE AUTOMATIC REFRESH TRIGGER =====

-- Create trigger to automatically refresh materialized view
CREATE OR REPLACE FUNCTION trigger_refresh_active_bus_locations()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh materialized view asynchronously
  PERFORM pg_notify('refresh_active_bus_locations', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on live_locations table
DROP TRIGGER IF EXISTS trigger_refresh_bus_locations ON live_locations;
CREATE TRIGGER trigger_refresh_bus_locations
  AFTER INSERT OR UPDATE OR DELETE ON live_locations
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_refresh_active_bus_locations();

-- ===== GRANT PERMISSIONS =====

GRANT SELECT ON active_bus_locations TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_driver_bus_info_optimized TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_locations_in_viewport_optimized TO PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_active_bus_locations TO PUBLIC;
GRANT SELECT ON location_performance_stats TO PUBLIC;
GRANT SELECT ON index_usage_stats TO PUBLIC;

-- ===== UPDATE STATISTICS =====

-- Update table statistics for better query planning
ANALYZE live_locations;
ANALYZE buses;
ANALYZE routes;
ANALYZE user_profiles;

-- ===== INITIAL REFRESH =====

-- Refresh materialized view initially
REFRESH MATERIALIZED VIEW active_bus_locations;

-- ===== COMMENTS =====

COMMENT ON MATERIALIZED VIEW active_bus_locations IS 'Optimized materialized view for driver bus queries - eliminates N+1 query problem';
COMMENT ON FUNCTION get_driver_bus_info_optimized IS 'Single query replacement for N+1 driver bus info queries';
COMMENT ON FUNCTION get_locations_in_viewport_optimized IS 'Spatial query optimization for map viewport';
COMMENT ON FUNCTION refresh_active_bus_locations IS 'Refresh materialized view for real-time data';
