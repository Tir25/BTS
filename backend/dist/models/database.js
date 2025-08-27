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
exports.getTableColumns = exports.tableExists = exports.getDatabaseHealth = exports.testDatabaseConnection = exports.initializeDatabase = void 0;
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
        try {
            await database_1.default.query(`
        CREATE INDEX IF NOT EXISTS idx_live_locations_bus_id ON live_locations(bus_id);
        CREATE INDEX IF NOT EXISTS idx_live_locations_recorded_at ON live_locations(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_live_locations_location ON live_locations USING GIST(location);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_buses_number_plate ON buses(number_plate);
        CREATE INDEX IF NOT EXISTS idx_buses_code ON buses(code);
        CREATE INDEX IF NOT EXISTS idx_routes_name ON routes(name);
        CREATE INDEX IF NOT EXISTS idx_routes_is_active ON routes(is_active);
        CREATE INDEX IF NOT EXISTS idx_bus_stops_route_id ON bus_stops(route_id);
        CREATE INDEX IF NOT EXISTS idx_bus_stops_location ON bus_stops USING GIST(location);
        CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_driver_id ON driver_bus_assignments(driver_id);
        CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_bus_id ON driver_bus_assignments(bus_id);
        CREATE INDEX IF NOT EXISTS idx_driver_bus_assignments_route_id ON driver_bus_assignments(route_id);
      `);
            try {
                await database_1.default.query(`CREATE INDEX IF NOT EXISTS idx_routes_stops ON routes USING GIST(stops);`);
                await database_1.default.query(`CREATE INDEX IF NOT EXISTS idx_routes_geom ON routes USING GIST(geom);`);
            }
            catch (indexError) {
                console.warn('⚠️ Could not create routes geometry indexes:', indexError);
            }
            console.log('✅ Database indexes created');
        }
        catch (indexError) {
            console.warn('⚠️ Some indexes could not be created:', indexError);
        }
        console.log('🎉 Database initialization completed successfully');
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
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
const tableExists = async (tableName) => {
    try {
        const result = await database_1.default.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
        return result.rows[0].exists;
    }
    catch (error) {
        console.error(`❌ Error checking if table ${tableName} exists:`, error);
        return false;
    }
};
exports.tableExists = tableExists;
const getTableColumns = async (tableName) => {
    try {
        const result = await database_1.default.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1 
      ORDER BY ordinal_position;
    `, [tableName]);
        return result.rows.map(row => row.column_name);
    }
    catch (error) {
        console.error(`❌ Error getting columns for table ${tableName}:`, error);
        return [];
    }
};
exports.getTableColumns = getTableColumns;
//# sourceMappingURL=database.js.map