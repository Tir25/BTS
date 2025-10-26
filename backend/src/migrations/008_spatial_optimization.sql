-- Spatial Optimization Migration
-- Implements industry-grade spatial indexing and query optimization

-- Create optimized spatial indexes for live_locations table
CREATE INDEX IF NOT EXISTS idx_live_locations_spatial_time 
ON live_locations USING GIST(location, recorded_at);

CREATE INDEX IF NOT EXISTS idx_live_locations_bus_time 
ON live_locations(bus_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_locations_recent 
ON live_locations(recorded_at DESC) 
WHERE recorded_at >= NOW() - INTERVAL '1 hour';

-- Create partial index for active buses only
CREATE INDEX IF NOT EXISTS idx_live_locations_active_buses
ON live_locations(bus_id, recorded_at DESC)
WHERE bus_id IN (
  SELECT id FROM buses WHERE is_active = true
);

-- Create spatial index for routes table
CREATE INDEX IF NOT EXISTS idx_routes_spatial 
ON routes USING GIST(stops);

-- Create index for route assignments
CREATE INDEX IF NOT EXISTS idx_buses_route_assignment 
ON buses(route_id, assigned_driver_profile_id) 
WHERE is_active = true;

-- Create index for user profiles optimization
CREATE INDEX IF NOT EXISTS idx_user_profiles_driver_active 
ON user_profiles(id, is_driver, is_active) 
WHERE is_driver = true AND is_active = true;

-- Create materialized view for frequently accessed bus data
CREATE MATERIALIZED VIEW IF NOT EXISTS active_bus_locations AS
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

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_active_bus_locations_spatial 
ON active_bus_locations USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_active_bus_locations_time 
ON active_bus_locations(recorded_at DESC);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_active_bus_locations()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_bus_locations;
END;
$$ LANGUAGE plpgsql;

-- Create function for viewport-based location queries
CREATE OR REPLACE FUNCTION get_locations_in_viewport(
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

-- Create function for bus proximity queries
CREATE OR REPLACE FUNCTION get_buses_near_point(
  point_lat FLOAT,
  point_lng FLOAT,
  radius_meters INTEGER DEFAULT 1000,
  time_window_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  bus_id UUID,
  distance_meters FLOAT,
  location GEOMETRY,
  speed_kmh DECIMAL,
  recorded_at TIMESTAMP WITH TIME ZONE,
  bus_number VARCHAR,
  driver_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    abl.bus_id,
    ST_Distance(abl.location, ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326)) * 111000 as distance_meters,
    abl.location,
    abl.speed_kmh,
    abl.recorded_at,
    abl.bus_number,
    abl.driver_name
  FROM active_bus_locations abl
  WHERE abl.recorded_at >= NOW() - INTERVAL '1 minute' * time_window_minutes
  AND ST_DWithin(abl.location, ST_SetSRID(ST_MakePoint(point_lng, point_lat), 4326), radius_meters / 111000.0)
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Create function for route-based location queries
CREATE OR REPLACE FUNCTION get_locations_by_route(
  route_id_param UUID,
  time_window_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  bus_id UUID,
  location GEOMETRY,
  speed_kmh DECIMAL,
  recorded_at TIMESTAMP WITH TIME ZONE,
  bus_number VARCHAR,
  driver_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    abl.bus_id,
    abl.location,
    abl.speed_kmh,
    abl.recorded_at,
    abl.bus_number,
    abl.driver_name
  FROM active_bus_locations abl
  JOIN buses b ON abl.bus_id = b.id
  WHERE abl.recorded_at >= NOW() - INTERVAL '1 minute' * time_window_minutes
  AND b.route_id = route_id_param
  AND b.is_active = true
  ORDER BY abl.recorded_at DESC;
END;
$$ LANGUAGE plpgsql;

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

-- Create connection pooling configuration
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Create statistics for query optimization
ANALYZE live_locations;
ANALYZE buses;
ANALYZE routes;
ANALYZE user_profiles;

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
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Grant necessary permissions
GRANT SELECT ON active_bus_locations TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_locations_in_viewport TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_buses_near_point TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_locations_by_route TO PUBLIC;
GRANT SELECT ON location_performance_stats TO PUBLIC;
GRANT SELECT ON index_usage_stats TO PUBLIC;

-- Create cleanup function for old location data
CREATE OR REPLACE FUNCTION cleanup_old_locations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM live_locations 
  WHERE recorded_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Refresh materialized view after cleanup
  REFRESH MATERIALIZED VIEW CONCURRENTLY active_bus_locations;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-locations', '0 2 * * *', 'SELECT cleanup_old_locations();');

COMMENT ON MATERIALIZED VIEW active_bus_locations IS 'Materialized view for frequently accessed bus location data with spatial optimization';
COMMENT ON FUNCTION get_locations_in_viewport IS 'Get bus locations within viewport bounds for map display';
COMMENT ON FUNCTION get_buses_near_point IS 'Find buses within specified radius of a point';
COMMENT ON FUNCTION get_locations_by_route IS 'Get all bus locations for a specific route';
COMMENT ON FUNCTION cleanup_old_locations IS 'Remove location data older than 7 days';
