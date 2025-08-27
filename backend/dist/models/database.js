"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseHealth = exports.testDatabaseConnection = exports.initializeDatabase = void 0;
const database_1 = __importStar(require("../config/database"));
const initializeDatabase = async () => {
    try {
        console.log('🔄 Initializing database schema...');
        await (0, database_1.checkDatabaseHealth)();
        try {
            await database_1.default.query('CREATE EXTENSION IF NOT EXISTS postgis;');
            console.log('✅ PostGIS extension enabled');
        }
        catch (error) {
            console.warn('⚠️ PostGIS extension may already be enabled or not available:', error);
        }
        await database_1.default.query(`
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
        await database_1.default.query(`
      CREATE TABLE IF NOT EXISTS routes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        stops GEOMETRY(LINESTRING, 4326),
        distance_km DECIMAL(10,2) NOT NULL,
        estimated_duration_minutes INTEGER,
        route_map_url TEXT,
        city VARCHAR(100),
        geom GEOMETRY(LINESTRING, 4326) DEFAULT ST_GeomFromText('LINESTRING(72.5714 23.0225, 72.4563 23.5295)', 4326),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Routes table created');
        await database_1.default.query(`
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
        try {
            await database_1.default.query(`
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
            await database_1.default.query(`
        ALTER TABLE routes 
        ADD COLUMN IF NOT EXISTS stops GEOMETRY(LINESTRING, 4326),
        ADD COLUMN IF NOT EXISTS geom GEOMETRY(LINESTRING, 4326),
        ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
        ADD COLUMN IF NOT EXISTS route_map_url TEXT,
        ADD COLUMN IF NOT EXISTS city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      `);
            await database_1.default.query(`
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
        }
        catch (migrationError) {
            console.warn('⚠️ Migration warning:', migrationError);
        }
        await database_1.default.query(`
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
        try {
            await database_1.default.query(`
        CREATE INDEX IF NOT EXISTS idx_live_locations_bus_id ON live_locations(bus_id);
        CREATE INDEX IF NOT EXISTS idx_live_locations_recorded_at ON live_locations(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_live_locations_location ON live_locations USING GIST(location);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_buses_number_plate ON buses(number_plate);
      `);
            try {
                await database_1.default.query(`CREATE INDEX IF NOT EXISTS idx_routes_stops ON routes USING GIST(stops);`);
            }
            catch (indexError) {
                console.warn('⚠️ Could not create routes stops index:', indexError);
            }
            console.log('✅ Database indexes created');
        }
        catch (indexError) {
            console.warn('⚠️ Some indexes could not be created:', indexError);
        }
        try {
            await insertSampleData();
            console.log('✅ Sample data inserted successfully');
        }
        catch (sampleDataError) {
            console.warn('⚠️ Sample data insertion failed:', sampleDataError);
        }
        console.log('🎉 Database initialization completed successfully');
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
const insertSampleData = async () => {
    try {
        console.log('ℹ️ Sample data insertion skipped - Use Supabase Auth for real users');
        console.log('ℹ️ Buses and routes should be created through the admin interface');
        console.log('ℹ️ Live locations are managed by the driver interface');
    }
    catch (error) {
        console.error('❌ Sample data insertion failed:', error);
    }
};
const testDatabaseConnection = async () => {
    try {
        const health = await (0, database_1.checkDatabaseHealth)();
        if (health.healthy) {
            console.log('✅ Database connection test successful');
        }
        else {
            const errorMessage = health.error;
            throw new Error(typeof errorMessage === 'string'
                ? errorMessage
                : 'Database health check failed');
        }
    }
    catch (error) {
        console.error('❌ Database connection test failed:', error);
        throw error;
    }
};
exports.testDatabaseConnection = testDatabaseConnection;
const getDatabaseHealth = async () => {
    return await (0, database_1.checkDatabaseHealth)();
};
exports.getDatabaseHealth = getDatabaseHealth;
//# sourceMappingURL=database.js.map