import pool, { initializeDatabaseConnection, checkDatabaseHealth } from '../config/database';

// Database schema initialization with enhanced error handling
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database schema...');
    
    // First, ensure database connection is established
    await initializeDatabaseConnection();
    
    // Enable PostGIS extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS extension enabled');

    // Create users table (linked to Supabase Auth)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'driver', 'admin')),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Users table created');

    // Create routes table with PostGIS geometry (must be created before buses table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        stops GEOMETRY(LINESTRING, 4326) NOT NULL,
        distance_km DECIMAL(10,2) NOT NULL,
        estimated_duration_minutes INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Routes table created');

    // Create buses table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        number_plate VARCHAR(20) UNIQUE NOT NULL,
        capacity INTEGER NOT NULL,
        model VARCHAR(100),
        year INTEGER,
        assigned_driver_id UUID REFERENCES users(id),
        route_id UUID REFERENCES routes(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Buses table created');
    console.log('✅ Routes table created');

    // Create live_locations table with PostGIS point geometry
    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bus_id UUID REFERENCES buses(id) ON DELETE CASCADE,
        location GEOMETRY(POINT, 4326) NOT NULL,
        speed_kmh DECIMAL(5,2),
        heading_degrees DECIMAL(5,2),
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Live locations table created');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_live_locations_bus_id ON live_locations(bus_id);
      CREATE INDEX IF NOT EXISTS idx_live_locations_recorded_at ON live_locations(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_live_locations_location ON live_locations USING GIST(location);
      CREATE INDEX IF NOT EXISTS idx_routes_stops ON routes USING GIST(stops);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_buses_number_plate ON buses(number_plate);
    `);
    console.log('✅ Database indexes created');

    // Insert sample data for testing
    await insertSampleData();
    
    console.log('🎉 Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Insert sample data for testing
const insertSampleData = async (): Promise<void> => {
  try {
    // Insert sample users
    await pool.query(`
      INSERT INTO users (email, role, first_name, last_name) VALUES
      ('admin@university.edu', 'admin', 'Admin', 'User'),
      ('driver1@university.edu', 'driver', 'John', 'Driver'),
      ('student1@university.edu', 'student', 'Alice', 'Student')
      ON CONFLICT (email) DO NOTHING;
    `);
    console.log('✅ Sample users inserted');

    // Insert sample buses
    await pool.query(`
      INSERT INTO buses (number_plate, capacity, model, year) VALUES
      ('UNI001', 50, 'Mercedes-Benz O500', 2020),
      ('UNI002', 45, 'Volvo B7R', 2019),
      ('UNI003', 55, 'Scania K250', 2021)
      ON CONFLICT (number_plate) DO NOTHING;
    `);
    console.log('✅ Sample buses inserted');

    // Insert sample route
    await pool.query(`
      INSERT INTO routes (name, description, stops, distance_km, estimated_duration_minutes) VALUES
      ('Route 1: Ahmedabad to Gandhinagar', 'Main campus route', 
       ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154)', 4326), 
       25.5, 45)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Sample route inserted');

    // Insert sample live location
    await pool.query(`
      INSERT INTO live_locations (bus_id, location, speed_kmh, heading_degrees) VALUES
      ((SELECT id FROM buses WHERE number_plate = 'UNI001' LIMIT 1),
       ST_GeomFromText('POINT(72.5714 23.0225)', 4326), 35.5, 45.0)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ Sample live location inserted');

  } catch (error) {
    console.error('❌ Sample data insertion failed:', error);
    // Don't throw error for sample data insertion
  }
};

// Enhanced database connection test
export const testDatabaseConnection = async (): Promise<void> => {
  try {
    const health = await checkDatabaseHealth();
    
    if (health.healthy) {
      console.log('✅ Database connection test successful');
      console.log('📅 Current time:', health.details.currentTime);
      console.log('🗺️ PostgreSQL version:', health.details.postgresVersion);
      console.log('📊 Pool status:', {
        total: health.details.poolSize,
        idle: health.details.idleCount,
        waiting: health.details.waitingCount
      });
    } else {
      throw new Error(health.details.error);
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    throw error;
  }
};

// Database health check endpoint
export const getDatabaseHealth = async (): Promise<any> => {
  return await checkDatabaseHealth();
};

