-- Initial Database Schema for University Bus Tracking System
-- This migration creates all necessary tables and indexes

-- Enable PostGIS extension for geographic data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'student' CHECK (role IN ('student', 'driver', 'admin', 'faculty')),
    phone VARCHAR(20),
    student_id VARCHAR(50) UNIQUE,
    faculty_id VARCHAR(50) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buses table for bus information
CREATE TABLE IF NOT EXISTS buses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number_plate VARCHAR(20) UNIQUE NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 50,
    model VARCHAR(100),
    year INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Routes table for bus routes
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bus stops table
CREATE TABLE IF NOT EXISTS bus_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location GEOMETRY(POINT, 4326) NOT NULL,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver bus assignments
CREATE TABLE IF NOT EXISTS driver_bus_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unassigned_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Live locations for real-time tracking
CREATE TABLE IF NOT EXISTS live_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326) NOT NULL,
    speed DECIMAL(5,2),
    heading DECIMAL(5,2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Route schedules
CREATE TABLE IF NOT EXISTS route_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
    bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System constants for configuration
CREATE TABLE IF NOT EXISTS system_constants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_faculty_id ON users(faculty_id);

CREATE INDEX IF NOT EXISTS idx_buses_number_plate ON buses(number_plate);
CREATE INDEX IF NOT EXISTS idx_buses_code ON buses(code);
CREATE INDEX IF NOT EXISTS idx_buses_is_active ON buses(is_active);

CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name);
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON routes(is_active);

CREATE INDEX IF NOT EXISTS idx_bus_stops_route_id ON bus_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_bus_stops_location ON bus_stops USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_bus_stops_sequence ON bus_stops(route_id, sequence_order);

CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_driver_id ON driver_bus_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_bus_id ON driver_bus_assignments(bus_id);
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_route_id ON driver_bus_assignments(route_id);
CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_is_active ON driver_bus_assignments(is_active);

CREATE INDEX IF NOT EXISTS idx_live_locations_bus_id ON live_locations(bus_id);
CREATE INDEX IF NOT EXISTS idx_live_locations_recorded_at ON live_locations(recorded_at);
CREATE INDEX IF NOT EXISTS idx_live_locations_location ON live_locations USING GIST(location);

CREATE INDEX IF NOT EXISTS idx_route_schedules_route_id ON route_schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_route_schedules_bus_id ON route_schedules(bus_id);
CREATE INDEX IF NOT EXISTS idx_route_schedules_day_of_week ON route_schedules(day_of_week);

CREATE INDEX IF NOT EXISTS idx_system_constants_key ON system_constants(key);
CREATE INDEX IF NOT EXISTS idx_system_constants_category ON system_constants(category);

-- Insert default system constants
INSERT INTO system_constants (key, value, description, category) VALUES
('tracking_interval', '30', 'Location tracking interval in seconds', 'tracking'),
('max_speed_limit', '80', 'Maximum speed limit in km/h', 'safety'),
('location_accuracy_threshold', '10', 'Location accuracy threshold in meters', 'tracking'),
('emergency_contact', '+91-9876543210', 'Emergency contact number', 'emergency'),
('system_maintenance_mode', 'false', 'System maintenance mode flag', 'system')
ON CONFLICT (key) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_buses_updated_at BEFORE UPDATE ON buses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bus_stops_updated_at BEFORE UPDATE ON bus_stops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_bus_assignments_updated_at BEFORE UPDATE ON driver_bus_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_route_schedules_updated_at BEFORE UPDATE ON route_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_constants_updated_at BEFORE UPDATE ON system_constants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
