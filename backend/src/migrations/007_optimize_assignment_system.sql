-- Optimize Assignment System Migration
-- This migration creates a clean, unified assignment system

-- Drop unused assignment tables
DROP TABLE IF EXISTS driver_bus_assignments CASCADE;

-- Create assignment_history table for tracking all assignment changes
CREATE TABLE IF NOT EXISTS assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('assigned', 'unassigned', 'reassigned')),
    assigned_by UUID REFERENCES user_profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add assignment status tracking to buses table
ALTER TABLE buses ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(20) DEFAULT 'unassigned' 
    CHECK (assignment_status IN ('unassigned', 'assigned', 'inactive', 'active'));

-- Add assignment notes to buses table
ALTER TABLE buses ADD COLUMN IF NOT EXISTS assignment_notes TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignment_history_driver_id ON assignment_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_bus_id ON assignment_history(bus_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_route_id ON assignment_history(route_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_action ON assignment_history(action);
CREATE INDEX IF NOT EXISTS idx_assignment_history_assigned_at ON assignment_history(assigned_at);

CREATE INDEX IF NOT EXISTS idx_buses_assignment_status ON buses(assignment_status);

-- Create a comprehensive assignment view
CREATE OR REPLACE VIEW assignment_overview AS
SELECT 
    b.id as bus_id,
    b.bus_number,
    b.vehicle_no,
    b.capacity,
    b.model,
    b.year,
    b.assignment_status,
    b.assignment_notes,
    b.is_active as bus_active,
    b.created_at as bus_created_at,
    b.updated_at as bus_updated_at,
    
    -- Driver information
    up.id as driver_id,
    up.full_name as driver_name,
    up.email as driver_email,
    up.phone as driver_phone,
    up.is_active as driver_active,
    
    -- Route information
    r.id as route_id,
    r.name as route_name,
    r.description as route_description,
    r.distance_km,
    r.estimated_duration_minutes,
    r.city,
    r.is_active as route_active,
    
    -- Assignment history
    ah.assigned_at as last_assigned_at,
    ah.assigned_by as last_assigned_by,
    ah.notes as last_assignment_notes
    
FROM buses b
LEFT JOIN user_profiles up ON b.assigned_driver_profile_id = up.id
LEFT JOIN routes r ON b.route_id = r.id
LEFT JOIN LATERAL (
    SELECT assigned_at, assigned_by, notes
    FROM assignment_history 
    WHERE bus_id = b.id 
    ORDER BY assigned_at DESC 
    LIMIT 1
) ah ON true
WHERE b.is_active = true;

-- Create a driver assignment status view
CREATE OR REPLACE VIEW driver_assignment_status AS
SELECT 
    up.id as driver_id,
    up.full_name as driver_name,
    up.email as driver_email,
    up.phone as driver_phone,
    up.is_active as driver_active,
    up.created_at as driver_created_at,
    
    -- Current assignment
    b.id as assigned_bus_id,
    b.bus_number as assigned_bus_number,
    b.vehicle_no as assigned_vehicle_no,
    b.assignment_status,
    b.assignment_notes,
    
    -- Route information
    r.id as assigned_route_id,
    r.name as assigned_route_name,
    r.distance_km,
    r.estimated_duration_minutes,
    r.city,
    
    -- Assignment history count
    (SELECT COUNT(*) FROM assignment_history WHERE driver_id = up.id) as total_assignments,
    (SELECT MAX(assigned_at) FROM assignment_history WHERE driver_id = up.id) as last_assignment_date
    
FROM user_profiles up
LEFT JOIN buses b ON up.id = b.assigned_driver_profile_id AND b.is_active = true
LEFT JOIN routes r ON b.route_id = r.id
WHERE up.role = 'driver' AND up.is_active = true;

-- Create a route assignment status view
CREATE OR REPLACE VIEW route_assignment_status AS
SELECT 
    r.id as route_id,
    r.name as route_name,
    r.description as route_description,
    r.distance_km,
    r.estimated_duration_minutes,
    r.city,
    r.is_active as route_active,
    r.created_at as route_created_at,
    
    -- Assigned buses count
    COUNT(b.id) as assigned_buses_count,
    COUNT(CASE WHEN b.assignment_status = 'assigned' THEN 1 END) as active_assignments,
    
    -- Driver information for assigned buses
    STRING_AGG(
        CASE 
            WHEN b.assigned_driver_profile_id IS NOT NULL 
            THEN up.full_name 
            ELSE NULL 
        END, 
        ', '
    ) as assigned_drivers,
    
    -- Bus information
    STRING_AGG(
        CASE 
            WHEN b.id IS NOT NULL 
            THEN b.bus_number 
            ELSE NULL 
        END, 
        ', '
    ) as assigned_bus_numbers
    
FROM routes r
LEFT JOIN buses b ON r.id = b.route_id AND b.is_active = true
LEFT JOIN user_profiles up ON b.assigned_driver_profile_id = up.id
WHERE r.is_active = true
GROUP BY r.id, r.name, r.description, r.distance_km, r.estimated_duration_minutes, 
         r.city, r.is_active, r.created_at;

-- Create assignment validation function
CREATE OR REPLACE FUNCTION validate_assignment(
    p_driver_id UUID,
    p_bus_id UUID,
    p_route_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    driver_exists BOOLEAN;
    bus_exists BOOLEAN;
    route_exists BOOLEAN;
    driver_already_assigned BOOLEAN;
    bus_already_assigned BOOLEAN;
BEGIN
    -- Check if driver exists and is active
    SELECT EXISTS(
        SELECT 1 FROM user_profiles 
        WHERE id = p_driver_id 
        AND role = 'driver' 
        AND is_active = true
    ) INTO driver_exists;
    
    -- Check if bus exists and is active
    SELECT EXISTS(
        SELECT 1 FROM buses 
        WHERE id = p_bus_id 
        AND is_active = true
    ) INTO bus_exists;
    
    -- Check if route exists and is active
    SELECT EXISTS(
        SELECT 1 FROM routes 
        WHERE id = p_route_id 
        AND is_active = true
    ) INTO route_exists;
    
    -- Check if driver is already assigned to another bus
    SELECT EXISTS(
        SELECT 1 FROM buses 
        WHERE assigned_driver_profile_id = p_driver_id 
        AND id != p_bus_id
        AND is_active = true
    ) INTO driver_already_assigned;
    
    -- Check if bus is already assigned to another driver
    SELECT EXISTS(
        SELECT 1 FROM buses 
        WHERE id = p_bus_id 
        AND assigned_driver_profile_id IS NOT NULL
        AND assigned_driver_profile_id != p_driver_id
    ) INTO bus_already_assigned;
    
    -- Return validation result
    RETURN driver_exists 
        AND bus_exists 
        AND route_exists 
        AND NOT driver_already_assigned 
        AND NOT bus_already_assigned;
END;
$$ LANGUAGE plpgsql;

-- Create assignment function
CREATE OR REPLACE FUNCTION create_assignment(
    p_driver_id UUID,
    p_bus_id UUID,
    p_route_id UUID,
    p_assigned_by UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    is_valid BOOLEAN;
    old_driver_id UUID;
    old_route_id UUID;
BEGIN
    -- Validate assignment
    SELECT validate_assignment(p_driver_id, p_bus_id, p_route_id) INTO is_valid;
    
    IF NOT is_valid THEN
        RAISE EXCEPTION 'Assignment validation failed';
    END IF;
    
    -- Get current assignment details
    SELECT assigned_driver_profile_id, route_id 
    INTO old_driver_id, old_route_id
    FROM buses 
    WHERE id = p_bus_id;
    
    -- Update bus assignment
    UPDATE buses 
    SET 
        assigned_driver_profile_id = p_driver_id,
        route_id = p_route_id,
        assignment_status = 'assigned',
        assignment_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_bus_id;
    
    -- Record assignment history
    INSERT INTO assignment_history (
        driver_id, 
        bus_id, 
        route_id, 
        action, 
        assigned_by, 
        notes
    ) VALUES (
        p_driver_id, 
        p_bus_id, 
        p_route_id, 
        CASE 
            WHEN old_driver_id IS NULL THEN 'assigned'
            ELSE 'reassigned'
        END,
        p_assigned_by,
        p_notes
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create unassignment function
CREATE OR REPLACE FUNCTION remove_assignment(
    p_bus_id UUID,
    p_assigned_by UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_driver_id UUID;
    current_route_id UUID;
BEGIN
    -- Get current assignment
    SELECT assigned_driver_profile_id, route_id 
    INTO current_driver_id, current_route_id
    FROM buses 
    WHERE id = p_bus_id;
    
    -- Update bus assignment
    UPDATE buses 
    SET 
        assigned_driver_profile_id = NULL,
        route_id = NULL,
        assignment_status = 'unassigned',
        assignment_notes = NULL,
        updated_at = NOW()
    WHERE id = p_bus_id;
    
    -- Record unassignment history
    INSERT INTO assignment_history (
        driver_id, 
        bus_id, 
        route_id, 
        action, 
        assigned_by, 
        notes
    ) VALUES (
        current_driver_id, 
        p_bus_id, 
        current_route_id, 
        'unassigned',
        p_assigned_by,
        p_notes
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for assignment_history
CREATE TRIGGER update_assignment_history_updated_at 
    BEFORE UPDATE ON assignment_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample assignment data for testing
INSERT INTO assignment_history (driver_id, bus_id, route_id, action, assigned_by, notes)
SELECT 
    b.assigned_driver_profile_id,
    b.id,
    b.route_id,
    'assigned',
    (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1),
    'Initial assignment'
FROM buses b
WHERE b.assigned_driver_profile_id IS NOT NULL
ON CONFLICT DO NOTHING;
