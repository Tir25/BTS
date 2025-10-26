-- Optimized Database Functions for Assignment Service
-- Eliminates N+1 queries and improves performance

-- Function to get assignment dashboard data in a single query
CREATE OR REPLACE FUNCTION get_assignment_dashboard_data()
RETURNS TABLE (
  total_assignments BIGINT,
  active_assignments BIGINT,
  unassigned_drivers BIGINT,
  unassigned_buses BIGINT,
  unassigned_routes BIGINT,
  pending_assignments BIGINT,
  driver_utilization NUMERIC,
  bus_utilization NUMERIC,
  route_utilization NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH assignment_stats AS (
    SELECT 
      COUNT(*) as total_assignments,
      COUNT(CASE WHEN assignment_status = 'active' THEN 1 END) as active_assignments,
      COUNT(CASE WHEN assignment_status = 'pending' THEN 1 END) as pending_assignments
    FROM buses 
    WHERE is_active = true 
    AND assigned_driver_profile_id IS NOT NULL 
    AND route_id IS NOT NULL
  ),
  driver_stats AS (
    SELECT 
      COUNT(*) as total_drivers,
      COUNT(CASE WHEN id IN (
        SELECT assigned_driver_profile_id 
        FROM buses 
        WHERE assigned_driver_profile_id IS NOT NULL 
        AND is_active = true
      ) THEN 1 END) as assigned_drivers
    FROM user_profiles 
    WHERE is_driver = true 
    AND is_active = true
  ),
  bus_stats AS (
    SELECT 
      COUNT(*) as total_buses,
      COUNT(CASE WHEN assigned_driver_profile_id IS NOT NULL THEN 1 END) as assigned_buses
    FROM buses 
    WHERE is_active = true
  ),
  route_stats AS (
    SELECT 
      COUNT(*) as total_routes,
      COUNT(CASE WHEN id IN (
        SELECT route_id 
        FROM buses 
        WHERE route_id IS NOT NULL 
        AND is_active = true
      ) THEN 1 END) as assigned_routes
    FROM routes 
    WHERE is_active = true
  )
  SELECT 
    a.total_assignments,
    a.active_assignments,
    (d.total_drivers - d.assigned_drivers) as unassigned_drivers,
    (b.total_buses - b.assigned_buses) as unassigned_buses,
    (r.total_routes - r.assigned_routes) as unassigned_routes,
    a.pending_assignments,
    CASE 
      WHEN d.total_drivers > 0 THEN ROUND((d.assigned_drivers::NUMERIC / d.total_drivers::NUMERIC) * 100, 2)
      ELSE 0 
    END as driver_utilization,
    CASE 
      WHEN b.total_buses > 0 THEN ROUND((b.assigned_buses::NUMERIC / b.total_buses::NUMERIC) * 100, 2)
      ELSE 0 
    END as bus_utilization,
    CASE 
      WHEN r.total_routes > 0 THEN ROUND((r.assigned_routes::NUMERIC / r.total_routes::NUMERIC) * 100, 2)
      ELSE 0 
    END as route_utilization
  FROM assignment_stats a, driver_stats d, bus_stats b, route_stats r;
END;
$$ LANGUAGE plpgsql;

-- Function to get assignment statistics
CREATE OR REPLACE FUNCTION get_assignment_statistics()
RETURNS TABLE (
  total_assignments BIGINT,
  active_assignments BIGINT,
  driver_utilization NUMERIC,
  bus_utilization NUMERIC,
  route_utilization NUMERIC,
  average_assignment_age NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH assignment_stats AS (
    SELECT 
      COUNT(*) as total_assignments,
      COUNT(CASE WHEN assignment_status = 'active' THEN 1 END) as active_assignments,
      AVG(EXTRACT(EPOCH FROM (NOW() - updated_at)) / 86400) as average_age_days
    FROM buses 
    WHERE is_active = true 
    AND assigned_driver_profile_id IS NOT NULL 
    AND route_id IS NOT NULL
  ),
  utilization_stats AS (
    SELECT 
      (SELECT COUNT(*) FROM user_profiles WHERE is_driver = true AND is_active = true) as total_drivers,
      (SELECT COUNT(*) FROM buses WHERE assigned_driver_profile_id IS NOT NULL AND is_active = true) as assigned_drivers,
      (SELECT COUNT(*) FROM buses WHERE is_active = true) as total_buses,
      (SELECT COUNT(*) FROM buses WHERE assigned_driver_profile_id IS NOT NULL AND is_active = true) as assigned_buses,
      (SELECT COUNT(*) FROM routes WHERE is_active = true) as total_routes,
      (SELECT COUNT(DISTINCT route_id) FROM buses WHERE route_id IS NOT NULL AND is_active = true) as assigned_routes
  )
  SELECT 
    a.total_assignments,
    a.active_assignments,
    CASE 
      WHEN u.total_drivers > 0 THEN ROUND((u.assigned_drivers::NUMERIC / u.total_drivers::NUMERIC) * 100, 2)
      ELSE 0 
    END as driver_utilization,
    CASE 
      WHEN u.total_buses > 0 THEN ROUND((u.assigned_buses::NUMERIC / u.total_buses::NUMERIC) * 100, 2)
      ELSE 0 
    END as bus_utilization,
    CASE 
      WHEN u.total_routes > 0 THEN ROUND((u.assigned_routes::NUMERIC / u.total_routes::NUMERIC) * 100, 2)
      ELSE 0 
    END as route_utilization,
    COALESCE(a.average_age_days, 0) as average_assignment_age
  FROM assignment_stats a, utilization_stats u;
END;
$$ LANGUAGE plpgsql;

-- Optimized view for assignment data with all joins
CREATE OR REPLACE VIEW assignment_view AS
SELECT 
  b.id as bus_id,
  b.bus_number,
  b.vehicle_no,
  b.capacity,
  b.model,
  b.year,
  b.assigned_driver_profile_id as driver_id,
  b.route_id,
  b.assignment_status,
  b.assignment_notes,
  b.updated_at as assigned_at,
  -- Driver information
  up.id as driver_profile_id,
  up.full_name as driver_name,
  up.first_name as driver_first_name,
  up.last_name as driver_last_name,
  up.email as driver_email,
  up.phone as driver_phone,
  -- Route information
  r.id as route_profile_id,
  r.name as route_name,
  r.description as route_description,
  r.city as route_city
FROM buses b
LEFT JOIN user_profiles up ON b.assigned_driver_profile_id = up.id
LEFT JOIN routes r ON b.route_id = r.id
WHERE b.is_active = true
AND b.assigned_driver_profile_id IS NOT NULL
AND b.route_id IS NOT NULL;

-- Indexes for optimized queries
CREATE INDEX IF NOT EXISTS idx_buses_assigned_driver_active ON buses(assigned_driver_profile_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_buses_route_active ON buses(route_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_buses_assignment_status ON buses(assignment_status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_driver_active ON user_profiles(id) WHERE is_driver = true AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(id) WHERE is_active = true;

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_buses_driver_route_status ON buses(assigned_driver_profile_id, route_id, assignment_status) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_buses_updated_at ON buses(updated_at) WHERE is_active = true;

-- Function to get assignment history with optimized query
CREATE OR REPLACE FUNCTION get_assignment_history(bus_id_param UUID)
RETURNS TABLE (
  id UUID,
  driver_id UUID,
  bus_id UUID,
  route_id UUID,
  action TEXT,
  assigned_by TEXT,
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ah.id,
    ah.driver_id,
    ah.bus_id,
    ah.route_id,
    ah.action,
    ah.assigned_by,
    ah.notes,
    ah.assigned_at,
    ah.created_at
  FROM assignment_history ah
  WHERE ah.bus_id = bus_id_param
  ORDER BY ah.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function to validate assignment with optimized query
CREATE OR REPLACE FUNCTION validate_assignment(
  driver_id_param UUID,
  bus_id_param UUID,
  route_id_param UUID
)
RETURNS TABLE (
  is_valid BOOLEAN,
  errors TEXT[],
  warnings TEXT[],
  conflicts TEXT[]
) AS $$
DECLARE
  validation_errors TEXT[] := '{}';
  validation_warnings TEXT[] := '{}';
  validation_conflicts TEXT[] := '{}';
  driver_exists BOOLEAN := FALSE;
  bus_exists BOOLEAN := FALSE;
  route_exists BOOLEAN := FALSE;
  driver_active BOOLEAN := FALSE;
  bus_active BOOLEAN := FALSE;
  route_active BOOLEAN := FALSE;
  driver_already_assigned BOOLEAN := FALSE;
  route_already_assigned BOOLEAN := FALSE;
  existing_driver_bus TEXT;
  existing_route_bus TEXT;
BEGIN
  -- Check if driver exists and is active
  SELECT EXISTS(
    SELECT 1 FROM user_profiles 
    WHERE id = driver_id_param 
    AND is_driver = true 
    AND is_active = true
  ) INTO driver_exists, driver_active;
  
  -- Check if bus exists and is active
  SELECT EXISTS(
    SELECT 1 FROM buses 
    WHERE id = bus_id_param 
    AND is_active = true
  ) INTO bus_exists, bus_active;
  
  -- Check if route exists and is active
  SELECT EXISTS(
    SELECT 1 FROM routes 
    WHERE id = route_id_param 
    AND is_active = true
  ) INTO route_exists, route_active;
  
  -- Check for conflicts
  SELECT EXISTS(
    SELECT 1 FROM buses 
    WHERE assigned_driver_profile_id = driver_id_param 
    AND id != bus_id_param 
    AND is_active = true
  ) INTO driver_already_assigned;
  
  SELECT EXISTS(
    SELECT 1 FROM buses 
    WHERE route_id = route_id_param 
    AND id != bus_id_param 
    AND is_active = true
  ) INTO route_already_assigned;
  
  -- Build error messages
  IF NOT driver_exists THEN
    validation_errors := validation_errors || 'Driver not found';
  ELSIF NOT driver_active THEN
    validation_errors := validation_errors || 'Driver is not active';
  END IF;
  
  IF NOT bus_exists THEN
    validation_errors := validation_errors || 'Bus not found';
  ELSIF NOT bus_active THEN
    validation_errors := validation_errors || 'Bus is not active';
  END IF;
  
  IF NOT route_exists THEN
    validation_errors := validation_errors || 'Route not found';
  ELSIF NOT route_active THEN
    validation_errors := validation_errors || 'Route is not active';
  END IF;
  
  -- Build conflict messages
  IF driver_already_assigned THEN
    validation_conflicts := validation_conflicts || 'Driver is already assigned to another bus';
  END IF;
  
  IF route_already_assigned THEN
    validation_conflicts := validation_conflicts || 'Route is already assigned to another bus';
  END IF;
  
  RETURN QUERY
  SELECT 
    array_length(validation_errors, 1) IS NULL OR array_length(validation_errors, 1) = 0 as is_valid,
    validation_errors,
    validation_warnings,
    validation_conflicts;
END;
$$ LANGUAGE plpgsql;
