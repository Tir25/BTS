import pool, { initializeDatabaseConnection, checkDatabaseHealth } from '../config/database';

// Database schema initialization with enhanced error handling
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('🔄 Initializing database schema...');
    
    // First, ensure database connection is established
    await initializeDatabaseConnection();
    
    // Enable PostGIS extension
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS postgis;');
      console.log('✅ PostGIS extension enabled');
    } catch (error) {
      console.warn('⚠️ PostGIS extension may already be enabled or not available:', error);
    }

    // Create users table (linked to Supabase Auth) with profile photo support
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'driver', 'admin')),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        profile_photo_url TEXT,
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
        stops GEOMETRY(LINESTRING, 4326),
        distance_km DECIMAL(10,2) NOT NULL,
        estimated_duration_minutes INTEGER,
        route_map_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Routes table created');

    // Create buses table with image support
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(20) UNIQUE NOT NULL,
        number_plate VARCHAR(20) UNIQUE NOT NULL,
        capacity INTEGER NOT NULL,
        model VARCHAR(100),
        year INTEGER,
        bus_image_url TEXT,
        assigned_driver_id UUID REFERENCES users(id),
        route_id UUID REFERENCES routes(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Buses table created');

    // Add missing columns if they don't exist (migration)
    try {
      // Migrate buses table
      await pool.query(`
        ALTER TABLE buses 
        ADD COLUMN IF NOT EXISTS code VARCHAR(20) UNIQUE,
        ADD COLUMN IF NOT EXISTS number_plate VARCHAR(20) UNIQUE,
        ADD COLUMN IF NOT EXISTS capacity INTEGER,
        ADD COLUMN IF NOT EXISTS model VARCHAR(100),
        ADD COLUMN IF NOT EXISTS year INTEGER,
        ADD COLUMN IF NOT EXISTS assigned_driver_id UUID REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id),
        ADD COLUMN IF NOT EXISTS bus_image_url TEXT,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      
      // Migrate routes table
      await pool.query(`
        ALTER TABLE routes 
        ADD COLUMN IF NOT EXISTS stops GEOMETRY(LINESTRING, 4326),
        ADD COLUMN IF NOT EXISTS geom GEOMETRY(LINESTRING, 4326),
        ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
        ADD COLUMN IF NOT EXISTS route_map_url TEXT,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      
      // Migrate users table
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS role VARCHAR(50) CHECK (role IN ('student', 'driver', 'admin')),
        ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
        ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
      
      console.log('✅ Database migration completed');
    } catch (migrationError) {
      console.warn('⚠️ Migration warning:', migrationError);
    }

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
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_live_locations_bus_id ON live_locations(bus_id);
        CREATE INDEX IF NOT EXISTS idx_live_locations_recorded_at ON live_locations(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_live_locations_location ON live_locations USING GIST(location);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_buses_number_plate ON buses(number_plate);
      `);
      
      // Create routes stops index separately to handle potential issues
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_routes_stops ON routes USING GIST(stops);`);
      } catch (indexError) {
        console.warn('⚠️ Could not create routes stops index:', indexError);
      }
      
      console.log('✅ Database indexes created');
    } catch (indexError) {
      console.warn('⚠️ Some indexes could not be created:', indexError);
    }

    // Insert sample data for testing
    try {
      await insertSampleData();
      console.log('✅ Sample data inserted successfully');
    } catch (sampleDataError) {
      console.warn('⚠️ Sample data insertion failed:', sampleDataError);
    }
    
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

    // Insert sample buses (matching the actual schema)
    await pool.query(`
      INSERT INTO buses (code, number_plate, capacity, model, year, is_active) VALUES
      ('BUS001', 'UNI001', 50, 'Mercedes-Benz O500', 2020, true),
      ('BUS002', 'UNI002', 45, 'Volvo B7R', 2019, true),
      ('BUS003', 'UNI003', 55, 'Scania K250', 2021, true)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('✅ Sample buses inserted');

    // Insert sample route
    await pool.query(`
      INSERT INTO routes (name, description, stops, geom, distance_km, estimated_duration_minutes, is_active) VALUES
      ('Route 1: Ahmedabad to Gandhinagar', 'Main campus route', 
       ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154)', 4326),
       ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.6369 23.2154)', 4326),
       25.5, 45, true)
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
      // Database connection test successful
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

